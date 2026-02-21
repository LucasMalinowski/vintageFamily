'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import {
  buildCategoryTree,
  CategoryKind,
  CategoryRecord,
  normalizeCategoryName,
} from '@/lib/categories'

interface CategorySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  familyId: string | null
  kind: CategoryKind
  onChanged?: () => void
}

type ComposerMode = 'main' | 'child' | null

export default function CategorySettingsModal({
  isOpen,
  onClose,
  familyId,
  kind,
  onChanged,
}: CategorySettingsModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<CategoryRecord[]>([])

  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string | null>(null)

  const [composerMode, setComposerMode] = useState<ComposerMode>(null)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftParentId, setDraftParentId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && familyId) {
      loadCategories()
    }
    if (!isOpen) {
      resetComposer()
      setSelectedMainCategoryId(null)
    }
  }, [isOpen, familyId, kind])

  const loadCategories = async () => {
    if (!familyId) return
    setLoading(true)

    const { data } = await supabase
      .from('categories')
      .select('id,name,kind,parent_id,is_system')
      .eq('family_id', familyId)
      .eq('kind', kind)
      .order('name')

    setCategories((data || []) as CategoryRecord[])
    setLoading(false)
  }

  const tree = useMemo(() => buildCategoryTree(categories), [categories])
  const selectedMainCategory = useMemo(
    () => tree.find((main) => main.id === selectedMainCategoryId) || null,
    [tree, selectedMainCategoryId]
  )

  useEffect(() => {
    if (tree.length === 0) {
      setSelectedMainCategoryId(null)
      return
    }

    const stillExists = selectedMainCategoryId
      ? tree.some((main) => main.id === selectedMainCategoryId)
      : false

    if (!stillExists) {
      setSelectedMainCategoryId(tree[0].id)
    }
  }, [tree, selectedMainCategoryId])

  const resetComposer = () => {
    setComposerMode(null)
    setEditingCategoryId(null)
    setDraftName('')
    setDraftParentId(null)
  }

  const startCreateMain = () => {
    setComposerMode('main')
    setEditingCategoryId(null)
    setDraftParentId(null)
    setDraftName('')
  }

  const startCreateChild = () => {
    if (!selectedMainCategory) {
      alert('Selecione uma categoria principal primeiro.')
      return
    }

    setComposerMode('child')
    setEditingCategoryId(null)
    setDraftParentId(selectedMainCategory.id)
    setDraftName('')
  }

  const startEdit = (category: CategoryRecord) => {
    setComposerMode(category.parent_id ? 'child' : 'main')
    setEditingCategoryId(category.id)
    setDraftParentId(category.parent_id)
    setDraftName(category.name)
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

    if (editingCategoryId) {
      const { error } = await supabase
        .from('categories')
        .update({
          name,
          parent_id: draftParentId,
        })
        .eq('id', editingCategoryId)
        .eq('family_id', familyId)
        .eq('kind', kind)

      errorMessage = error?.message || null
    } else {
      const { error } = await supabase
        .from('categories')
        .insert({
          family_id: familyId,
          kind,
          is_system: false,
          name,
          parent_id: draftParentId,
        })

      errorMessage = error?.message || null
    }

    setSaving(false)

    if (errorMessage) {
      alert(errorMessage)
      return
    }

    resetComposer()
    await loadCategories()
    onChanged?.()
  }

  const handleDelete = async (category: CategoryRecord) => {
    if (!familyId) return

    if (!confirm(`Excluir a categoria "${category.name}"?`)) return

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)
      .eq('family_id', familyId)
      .eq('kind', kind)

    if (error) {
      alert(error.message)
      return
    }

    if (editingCategoryId === category.id) {
      resetComposer()
    }

    await loadCategories()
    onChanged?.()
  }

  const isMainComposer = composerMode === 'main'
  const isChildComposer = composerMode === 'child'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Categorias"
      size="xl"
    >
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
            <div className="rounded-lg border border-border/80 bg-bg/50 p-2">
              <p className="text-xs uppercase tracking-wide text-ink/50 px-2 py-1">Categorias principais</p>
              <div className="space-y-1 max-h-[56vh] overflow-auto pr-1">
                {tree.map((mainCategory) => {
                  const active = selectedMainCategoryId === mainCategory.id
                  return (
                    <div
                      key={mainCategory.id}
                      className={`rounded-md border ${active ? 'border-petrol/40 bg-paper' : 'border-transparent'}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedMainCategoryId(mainCategory.id)}
                        className="w-full flex items-center justify-between px-2.5 py-2 text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-petrol truncate">{mainCategory.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              startEdit(mainCategory)
                            }}
                            className="p-1 rounded border border-border text-ink/70 hover:bg-paper"
                            aria-label={`Editar ${mainCategory.name}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleDelete(mainCategory)
                            }}
                            className="p-1 rounded border border-terracotta/40 text-terracotta hover:bg-terracotta/10"
                            aria-label={`Excluir ${mainCategory.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </button>
                      <div className="px-2.5 pb-2 min-h-7 flex items-center">
                        {mainCategory.is_system ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/20 text-gold">Sistema</span>
                        ) : null}
                      </div>
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
                {isMainComposer ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      className="w-full px-3 py-2 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
                      placeholder="Nome da categoria principal"
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
                        {saving ? 'Salvando...' : editingCategoryId ? 'Salvar' : 'Criar'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-bg/50 p-2">
              <p className="text-xs uppercase tracking-wide text-ink/50 px-2 py-1">
                {selectedMainCategory ? `Subcategorias de ${selectedMainCategory.name}` : 'Subcategorias'}
              </p>
              {!selectedMainCategory ? (
                <p className="text-sm text-ink/60 px-2 py-3">Selecione uma categoria principal.</p>
              ) : selectedMainCategory.children.length === 0 ? (
                <p className="text-sm text-ink/60 px-2 py-3">Sem subcategorias.</p>
              ) : (
                <div className="space-y-1 max-h-[56vh] overflow-auto pr-1">
                  {selectedMainCategory.children.map((child) => (
                    <div key={child.id} className="rounded-md border border-transparent">
                      <div className="w-full flex items-center justify-between px-2.5 py-2 text-left">
                        <span className="text-sm text-ink/80 truncate">{child.name}</span>
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
                      <div className="px-2.5 pb-2 min-h-7 flex items-center">
                        {child.is_system ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gold/20 text-gold">Sistema</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-border/70 space-y-2">
                <button
                  type="button"
                  onClick={startCreateChild}
                  className="w-full px-3 py-2 rounded-md bg-petrol text-white text-sm hover:bg-petrol/90 transition-vintage"
                  disabled={!selectedMainCategory}
                >
                  Nova Subcategoria
                </button>
                {isChildComposer ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      className="w-full px-3 py-2 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
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
                        {saving ? 'Salvando...' : editingCategoryId ? 'Salvar' : 'Criar'}
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
