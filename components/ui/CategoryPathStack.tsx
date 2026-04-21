'use client'

import clsx from 'clsx'

interface CategoryPathStackProps {
  label: string
  className?: string
}

const splitPath = (label: string) => {
  const separator = ' / '
  const index = label.indexOf(separator)

  if (index === -1) {
    return { parent: label.trim(), child: null }
  }

  return {
    parent: label.slice(0, index).trim(),
    child: label.slice(index + separator.length).trim(),
  }
}

export default function CategoryPathStack({ label, className }: CategoryPathStackProps) {
  const { parent, child } = splitPath(label)

  if (!parent) {
    return null
  }

  if (!child) {
    return (
      <div className={clsx('w-fit max-w-full')}>
        <div className="inline-flex max-w-full items-center rounded-full border border-coffee/30 bg-offWhite/80 px-2.5 py-0.5 text-[11px] font-medium leading-none text-ink/80">
          <span className="truncate">{parent}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('w-fit max-w-full')}>
      <div className="inline-flex max-w-full items-center rounded-full border border-coffee/35 bg-offWhite/80 px-2.5 py-0.5 text-[11px] font-medium leading-none text-ink/80">
        <span className="truncate">{parent}</span>
      </div>
      <div className="ml-6 mt-1 flex items-start">
        <div className="h-4 w-4 border-l border-b border-coffee/25 rounded-bl-sm" />
        <div className="inline-flex max-w-full min-w-0 items-center rounded-full border border-olive/35 bg-paper/80 px-2.5 py-0.5 text-[11px] font-medium leading-none text-sidebar/80">
          <span className="truncate">{child}</span>
        </div>
      </div>
    </div>
  )
}
