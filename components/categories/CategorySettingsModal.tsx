'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { CategoryKind, normalizeCategoryName } from '@/lib/categories'
import CategoryIcon from '@/components/ui/CategoryIcon'
import IconPicker from '@/components/ui/IconPicker'

type Scope = 'categories' | 'savings'

type NodeItem = {
  id: string
  name: string
  parent_id: string | null
  is_system: boolean
  icon: string | null
}

interface CategorySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  familyId: string | null
  onChanged?: () => void
  scope?: Scope
  kind?: CategoryKind
}

type ComposerMode = 'main' | 'child' | null

const buildTree = (items: NodeItem[]) => {
  const main = items
    .filter((item) => !item.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return main.map((item) => ({
    ...item,
    children: items
      .filter((child) => child.parent_id === item.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  }))
}

export default function CategorySettingsModal({
  isOpen,
  onClose,
  familyId,
  onChanged,
  scope = 'categories',
  kind,
}: CategorySettingsModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<NodeItem[]>([])

  const [selectedMainId, setSelectedMainId] = useState<string | null>(null)

  const [composerMode, setComposerMode] = useState<ComposerMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftParentId, setDraftParentId] = useState<string | null>(null)
  const [draftIcon, setDraftIcon] = useState<string | null>(null)

  async function loadItems() {
    if (!familyId) return

    setLoading(true)

    if (scope === 'savings') {
      const { data } = await supabase
        .from('savings')
        .select('id,name,parent_id,is_system,icon')
        .eq('family_id', familyId)
        .order('name')

      setItems((data || []) as NodeItem[])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('categories')
      .select('id,name,kind,parent_id,is_system,icon')
      .eq('family_id', familyId)
      .eq('kind', kind!)
      .order('name')

    setItems((data || []) as NodeItem[])
    setLoading(false)
  }

  function resetComposer() {
    setComposerMode(null)
    setEditingId(null)
    setDraftName('')
    setDraftParentId(null)
    setDraftIcon(null)
  }

  useEffect(() => {
    if (isOpen && familyId) {
      loadItems()
    }
    if (!isOpen) {
      resetComposer()
      setSelectedMainId(null)
    }
  }, [isOpen, familyId, scope, kind])

  const tree = useMemo(() => buildTree(items), [items])
  const selectedMain = useMemo(
    () => tree.find((main) => main.id === selectedMainId) || null,
    [tree, selectedMainId]
  )

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

  const startCreateMain = () => {
    setComposerMode('main')
    setEditingId(null)
    setDraftParentId(null)
    setDraftName('')
  }

  const startCreateChild = () => {
    if (!selectedMain) {
      alert('Selecione uma categoria principal primeiro.')
      return
    }

    setComposerMode('child')
    setEditingId(null)
    setDraftParentId(selectedMain.id)
    setDraftName('')
  }

  const startEdit = (item: NodeItem) => {
    setComposerMode(item.parent_id ? 'child' : 'main')
    setEditingId(item.id)
    setDraftParentId(item.parent_id)
    setDraftName(item.name)
    setDraftIcon(item.icon)
  }

  const saveComposer = async () => {
    if (!familyId) return

    const name = normalizeCategoryName(draftName)
    if (!name) {
      alert('Informe o nome da categoria.')
      return
    }

    setSaving(true)
    let errorMessage: string | null = null

    if (scope === 'savings') {
      if (editingId) {
        const { error } = await supabase
          .from('savings')
          .update({
            name,
            icon: draftIcon,
            parent_id: draftParentId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)
          .eq('family_id', familyId)

        errorMessage = error?.message || null
      } else {
        const { error } = await supabase
          .from('savings')
          .insert({
            family_id: familyId,
            name,
            icon: draftIcon,
            parent_id: draftParentId,
            is_system: false,
          })

        errorMessage = error?.message || null
      }
    } else {
      if (editingId) {
        const { error } = await supabase
          .from('categories')
          .update({
            name,
            icon: draftIcon,
            parent_id: draftParentId,
          })
          .eq('id', editingId)
          .eq('family_id', familyId)
          .eq('kind', kind!)

        errorMessage = error?.message || null
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            family_id: familyId,
            kind: kind!,
            is_system: false,
            name,
            icon: draftIcon,
            parent_id: draftParentId,
          })

        errorMessage = error?.message || null
      }
    }

    setSaving(false)

    if (errorMessage) {
      alert(errorMessage)
      return
    }

    resetComposer()
    await loadItems()
    onChanged?.()
  }

  const handleDelete = async (item: NodeItem) => {
    if (!familyId) return
    if (!confirm(`Excluir a categoria "${item.name}"?`)) return

    if (scope === 'savings') {
      const childIds = items.filter((it) => it.parent_id === item.id).map((it) => it.id)
      const idsToDelete = [item.id, ...childIds]

      await supabase
        .from('savings_contributions')
        .delete()
        .eq('family_id', familyId)
        .in('saving_id', idsToDelete)

      const { error } = await supabase
        .from('savings')
        .delete()
        .eq('family_id', familyId)
        .in('id', idsToDelete)

      if (error) {
        alert(error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', item.id)
        .eq('family_id', familyId)
        .eq('kind', kind!)

      if (error) {
        alert(error.message)
        return
      }
    }

    if (editingId === item.id) {
      resetComposer()
    }

    await loadItems()
    onChanged?.()
  }

  const isMainComposer = composerMode === 'main'
  const isChildComposer = composerMode === 'child'
  const mainStackTone = 'border-coffee/35 bg-offWhite'
  const childStackTone = 'border-petrol/30 bg-paper'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Categorias" size="xl">
      <div className="rounded-lg border border-border bg-paper p-4 min-h-[72vh] flex flex-col">
        <h4 className="text-sm font-semibold text-coffee mb-3">Categorias atuais</h4>

        {loading ? (
          <p className="text-sm text-ink/60">Carregando...</p>
        ) : tree.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-ink/60">Nenhuma categoria cadastrada.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="flex-1 px-3 py-2 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
                placeholder="Nova Categoria Principal"
              />
              <button
                type="button"
                onClick={() => {
                  setComposerMode('main')
                  setDraftParentId(null)
                  saveComposer()
                }}
                disabled={saving}
                className="px-3 py-2 rounded-lg bg-petrol text-white text-sm disabled:opacity-60"
              >
                Criar
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
            {/* ── LEFT: main categories ── */}
            <div className="rounded-lg border border-border/80 bg-bg/50 p-2">
              <p className="text-xs uppercase tracking-wide text-ink/50 px-2 py-1">Categorias principais</p>
              <div className="space-y-1 max-h-[56vh] overflow-auto pr-1">
                {tree.map((main) => {
                  const active = selectedMainId === main.id
                  const isEditingThis = editingId === main.id

                  return (
                    <div
                      key={main.id}
                      className={`overflow-hidden rounded-[16px] border-2 transition-vintage ${
                        isEditingThis
                          ? 'border-coffee/50 bg-offWhite shadow-soft'
                          : active
                          ? 'border-coffee/35 bg-offWhite shadow-soft'
                          : 'border-border/70 bg-paper/70'
                      }`}
                    >
                      <div
                        className={`h-1 ${
                          main.is_system
                            ? 'bg-gradient-to-r from-coffee via-petrol to-olive'
                            : 'bg-gradient-to-r from-terracotta via-gold to-coffee'
                        }`}
                      />

                      {isEditingThis ? (
                        /* ── inline edit form ── */
                        <div className="px-3 py-3 space-y-2">
                          <div className="flex gap-2 items-center">
                            <IconPicker value={draftIcon} onSelect={setDraftIcon} />
                            <input
                              type="text"
                              value={draftName}
                              onChange={(event) => setDraftName(event.target.value)}
                              autoFocus
                              className="flex-1 px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-paper-2/50"
                              placeholder="Nome da categoria"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={resetComposer}
                              className="px-3 py-1.5 rounded-lg border border-border text-sm text-ink/70"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={saveComposer}
                              disabled={saving}
                              className="px-3 py-1.5 rounded-lg bg-coffee text-paper text-sm disabled:opacity-60"
                            >
                              {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── normal card view ── */
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedMainId(main.id)}
                            className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              {main.icon && (
                                <CategoryIcon name={main.icon} className="w-4 h-4 shrink-0 text-sidebar/60" />
                              )}
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-ink/40 mb-1">Principal</p>
                                <span className="block font-semibold text-sidebar truncate">{main.name}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); startEdit(main) }}
                                className="p-1 rounded border border-border text-ink/70 hover:bg-paper"
                                aria-label={`Editar ${main.name}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); handleDelete(main) }}
                                className="p-1 rounded border border-terracotta/40 text-terracotta hover:bg-terracotta/10"
                                aria-label={`Excluir ${main.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </button>
                          <div className="px-3 pb-3 min-h-7 flex items-center">
                            {main.is_system ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/20 text-gold">Sistema</span>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-3 pt-2 border-t border-border/70 space-y-2">
                <button
                  type="button"
                  onClick={startCreateMain}
                  className="w-full px-3 py-2 rounded-md bg-petrol text-white text-sm hover:bg-petrol/90 transition-vintage"
                >
                  Nova Categoria Principal
                </button>
                {isMainComposer && !editingId ? (
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <IconPicker value={draftIcon} onSelect={setDraftIcon} />
                      <input
                        type="text"
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        autoFocus
                        className="flex-1 px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-paper-2/50"
                        placeholder="Nome da categoria principal"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetComposer}
                        className="px-3 py-2 rounded-lg border border-border text-sm text-ink/70"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={saveComposer}
                        disabled={saving}
                        className="px-3 py-2 rounded-lg bg-coffee text-paper text-sm disabled:opacity-60"
                      >
                        {saving ? 'Salvando...' : 'Criar'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* ── RIGHT: subcategories ── */}
            <div className="rounded-lg border border-border/80 bg-bg/50 p-2">
              <p className="text-xs uppercase tracking-wide text-ink/50 px-2 py-1">
                {selectedMain ? `Subcategorias de ${selectedMain.name}` : 'Subcategorias'}
              </p>
              {!selectedMain ? (
                <p className="text-sm text-ink/60 px-2 py-3">Selecione uma categoria principal.</p>
              ) : selectedMain.children.length === 0 && !(isChildComposer && !editingId) ? (
                <p className="text-sm text-ink/60 px-2 py-3">Sem subcategorias.</p>
              ) : (
                <div className="space-y-3 max-h-[56vh] overflow-auto pr-1">
                  <div className={`overflow-hidden rounded-[18px] border-2 ${mainStackTone} shadow-soft`}>
                    <div className="h-1 bg-gradient-to-r from-coffee via-petrol to-olive" />
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex items-center gap-2">
                        {selectedMain.icon && (
                          <CategoryIcon name={selectedMain.icon} className="w-5 h-5 shrink-0 text-sidebar/60" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-ink/40 mb-1">Categoria base</p>
                          <h5 className="text-lg font-semibold text-sidebar truncate">{selectedMain.name}</h5>
                        </div>
                      </div>
                      {selectedMain.is_system ? (
                        <span className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-gold/20 text-gold">
                          Sistema
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {selectedMain.children.map((child) => {
                    const isEditingChild = editingId === child.id
                    return (
                      <div
                        key={child.id}
                        className={`ml-6 overflow-hidden rounded-[16px] border-2 shadow-soft ${
                          isEditingChild ? 'border-coffee/50 bg-offWhite' : childStackTone
                        }`}
                      >
                        <div className="h-1 bg-gradient-to-r from-petrol via-olive to-gold" />
                        {isEditingChild ? (
                          /* ── inline edit form for child ── */
                          <div className="px-4 py-3 space-y-2">
                            <input
                              type="text"
                              value={draftName}
                              onChange={(event) => setDraftName(event.target.value)}
                              autoFocus
                              className="w-full px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-paper-2/50"
                              placeholder="Nome da subcategoria"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={resetComposer}
                                className="px-3 py-1.5 rounded-lg border border-border text-sm text-ink/70"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={saveComposer}
                                disabled={saving}
                                className="px-3 py-1.5 rounded-lg bg-coffee text-paper text-sm disabled:opacity-60"
                              >
                                {saving ? 'Salvando...' : 'Salvar'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── normal child view ── */
                          <>
                            <div className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-ink/40 mb-1">Subcategoria</p>
                                <span className="block text-sm font-semibold text-ink/80 truncate">{child.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEdit(child)}
                                  className="p-1 rounded border border-border text-ink/70 hover:bg-paper"
                                  aria-label={`Editar ${child.name}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(child)}
                                  className="p-1 rounded border border-terracotta/40 text-terracotta hover:bg-terracotta/10"
                                  aria-label={`Excluir ${child.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="px-4 pb-3 min-h-7 flex items-center">
                              {child.is_system ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/20 text-gold">Sistema</span>
                              ) : null}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-border/70 space-y-2">
                <button
                  type="button"
                  onClick={startCreateChild}
                  className="w-full px-3 py-2 rounded-md bg-petrol text-white text-sm hover:bg-petrol/90 transition-vintage"
                  disabled={!selectedMain}
                >
                  Nova Subcategoria
                </button>
                {isChildComposer && !editingId ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      autoFocus
                      className="w-full px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-paper-2/50"
                      placeholder="Nome da subcategoria"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={resetComposer}
                        className="px-3 py-2 rounded-lg border border-border text-sm text-ink/70"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={saveComposer}
                        disabled={saving}
                        className="px-3 py-2 rounded-lg bg-coffee text-paper text-sm disabled:opacity-60"
                      >
                        {saving ? 'Salvando...' : 'Criar'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
