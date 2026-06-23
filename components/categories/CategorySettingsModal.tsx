'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Bell, BellOff, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { triggerWidgetSync } from '@/lib/notifications/triggerWidgetSync'
import { CategoryKind, normalizeCategoryName, resolveCategoryName } from '@/lib/categories'
import type { AppLocale } from '@/lib/i18n/getLocale'
import CategoryIcon from '@/components/ui/CategoryIcon'
import IconPicker from '@/components/ui/IconPicker'
import { formatMoney } from '@/lib/money'
import { getCurrencyMeta } from '@/lib/i18n/currencies'
import {
  getUserBillingPeriodKey,
  limitBarColor,
  limitStatus,
  loadSilencedCategoryIds,
  toggleCategoryLimitSilence,
} from '@/lib/categoryLimits'

type Scope = 'categories' | 'savings'

type NodeItem = {
  id: string
  name: string
  name_en?: string | null
  name_es?: string | null
  parent_id: string | null
  is_system: boolean
  icon: string | null
  monthly_limit_cents: number | null
}

interface CategorySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  familyId: string | null
  onChanged?: () => void
  scope?: Scope
  kind?: CategoryKind
  currency?: string
}

type ComposerMode = 'main' | 'child' | null

const buildTree = (items: NodeItem[], locale: AppLocale) => {
  const byName = (a: NodeItem, b: NodeItem) =>
    resolveCategoryName(a, locale).localeCompare(resolveCategoryName(b, locale), locale)

  const main = items
    .filter((item) => !item.parent_id)
    .sort(byName)

  return main.map((item) => ({
    ...item,
    children: items
      .filter((child) => child.parent_id === item.id)
      .sort(byName),
  }))
}

function LimitBar({ pct }: { pct: number }) {
  const status = limitStatus(pct)
  const color = limitBarColor(status)
  return (
    <div className="w-full h-1.5 rounded-full bg-border/50 overflow-hidden mt-1">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
    </div>
  )
}

