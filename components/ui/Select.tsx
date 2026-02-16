'use client'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  variant?: 'default' | 'filter'
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
  const labelClassName = variant === 'filter'
    ? 'block font-serif text-petrol mb-2 text-center font-semibold'
    : 'block font-serif text-ink mb-2'
  const selectClassName = variant === 'filter'
    ? 'w-full px-4 py-2.5 bg-paper-2 rounded-md focus:outline-none focus:ring-2 focus:ring-petrol/40 transition-vintage appearance-none cursor-pointer text-petrol text-left [text-align-last:center]'
    : 'w-full px-4 py-2.5 bg-paper-2 rounded-md focus:outline-none focus:ring-2 focus:ring-petrol/40 transition-vintage appearance-none cursor-pointer'

  return (
    <div>
      <label className={labelClassName}>
        {label}
        {required && <span className="text-terracotta ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={selectClassName}
      >
        <option value="" className={variant === 'filter' ? 'text-left' : undefined}>{placeholder}</option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className={variant === 'filter' ? 'text-left' : undefined}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
