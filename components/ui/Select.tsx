'use client'

import { Fragment, useMemo, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { Check, ChevronDown, Search } from 'lucide-react'
import clsx from 'clsx'
import CategoryIcon from '@/components/ui/CategoryIcon'

interface SelectOption {
  value: string
  label: string
  meta?: {
    parentLabel?: string
    depth?: number
    icon?: string | null
  }
}

interface SelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  variant?: 'default' | 'filter' | 'modal'
}

export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  required = false,
  variant = 'default',
}: SelectProps) {
  const selectedOption = options.find((option) => option.value === value) || null
  const [searchTerm, setSearchTerm] = useState('')
  const handleChange = (nextValue: string) => {
    setSearchTerm('')
    onChange(nextValue)
  }
  const groupedOptions = options.reduce<
    Array<{ main: SelectOption; children: SelectOption[] }>
  >((groups, option) => {
    if (!option.meta?.depth) {
      groups.push({ main: option, children: [] })
      return groups
    }

    const currentGroup = groups[groups.length - 1]
    if (currentGroup) {
      currentGroup.children.push(option)
    }

    return groups
  }, [])
  const searchable = options.some((option) => option.meta?.depth === 1 || option.meta?.parentLabel)
  const filteredGroups = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!searchable || !query) {
      return groupedOptions
    }

    return groupedOptions
      .map((group) => {
        const mainMatches = group.main.label.toLowerCase().includes(query)
        const children = group.children.filter((child) => child.label.toLowerCase().includes(query))

        if (!mainMatches && children.length === 0) {
          return null
        }

        return { main: group.main, children }
      })
      .filter((group): group is { main: SelectOption; children: SelectOption[] } => Boolean(group))
  }, [groupedOptions, searchable, searchTerm])

  const labelClassName =
    variant === 'filter'
      ? 'block text-[11px] font-semibold tracking-[0.07em] uppercase text-ink/50 mb-1 text-left'
      : 'block font-serif text-ink mb-2'

  const buttonClassName =
    variant === 'filter'
      ? 'w-full min-h-11 rounded-[14px] border border-border/80 bg-offWhite px-3 py-2 text-left text-sm text-ink shadow-[0_1px_0_rgba(255,255,255,.65)] transition-vintage hover:border-coffee/35 focus:outline-none focus:ring-2 focus:ring-paper-2/40'
      : variant === 'modal'
        ? 'w-full min-h-12 rounded-[14px] border border-border bg-paper px-4 py-2.5 text-left text-sm text-ink shadow-[0_1px_0_rgba(255,255,255,.55)] transition-vintage hover:border-coffee/25 focus:outline-none focus:ring-2 focus:ring-paper-2/40'
        : 'w-full min-h-12 rounded-[14px] border border-border bg-bg px-4 py-2.5 text-left text-sm text-ink shadow-[0_1px_0_rgba(255,255,255,.55)] transition-vintage hover:border-coffee/25 focus:outline-none focus:ring-2 focus:ring-paper-2/40'

  const optionsPanelClassName = 'absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-[16px] border border-border/70 bg-offWhite p-2 shadow-soft'

  return (
    <div>
      <label className={labelClassName}>
        {label}
        {required && <span className="ml-1 text-terracotta">*</span>}
      </label>

      <Listbox value={value} onChange={handleChange}>
        {() => (
          <div className="relative">
            <Listbox.Button className={buttonClassName}>
              <div className="flex items-center gap-3">
                {selectedOption?.meta?.icon && !selectedOption?.meta?.parentLabel ? (
                  <CategoryIcon name={selectedOption.meta.icon} className="w-4 h-4 shrink-0 text-ink/50" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className={clsx('truncate', !selectedOption && 'text-ink/40')}>
                    {selectedOption ? selectedOption.label : placeholder}
                  </div>
                  {selectedOption?.meta?.parentLabel ? (
                    <div className="mt-0.5 truncate text-[11px] text-ink/45">
                      {selectedOption.meta.parentLabel}
                    </div>
                  ) : null}
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-ink/35" aria-hidden="true" />
              </div>
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Listbox.Options className={optionsPanelClassName}>
                {searchable ? (
                  <div className="mb-2 rounded-[12px] border border-border/70 bg-paper px-3 py-2">
                    <label className="flex items-center gap-2">
                      <Search className="h-4 w-4 shrink-0 text-ink/35" aria-hidden="true" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Buscar categoria"
                        className="w-full bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="space-y-2">
                  {filteredGroups.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-ink/45">Nenhum resultado.</div>
                  ) : (
                    filteredGroups.map((group) => (
                      <div key={group.main.value} className="space-y-1">
                        <Listbox.Option
                          value={group.main.value}
                          className={({ active }) =>
                            clsx(
                              'cursor-pointer rounded-[12px] px-3 py-2.5 transition-vintage',
                              active ? 'bg-coffee/8' : 'bg-transparent'
                            )
                          }
                        >
                          {({ selected: isSelected, active }) => (
                            <div className="flex items-center gap-3">
                              {group.main.meta?.icon ? (
                                <CategoryIcon
                                  name={group.main.meta.icon}
                                  className={clsx('w-4 h-4 shrink-0', active ? 'text-coffee' : 'text-ink/45')}
                                />
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <div
                                  className={clsx(
                                    'truncate text-sm font-medium',
                                    active ? 'text-coffee' : 'text-sidebar'
                                  )}
                                >
                                  {group.main.label}
                                </div>
                              </div>
                              {isSelected ? <Check className="h-4 w-4 shrink-0 text-coffee" aria-hidden="true" /> : null}
                            </div>
                          )}
                        </Listbox.Option>

                        {group.children.length > 0 ? (
                          <div className="ml-4 border-l border-coffee/15 pl-3 space-y-1">
                            {group.children.map((option) => (
                              <Listbox.Option
                                key={option.value}
                                value={option.value}
                                className={({ active }) =>
                                  clsx(
                                    'cursor-pointer rounded-[12px] px-3 py-2 transition-vintage',
                                    active ? 'bg-coffee/6' : 'bg-transparent'
                                  )
                                }
                              >
                                {({ selected: isSelected, active }) => (
                                  <div className="flex items-center gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div
                                        className={clsx(
                                          'truncate text-sm',
                                          active ? 'text-coffee' : 'text-ink/80'
                                        )}
                                      >
                                        {option.label}
                                      </div>
                                    </div>
                                    {isSelected ? (
                                      <Check className="h-4 w-4 shrink-0 text-coffee" aria-hidden="true" />
                                    ) : null}
                                  </div>
                                )}
                              </Listbox.Option>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>
    </div>
  )
}