export default function CategorySettingsModal({
  isOpen,
  onClose,
  familyId,
  onChanged,
  scope = 'categories',
  kind,
  currency = 'BRL',
}: CategorySettingsModalProps) {
  const t = useTranslations()
  const locale = useLocale() as AppLocale
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<NodeItem[]>([])
  const [spentMap, setSpentMap] = useState<Map<string, number>>(new Map())

  const [selectedMainId, setSelectedMainId] = useState<string | null>(null)
  const [expandedMainIds, setExpandedMainIds] = useState<Set<string>>(new Set())

  const [composerMode, setComposerMode] = useState<ComposerMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftParentId, setDraftParentId] = useState<string | null>(null)
  const [draftIcon, setDraftIcon] = useState<string | null>(null)

  const [editingLimitId, setEditingLimitId] = useState<string | null>(null)
  const [draftLimit, setDraftLimit] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)

  const [billingPeriodKey, setBillingPeriodKey] = useState('')
  const [silencedIds, setSilencedIds] = useState<Set<string>>(new Set())
  const [togglingBellId, setTogglingBellId] = useState<string | null>(null)

  async function loadItems() {
    if (!familyId) return
    setLoading(true)

    if (scope === 'savings') {
      const { data } = await supabase
        .from('savings')
        .select('id,name,parent_id,is_system,icon')
        .eq('family_id', familyId)
        .order('name')
      setItems((data || []).map((d) => ({ ...d, monthly_limit_cents: null })) as NodeItem[])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('categories')
      .select('id,name,name_en,name_es,kind,parent_id,is_system,icon,monthly_limit_cents')
      .eq('family_id', familyId)
      .eq('kind', kind!)
      .order('name')

    setItems((data || []) as NodeItem[])

    if (kind === 'expense') {
      const now = new Date()
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
      const { data: expenses } = await supabase
        .from('expenses')
        .select('category_id,amount_cents')
        .eq('family_id', familyId)
        .gte('date', firstDay)
        .lte('date', lastDay)
      const map = new Map<string, number>()
      for (const e of expenses ?? []) {
        if (!e.category_id) continue
        map.set(e.category_id, (map.get(e.category_id) ?? 0) + (e.amount_cents ?? 0))
      }
      // Roll up children's spending into their parent
      for (const item of (data ?? []) as NodeItem[]) {
        if (!item.parent_id) continue
        const childSpent = map.get(item.id) ?? 0
        if (childSpent > 0) {
          map.set(item.parent_id, (map.get(item.parent_id) ?? 0) + childSpent)
        }
      }
      setSpentMap(map)

      // Load silence state for this billing period
      const periodKey = billingPeriodKey || await getUserBillingPeriodKey()
      if (!billingPeriodKey) setBillingPeriodKey(periodKey)
      const silenced = await loadSilencedCategoryIds(familyId, periodKey)
      setSilencedIds(silenced)
    }

    setLoading(false)
  }

  function resetComposer() {
    setComposerMode(null)
    setEditingId(null)
    setDraftName('')
    setDraftParentId(null)
    setDraftIcon(null)
  }

  function cancelEditLimit() {
    setEditingLimitId(null)
    setDraftLimit('')
  }

  async function handleToggleBell(categoryId: string) {
    if (!familyId || !billingPeriodKey) return
    setTogglingBellId(categoryId)
    const nowSilenced = await toggleCategoryLimitSilence(familyId, categoryId, billingPeriodKey)
    setSilencedIds(prev => {
      const next = new Set(prev)
      if (nowSilenced) next.add(categoryId)
      else next.delete(categoryId)
      return next
    })
    setTogglingBellId(null)
  }

  useEffect(() => {
    if (isOpen && familyId) {
      loadItems()
    }
    if (!isOpen) {
      resetComposer()
      cancelEditLimit()
      setSelectedMainId(null)
      setExpandedMainIds(new Set())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, familyId, scope, kind])

  const tree = useMemo(() => buildTree(items, locale), [items, locale])
  const selectedMain = useMemo(
    () => tree.find((main) => main.id === selectedMainId) || null,
    [tree, selectedMainId]
  )
  const isSavingsScope = scope === 'savings'
  const entityLabel = isSavingsScope ? t('categoryModal.entityGoal') : t('categoryModal.entityCategory')
  const mainEntityLabel = isSavingsScope ? t('categoryModal.mainEntityGoal') : t('categoryModal.mainEntityCategory')
  const childEntityLabel = isSavingsScope ? t('categoryModal.childEntityGoal') : t('categoryModal.childEntityCategory')
  const childEntityLabelTitle = isSavingsScope ? t('categoryModal.childEntityGoalTitle') : t('categoryModal.childEntityCategoryTitle')
  const mainEntityPluralTitle = isSavingsScope ? t('categoryModal.mainEntityGoalsPlural') : t('categoryModal.mainEntityCategoriesPlural')
  const childEntityPluralTitle = isSavingsScope ? t('categoryModal.childEntityGoalsPlural') : t('categoryModal.childEntityCategoriesPlural')

  useEffect(() => {
    if (tree.length === 0) {
      setSelectedMainId(null)
      return
    }
    const stillExists = selectedMainId ? tree.some((main) => main.id === selectedMainId) : false
    if (!stillExists) {
      setSelectedMainId(tree[0].id)
    }
  }, [tree, selectedMainId])

  const toggleExpandMain = (id: string) => {
    setExpandedMainIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startCreateMain = () => {
    setComposerMode('main')
    setEditingId(null)
    setDraftParentId(null)
    setDraftName('')
  }

  const startCreateChild = () => {
    if (!selectedMain) {
      alert(t('categoryModal.selectMainFirst', { entity: mainEntityLabel }))
      return
    }
    setComposerMode('child')
    setEditingId(null)
    setDraftParentId(selectedMain.id)
    setDraftName('')
  }

  const startCreateChildFor = (mainId: string) => {
    setSelectedMainId(mainId)
    setComposerMode('child')
    setEditingId(null)
    setDraftParentId(mainId)
    setDraftName('')
    setDraftIcon(null)
  }

  const startEdit = (item: NodeItem) => {
    setComposerMode(item.parent_id ? 'child' : 'main')
    setEditingId(item.id)
    setDraftParentId(item.parent_id)
    setDraftName(item.name)
    setDraftIcon(item.icon)
    cancelEditLimit()
  }

  const startEditLimit = (item: NodeItem) => {
    setEditingLimitId(item.id)
    setDraftLimit(item.monthly_limit_cents ? String(item.monthly_limit_cents / 100) : '')
    resetComposer()
  }

  const saveComposer = async () => {
    if (!familyId) return
    const name = normalizeCategoryName(draftName)
    if (!name) {
      alert(t('categoryModal.enterNameFor', { entity: entityLabel }))
      return
    }
    setSaving(true)
    let errorMessage: string | null = null

    if (scope === 'savings') {
      if (editingId) {
        const { error } = await supabase
          .from('savings')
          .update({ name, icon: draftIcon, parent_id: draftParentId, updated_at: new Date().toISOString() })
          .eq('id', editingId)
          .eq('family_id', familyId)
        errorMessage = error?.message || null
      } else {
        const { error } = await supabase
          .from('savings')
          .insert({ family_id: familyId, name, icon: draftIcon, parent_id: draftParentId, is_system: false })
        errorMessage = error?.message || null
      }
    } else {
      if (editingId) {
        const { error } = await supabase
          .from('categories')
          .update({ name, icon: draftIcon, parent_id: draftParentId })
          .eq('id', editingId)
          .eq('family_id', familyId)
          .eq('kind', kind!)
        errorMessage = error?.message || null
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({ family_id: familyId, kind: kind!, is_system: false, name, icon: draftIcon, parent_id: draftParentId })
        errorMessage = error?.message || null
      }
    }

    setSaving(false)
    if (errorMessage) {
      alert(t('categoryModal.errorSave'))
      return
    }
    resetComposer()
    await loadItems()
    onChanged?.()
    triggerWidgetSync()
  }

  const saveLimit = async (itemId: string) => {
    if (!familyId) return
    setSavingLimit(true)
    const raw = draftLimit.trim().replace(',', '.')
    const cents = raw ? Math.max(0, Math.round(parseFloat(raw) * 100)) : null
    await supabase
      .from('categories')
      .update({ monthly_limit_cents: cents })
      .eq('id', itemId)
      .eq('family_id', familyId)
    setSavingLimit(false)
    cancelEditLimit()
    await loadItems()
    onChanged?.()
    triggerWidgetSync()
  }

  const handleDelete = async (item: NodeItem) => {
    if (!familyId) return
    if (!confirm(t('categoryModal.confirmDelete'))) return

	    if (scope === 'savings') {
	      const childIds: string[] = []
	      for (const it of items) {
	        if (it.parent_id === item.id) {
	          childIds.push(it.id)
	        }
	      }
	      const idsToDelete = [item.id, ...childIds]
      await supabase.from('savings_contributions').delete().eq('family_id', familyId).in('saving_id', idsToDelete)
      const { error } = await supabase.from('savings').delete().eq('family_id', familyId).in('id', idsToDelete)
      if (error) { alert(t('categoryModal.errorDelete')); return }
    } else {
      const { error } = await supabase.from('categories').delete().eq('id', item.id).eq('family_id', familyId).eq('kind', kind!)
      if (error) { alert(t('categoryModal.errorDelete')); return }
    }

    if (editingId === item.id) resetComposer()
    await loadItems()
    onChanged?.()
    triggerWidgetSync()
  }

  const isMainComposer = composerMode === 'main'
  const isChildComposer = composerMode === 'child'
  const mainStackTone = 'border-coffee/35 bg-offWhite'
  const childStackTone = 'border-petrol/30 bg-paper'

  const ComposerForm = ({
    placeholder,
    showIconPicker = false,
    onCancel,
  }: {
    placeholder: string
    showIconPicker?: boolean
    onCancel: () => void
  }) => (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        {showIconPicker && <IconPicker value={draftIcon} onSelect={setDraftIcon} />}
        <input
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          autoFocus
          aria-label={isSavingsScope ? t('categoryModal.nameOfGoalAria') : t('categoryModal.nameOfCategoryAria')}
          className="flex-1 px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-paper-2/50"
          placeholder={placeholder}
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-border text-sm text-ink/70">
          {t('categoryModal.cancelButton')}
        </button>
        <button
          type="button"
          onClick={saveComposer}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg bg-coffee text-paper text-sm disabled:opacity-60"
        >
          {saving ? t('categoryModal.savingButton') : t('categoryModal.saveButton')}
        </button>
      </div>
    </div>
  )

  // ── EXPENSE TABLE LAYOUT ──────────────────────────────────────────────────

  const isExpenseTable = kind === 'expense' && scope === 'categories'

  const ExpenseTableRow = ({ item, depth = 0 }: { item: NodeItem & { children?: NodeItem[] }; depth?: number }) => {
    const isEditing = editingId === item.id
    const isEditingLimit = editingLimitId === item.id
    const spent = spentMap.get(item.id) ?? 0
    const limit = item.monthly_limit_cents
    const pct = limit && limit > 0 ? Math.round((spent / limit) * 100) : 0
    const status = limit ? limitStatus(pct) : 'ok'
    const barColor = limitBarColor(status)
    const isExpanded = expandedMainIds.has(item.id)
    const hasChildren = depth === 0 && (item as NodeItem & { children?: NodeItem[] }).children

    if (isEditing) {
      return (
        <tr className="bg-offWhite">
          <td colSpan={4} className="px-3 py-3">
            <p className="text-xs text-ink/50 mb-2">{t('categoryModal.editingLabel', { name: resolveCategoryName(item, locale) })}</p>
            <ComposerForm
              placeholder={depth === 0 ? t('categoryModal.namePlaceholder') : t('categoryModal.subNamePlaceholder')}
              showIconPicker={depth === 0}
              onCancel={resetComposer}
            />
          </td>
        </tr>
      )
    }

    return (
      <>
        <tr className="border-b border-border/40 hover:bg-bg/30 transition-colors">
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2" style={{ paddingLeft: depth > 0 ? '1.25rem' : 0 }}>
              {hasChildren ? (
                <button type="button" onClick={() => toggleExpandMain(item.id)} className="p-0.5 text-ink/40 hover:text-ink/70">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}
              {item.icon && <CategoryIcon name={item.icon} className="w-4 h-4 shrink-0 text-sidebar/60" />}
              <span className={`text-sm truncate ${depth === 0 ? 'font-semibold text-sidebar' : 'text-ink/80'}`}>{resolveCategoryName(item, locale)}</span>
              {item.is_system && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/20 text-gold shrink-0">{t('categoryModal.systemBadge')}</span>
              )}
            </div>
          </td>
          <td className="px-3 py-2.5 w-44">
            {isEditingLimit ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-ink/50 shrink-0">{getCurrencyMeta(currency)?.symbol ?? currency}</span>
                <input
                  type="number"
                  value={draftLimit}
                  onChange={(e) => setDraftLimit(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveLimit(item.id); if (e.key === 'Escape') cancelEditLimit() }}
                  autoFocus
                  aria-label={t('categoryModal.limitAria')}
                  min="0"
                  step="0.01"
                  className="w-24 px-2 py-1 border border-coffee/50 rounded text-sm bg-paper focus:outline-none focus:ring-1 focus:ring-coffee/40"
                  placeholder="0.00"
                />
                <button type="button" onClick={() => saveLimit(item.id)} disabled={savingLimit} className="text-xs px-2 py-1 rounded bg-coffee text-paper disabled:opacity-60">
                  {t('categoryModal.saveLimitButton')}
                </button>
                <button type="button" onClick={cancelEditLimit} className="text-xs px-1.5 py-1 rounded border border-border text-ink/60">
                  ×
                </button>
              </div>
            ) : limit ? (
              <button
                type="button"
                onClick={() => startEditLimit(item)}
                className="flex items-center gap-1.5 text-sm text-ink/80 hover:text-coffee transition-colors text-left group"
              >
                {formatMoney(limit, currency, locale)}
                <Pencil className="w-3 h-3 opacity-35 group-hover:opacity-70 transition-opacity" />
              </button>
            ) : (() => {
              const childrenWithLimit = hasChildren
                ? (item as NodeItem & { children?: NodeItem[] }).children?.filter(c => c.monthly_limit_cents) ?? []
                : []
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => startEditLimit(item)}
                    className="text-sm text-petrol/80 hover:text-petrol transition-colors"
                  >
                    {t('categoryModal.defineLimitButton')}
                  </button>
                  {childrenWithLimit.length > 0 && !isExpanded && (
                    <button
                      type="button"
                      onClick={() => toggleExpandMain(item.id)}
                      title={childrenWithLimit.length > 1 ? t('categoryModal.subcategoriesHaveLimitMany', { count: childrenWithLimit.length }) : t('categoryModal.subcategoriesHaveLimitOne')}
                      className="flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-gold/15 text-gold hover:bg-gold/25 transition-colors"
                    >
                      <span>↓</span>
                      <span>{t('categoryModal.limitsCountBadge', { count: childrenWithLimit.length })}</span>
                    </button>
                  )}
                </div>
              )
            })()}
          </td>
          <td className="px-3 py-2.5 w-48">
            {limit ? (
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-ink/70">{formatMoney(spent, currency, locale)}</span>
                  <span className={`text-xs font-medium ${status === 'over' ? 'text-terracotta' : status === 'warning' ? 'text-gold' : 'text-olive'}`}>
                    {status === 'over' ? `+${formatMoney(Math.max(0, spent - limit), currency, locale)}` : `${pct}%`}
                  </span>
                </div>
                <LimitBar pct={pct} />
              </div>
            ) : (
              <span className="text-sm text-ink/30">{t('categoryModal.noLimit')}</span>
            )}
          </td>
          <td className="px-3 py-2.5 w-24">
            <div className="flex items-center gap-1 justify-end">
              {limit ? (
                <button
                  type="button"
                  onClick={() => handleToggleBell(item.id)}
                  disabled={togglingBellId === item.id}
                  title={silencedIds.has(item.id) ? t('categoryModal.silenceAlertsActive') : t('categoryModal.silenceAlerts')}
                  className={`p-1 rounded border transition-colors ${silencedIds.has(item.id) ? 'border-gold/60 text-gold' : 'border-border text-ink/40 hover:text-ink/70'}`}
                >
                  {silencedIds.has(item.id) ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => startEdit(item)}
                className="p-1 rounded border border-border text-ink/60 hover:bg-paper hover:text-ink"
                aria-label={t('categoryModal.editAria', { name: resolveCategoryName(item, locale) })}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="p-1 rounded border border-terracotta/40 text-terracotta hover:bg-terracotta/10"
                aria-label={t('categoryModal.deleteAria', { name: resolveCategoryName(item, locale) })}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </td>
        </tr>
        {isExpanded && hasChildren && (item as NodeItem & { children: NodeItem[] }).children.map((child) => (
          <ExpenseTableRow key={child.id} item={child} depth={1} />
        ))}
        {isExpanded && !isEditingLimit && composerMode === 'child' && !editingId && draftParentId === item.id && (
          <tr className="bg-paper/80">
            <td colSpan={4} className="px-3 py-2 pl-10">
              <ComposerForm placeholder={t('categoryModal.subNamePlaceholder')} onCancel={resetComposer} />
            </td>
          </tr>
        )}
      </>
    )
  }

  const modalTitle = isExpenseTable ? t('categoryModal.modalTitleExpense') : (isSavingsScope ? t('categoryModal.modalTitleGoals') : t('categoryModal.modalTitleCategories'))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
      {isExpenseTable && (
        <p className="text-sm text-ink/50 mb-3">{t('categoryModal.monthlyLimitHint')}</p>
      )}

      <div className="rounded-lg border border-border bg-paper min-h-[60vh] flex flex-col">
        {loading ? (
          <p className="text-sm text-ink/60 p-4">{t('categoryModal.loading')}</p>
        ) : tree.length === 0 ? (
          <div className="space-y-3 p-4">
            <p className="text-sm text-ink/60">{isSavingsScope ? t('categoryModal.noGoalsRegistered') : t('categoryModal.noCategoriesRegistered')}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                aria-label={isSavingsScope ? t('categoryModal.newMainGoalAria') : t('categoryModal.newMainCategoryAria')}
                className="flex-1 px-3 py-2 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
                placeholder={isSavingsScope ? t('categoryModal.newMainGoalAria') : t('categoryModal.newMainCategoryAria')}
              />
              <button
                type="button"
                onClick={() => { setComposerMode('main'); setDraftParentId(null); saveComposer() }}
                disabled={saving}
                className="px-3 py-2 rounded-lg bg-petrol text-white text-sm disabled:opacity-60"
              >
                {t('categoryModal.createButton')}
              </button>
            </div>
          </div>
        ) : isExpenseTable ? (
          // ── EXPENSE TABLE LAYOUT ──
          <div className="flex flex-col flex-1">
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg/30">
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-ink/40 font-medium">{t('categoryModal.tableHeaderCategory')}</th>
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-ink/40 font-medium w-44">{t('categoryModal.tableHeaderMonthlyLimit')}</th>
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-ink/40 font-medium w-48">{t('categoryModal.tableHeaderThisMonth')}</th>
                    <th className="px-3 py-2 w-20" aria-label={t('common.actions')} />
                  </tr>
                </thead>
                <tbody>
                  {tree.map((main) => (
                    <ExpenseTableRow key={main.id} item={main} depth={0} />
                  ))}
                  {isMainComposer && !editingId && (
                    <tr className="bg-offWhite">
                      <td colSpan={4} className="px-3 py-3">
                        <ComposerForm placeholder={t('categoryModal.mainNamePlaceholder')} showIconPicker onCancel={resetComposer} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-3 py-3 border-t border-border/60 shrink-0">
              <button
                type="button"
                onClick={startCreateMain}
                className="flex items-center gap-1.5 text-sm text-petrol hover:text-petrol/80 transition-vintage"
              >
                <Plus className="w-4 h-4" />
                {t('categoryModal.newCategoryButton')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-petrol text-white text-sm hover:bg-petrol/90 transition-vintage"
              >
                {t('categoryModal.doneButton')}
              </button>
            </div>
          </div>
        ) : (
          // ── EXISTING LAYOUT for income / savings ──
          <>
            {/* ── MOBILE: collapsible accordion tree ── */}
            <div className="md:hidden space-y-2 overflow-auto flex-1 p-4">
              {tree.map((main) => {
                const isExpanded = expandedMainIds.has(main.id)
                const isEditingThis = editingId === main.id
                const isNewChildHere = isChildComposer && !editingId && draftParentId === main.id

                return (
                  <div key={main.id} className="overflow-hidden rounded-[16px] border-2 border-border/70 bg-paper/70">
                    <div className={`h-1 ${main.is_system ? 'bg-gradient-to-r from-coffee via-petrol to-olive' : 'bg-gradient-to-r from-terracotta via-gold to-coffee'}`} />

                    {isEditingThis ? (
                      <div className="px-3 py-3">
                        <ComposerForm placeholder={isSavingsScope ? t('categoryModal.nameOfGoalAria') : t('categoryModal.nameOfCategoryAria')} showIconPicker onCancel={resetComposer} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-3">
                        <button type="button" onClick={() => toggleExpandMain(main.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                          <ChevronDown className={`w-4 h-4 shrink-0 text-ink/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          {main.icon && <CategoryIcon name={main.icon} className="w-4 h-4 shrink-0 text-sidebar/60" />}
                          <div className="min-w-0">
                            <span className="block font-semibold text-sidebar truncate">{resolveCategoryName(main, locale)}</span>
                            <span className="text-[10px] text-ink/40">{(main as NodeItem & { children?: NodeItem[] }).children?.length ?? 0} {childEntityLabel}{(main as NodeItem & { children?: NodeItem[] }).children?.length === 1 ? '' : 's'}{main.is_system ? ` · ${t('categoryModal.systemBadge')}` : ''}</span>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => startEdit(main)} className="p-1.5 rounded border border-border text-ink/70 hover:bg-paper" aria-label={t('categoryModal.editAria', { name: resolveCategoryName(main, locale) })}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDelete(main)} className="p-1.5 rounded border border-terracotta/40 text-terracotta hover:bg-terracotta/10" aria-label={t('categoryModal.deleteAria', { name: resolveCategoryName(main, locale) })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {isExpanded && !isEditingThis && (
                      <div className="border-t border-border/50 pb-2 px-3 space-y-2 pt-2">
                        {(main as NodeItem & { children: NodeItem[] }).children.map((child) => {
                          const isEditingChild = editingId === child.id
                          return (
                            <div key={child.id} className={`ml-5 overflow-hidden rounded-[14px] border-2 ${isEditingChild ? 'border-coffee/50 bg-offWhite' : childStackTone}`}>
                              <div className="h-0.5 bg-gradient-to-r from-petrol via-olive to-gold" />
                              {isEditingChild ? (
                                <div className="px-3 py-2">
                                  <ComposerForm placeholder={isSavingsScope ? t('categoryModal.nameOfSubgoalAria') : t('categoryModal.nameOfSubcategoryAria')} onCancel={resetComposer} />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold text-ink/80 truncate">{resolveCategoryName(child, locale)}</span>
                                    {child.is_system && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/20 text-gold">{t('categoryModal.systemBadge')}</span>}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button type="button" onClick={() => startEdit(child)} className="p-1.5 rounded border border-border text-ink/70 hover:bg-paper" aria-label={t('categoryModal.editAria', { name: resolveCategoryName(child, locale) })}>
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button type="button" onClick={() => handleDelete(child)} className="p-1.5 rounded border border-terracotta/40 text-terracotta hover:bg-terracotta/10" aria-label={t('categoryModal.deleteAria', { name: resolveCategoryName(child, locale) })}>
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {isNewChildHere ? (
                          <div className="ml-5 px-3 py-2 rounded-[14px] border-2 border-coffee/30 bg-offWhite">
                            <ComposerForm placeholder={isSavingsScope ? t('categoryModal.nameOfSubgoalAria') : t('categoryModal.nameOfSubcategoryAria')} onCancel={resetComposer} />
                          </div>
                        ) : (
                          <button type="button" onClick={() => startCreateChildFor(main.id)} className="ml-5 flex items-center gap-1.5 text-xs text-petrol px-2 py-1.5 rounded-lg border border-petrol/30 hover:bg-petrol/5 transition-vintage">
                            <Plus className="w-3 h-3" />
                            {isSavingsScope ? t('categoryModal.newSubgoalButton') : t('categoryModal.newSubcategoryButton')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              <div className="pt-1 space-y-2">
                <button type="button" onClick={startCreateMain} className="w-full px-3 py-2.5 rounded-lg bg-petrol text-white text-sm hover:bg-petrol/90 transition-vintage">
                  + {isSavingsScope ? t('categoryModal.newMainGoalButton') : t('categoryModal.newMainCategoryButton')}
                </button>
                {isMainComposer && !editingId && (
                  <div className="px-3 py-3 rounded-lg border-2 border-coffee/30 bg-offWhite">
                    <ComposerForm placeholder={isSavingsScope ? t('categoryModal.nameOfMainGoalAria') : t('categoryModal.nameOfMainCategoryAria')} showIconPicker onCancel={resetComposer} />
                  </div>
                )}
              </div>
            </div>

            {/* ── DESKTOP: two-column grid ── */}
            <div className="hidden md:grid grid-cols-2 gap-3 flex-1 p-4">
              {/* Left: main categories */}
              <div className="rounded-lg border border-border/80 bg-bg/50 p-2">
                <p className="text-xs uppercase tracking-wide text-ink/50 px-2 py-1">{mainEntityPluralTitle}</p>
                <div className="space-y-1 max-h-[56vh] overflow-auto pr-1">
                  {tree.map((main) => {
                    const active = selectedMainId === main.id
                    const isEditingThis = editingId === main.id

                    return (
                      <div key={main.id} className={`rounded-[16px] border-2 transition-vintage ${isEditingThis ? 'border-coffee/50 bg-offWhite shadow-soft' : 'overflow-hidden ' + (active ? 'border-coffee/35 bg-offWhite shadow-soft' : 'border-border/70 bg-paper/70')}`}>
                        <div className={`h-1 rounded-t-[14px] ${main.is_system ? 'bg-gradient-to-r from-coffee via-petrol to-olive' : 'bg-gradient-to-r from-terracotta via-gold to-coffee'}`} />
                        {isEditingThis ? (
                          <div className="px-3 py-3 space-y-2">
                            <div className="flex gap-2 items-center">
                              <IconPicker value={draftIcon} onSelect={setDraftIcon} />
                              <input type="text" value={draftName} onChange={(event) => setDraftName(event.target.value)} autoFocus aria-label={isSavingsScope ? t('categoryModal.nameOfGoalAria') : t('categoryModal.nameOfCategoryAria')} className="flex-1 px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-paper-2/50" placeholder={isSavingsScope ? t('categoryModal.nameOfGoalAria') : t('categoryModal.nameOfCategoryAria')} />
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={resetComposer} className="px-3 py-1.5 rounded-lg border border-border text-sm text-ink/70">{t('categoryModal.cancelButton')}</button>
                              <button type="button" onClick={saveComposer} disabled={saving} className="px-3 py-1.5 rounded-lg bg-coffee text-paper text-sm disabled:opacity-60">{saving ? t('categoryModal.savingButton') : t('categoryModal.saveButton')}</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button type="button" onClick={() => setSelectedMainId(main.id)} className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left">
                              <div className="min-w-0 flex items-center gap-2">
                                {main.icon && <CategoryIcon name={main.icon} className="w-4 h-4 shrink-0 text-sidebar/60" />}
                                <div className="min-w-0">
                                  <p className="text-[10px] uppercase tracking-[0.22em] text-ink/40 mb-1">{t('categoryModal.mainLabel')}</p>
                                  <span className="block font-semibold text-sidebar truncate">{resolveCategoryName(main, locale)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button type="button" onClick={(event) => { event.stopPropagation(); startEdit(main) }} className="p-1 rounded border border-border text-ink/70 hover:bg-paper" aria-label={t('categoryModal.editAria', { name: resolveCategoryName(main, locale) })}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={(event) => { event.stopPropagation(); handleDelete(main) }} className="p-1 rounded border border-terracotta/40 text-terracotta hover:bg-terracotta/10" aria-label={t('categoryModal.deleteAria', { name: resolveCategoryName(main, locale) })}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </button>
                            <div className="px-3 pb-3 min-h-7 flex items-center">
                              {main.is_system ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/20 text-gold">{t('categoryModal.systemBadge')}</span> : null}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 pt-2 border-t border-border/70 space-y-2">
                  <button type="button" onClick={startCreateMain} className="w-full px-3 py-2 rounded-md bg-petrol text-white text-sm hover:bg-petrol/90 transition-vintage">
                    {isSavingsScope ? t('categoryModal.newMainGoalButton') : t('categoryModal.newMainCategoryButton')}
                  </button>
                  {isMainComposer && !editingId ? (
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <IconPicker value={draftIcon} onSelect={setDraftIcon} />
                        <input type="text" value={draftName} onChange={(event) => setDraftName(event.target.value)} autoFocus aria-label={isSavingsScope ? t('categoryModal.nameOfMainGoalAria') : t('categoryModal.nameOfMainCategoryAria')} className="flex-1 px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-paper-2/50" placeholder={isSavingsScope ? t('categoryModal.nameOfMainGoalAria') : t('categoryModal.nameOfMainCategoryAria')} />
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={resetComposer} className="px-3 py-2 rounded-lg border border-border text-sm text-ink/70">{t('categoryModal.cancelButton')}</button>
                        <button type="button" onClick={saveComposer} disabled={saving} className="px-3 py-2 rounded-lg bg-coffee text-paper text-sm disabled:opacity-60">{saving ? t('categoryModal.savingButton') : t('categoryModal.saveButton')}</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Right: subcategories */}
              <div className="rounded-lg border border-border/80 bg-bg/50 p-2">
                <p className="text-xs uppercase tracking-wide text-ink/50 px-2 py-1">{selectedMain ? (isSavingsScope ? t('categoryModal.subgoalsOf', { name: resolveCategoryName(selectedMain, locale) }) : t('categoryModal.subcategoriesOf', { name: resolveCategoryName(selectedMain, locale) })) : childEntityPluralTitle}</p>
                {!selectedMain ? (
                  <p className="text-sm text-ink/60 px-2 py-3">{isSavingsScope ? t('categoryModal.selectMainGoal') : t('categoryModal.selectMainCategory')}</p>
                ) : (selectedMain as NodeItem & { children?: NodeItem[] }).children?.length === 0 && !(isChildComposer && !editingId) ? (
                  <p className="text-sm text-ink/60 px-2 py-3">{isSavingsScope ? t('categoryModal.noSubgoals') : t('categoryModal.noSubcategories')}</p>
                ) : (
                  <div className="space-y-3 max-h-[56vh] overflow-auto pr-1">
                    <div className={`overflow-hidden rounded-[18px] border-2 ${mainStackTone} shadow-soft`}>
                      <div className="h-1 bg-gradient-to-r from-coffee via-petrol to-olive" />
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex items-center gap-2">
                          {selectedMain.icon && <CategoryIcon name={selectedMain.icon} className="w-5 h-5 shrink-0 text-sidebar/60" />}
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-ink/40 mb-1">{isSavingsScope ? t('categoryModal.goalBaseLabel') : t('categoryModal.categoryBaseLabel')}</p>
                            <h5 className="text-lg font-semibold text-sidebar truncate">{resolveCategoryName(selectedMain, locale)}</h5>
                          </div>
                        </div>
                        {selectedMain.is_system ? <span className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-gold/20 text-gold">{t('categoryModal.systemBadge')}</span> : null}
                      </div>
                    </div>
                    {(selectedMain as NodeItem & { children: NodeItem[] }).children.map((child) => {
                      const isEditingChild = editingId === child.id
                      return (
                        <div key={child.id} className={`ml-6 overflow-hidden rounded-[16px] border-2 shadow-soft ${isEditingChild ? 'border-coffee/50 bg-offWhite' : childStackTone}`}>
                          <div className="h-1 bg-gradient-to-r from-petrol via-olive to-gold" />
                          {isEditingChild ? (
                            <div className="px-4 py-3 space-y-2">
                              <input type="text" value={draftName} onChange={(event) => setDraftName(event.target.value)} autoFocus aria-label={isSavingsScope ? t('categoryModal.nameOfSubgoalAria') : t('categoryModal.nameOfSubcategoryAria')} className="w-full px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-paper-2/50" placeholder={isSavingsScope ? t('categoryModal.nameOfSubgoalAria') : t('categoryModal.nameOfSubcategoryAria')} />
                              <div className="flex gap-2">
                                <button type="button" onClick={resetComposer} className="px-3 py-1.5 rounded-lg border border-border text-sm text-ink/70">{t('categoryModal.cancelButton')}</button>
                                <button type="button" onClick={saveComposer} disabled={saving} className="px-3 py-1.5 rounded-lg bg-coffee text-paper text-sm disabled:opacity-60">{saving ? t('categoryModal.savingButton') : t('categoryModal.saveButton')}</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                                <div className="min-w-0">
                                  <p className="text-[10px] uppercase tracking-[0.22em] text-ink/40 mb-1">{childEntityLabelTitle}</p>
                                  <span className="block text-sm font-semibold text-ink/80 truncate">{resolveCategoryName(child, locale)}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button type="button" onClick={() => startEdit(child)} className="p-1 rounded border border-border text-ink/70 hover:bg-paper" aria-label={t('categoryModal.editAria', { name: resolveCategoryName(child, locale) })}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button type="button" onClick={() => handleDelete(child)} className="p-1 rounded border border-terracotta/40 text-terracotta hover:bg-terracotta/10" aria-label={t('categoryModal.deleteAria', { name: resolveCategoryName(child, locale) })}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="px-4 pb-3 min-h-7 flex items-center">
                                {child.is_system ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/20 text-gold">{t('categoryModal.systemBadge')}</span> : null}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-border/70 space-y-2">
                  <button type="button" onClick={startCreateChild} className="w-full px-3 py-2 rounded-md bg-petrol text-white text-sm hover:bg-petrol/90 transition-vintage" disabled={!selectedMain}>
                    {isSavingsScope ? t('categoryModal.newSubgoalButton') : t('categoryModal.newSubcategoryButton')}
                  </button>
                  {isChildComposer && !editingId ? (
                    <div className="space-y-2">
                      <input type="text" value={draftName} onChange={(event) => setDraftName(event.target.value)} autoFocus aria-label={isSavingsScope ? t('categoryModal.newSubgoalAria') : t('categoryModal.newSubcategoryAria')} className="w-full px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-paper-2/50" placeholder={isSavingsScope ? t('categoryModal.nameOfSubgoalAria') : t('categoryModal.nameOfSubcategoryAria')} />
                      <div className="flex gap-2">
                        <button type="button" onClick={resetComposer} className="px-3 py-2 rounded-lg border border-border text-sm text-ink/70">{t('categoryModal.cancelButton')}</button>
                        <button type="button" onClick={saveComposer} disabled={saving} className="px-3 py-2 rounded-lg bg-coffee text-paper text-sm disabled:opacity-60">{saving ? t('categoryModal.savingButton') : t('categoryModal.saveButton')}</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
