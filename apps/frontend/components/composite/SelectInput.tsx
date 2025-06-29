'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface SelectInputProps {
  id: string
  label?: string
  value: string
  onChange: (val: string) => void
  options: { label: string; value: string }[]
  placeholder?: string
  disabled?: boolean
}

export function SelectInput({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
}: SelectInputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
