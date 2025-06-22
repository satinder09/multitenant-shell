'use client'

import * as React from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  label: string
  value: string
  group?: string
}

interface MultiSelectProps {
  label?: string
  placeholder?: string
  id?: string
  selected: string[]
  onChange: (values: string[]) => void
  options: Option[]
  disabled?: boolean
  showSelectAll?: boolean
  maxSelected?: number
  footerSlot?: React.ReactNode
  searchOverride?: string,maxDisplayCount?: number

}

export default function MultiSelect({
  label,
  placeholder = 'Select...',
  id,
  selected,
  onChange,
  options,
  disabled = false,
  showSelectAll = false,
  maxSelected,
  footerSlot,
  searchOverride,
  maxDisplayCount,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const toggleItem = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else if (!maxSelected || selected.length < maxSelected) {
      onChange([...selected, value])
    }
  }

  const groupedOptions = options.reduce<Record<string, Option[]>>((acc, option) => {
    const group = option.group ?? 'Ungrouped'
    if (!acc[group]) acc[group] = []
    acc[group].push(option)
    return acc
  }, {})

  const selectedLabels = options
    .filter((opt) => selected.includes(opt.value))
    .map((opt) => opt.label)

  const allValues = options.map((opt) => opt.value)
  const isAllSelected = allValues.every((val) => selected.includes(val))

  const handleSelectAll = () => onChange(allValues)
  const handleClearAll = () => onChange([])

  const filteredOptions = options.filter((opt) =>
    (searchOverride ?? search).toLowerCase() === ''
      ? true
      : opt.label.toLowerCase().includes((searchOverride ?? search).toLowerCase())
  )

  const filteredGrouped = filteredOptions.reduce<Record<string, Option[]>>((acc, option) => {
    const group = option.group ?? 'Ungrouped'
    if (!acc[group]) acc[group] = []
    acc[group].push(option)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={label || 'Multi select'}
            className="w-full justify-between"
            id={id}
            disabled={disabled}
          >
            {selectedLabels.length > 0 ? (
  maxDisplayCount && selectedLabels.length > maxDisplayCount
    ? `${selectedLabels.length} selected`
    : selectedLabels.join(', ')
) : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={4}
          forceMount
          className="min-w-[var(--radix-popover-trigger-width)] p-0 border border-border rounded-md shadow-md bg-popover"
        >
          <Command>
            <CommandInput
              placeholder="Search..."
              value={searchOverride ?? search}
              onValueChange={(val) => !searchOverride && setSearch(val)}
            />
            <CommandEmpty>No options found.</CommandEmpty>

            {Object.entries(filteredGrouped).map(([group, items]) => (
              <CommandGroup
                key={group}
                heading={group}
                className="px-2 text-sm font-semibold text-muted-foreground"
              >
                {items.map((item) => {
                  const disabled = maxSelected
                    ? !selected.includes(item.value) && selected.length >= maxSelected
                    : false

                  return (
                    <CommandItem
                      key={item.value}
                      onSelect={() => toggleItem(item.value)}
                      disabled={disabled}
                      className="relative pl-8 pr-2"
                    >
                      <Check
                        className={cn(
                          'absolute left-2 h-4 w-4',
                          selected.includes(item.value)
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      {item.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </Command>

          {(showSelectAll || footerSlot) && (
            <div className="border-t border-border bg-background px-3 py-2 text-sm flex items-center justify-between gap-4">
              {showSelectAll && (
                <>
                  <button
                    onClick={handleSelectAll}
                    disabled={isAllSelected}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={selected.length === 0}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear All
                  </button>
                </>
              )}
              {footerSlot}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
