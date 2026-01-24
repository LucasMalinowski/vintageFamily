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
}

export default function Select({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder = 'Selecione...',
  required = false 
}: SelectProps) {
  return (
    <div>
      <label className="block text-sm font-body text-ink mb-2">
        {label}
        {required && <span className="text-terracotta ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50 transition-vintage appearance-none cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
