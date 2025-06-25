'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Option {
  label: string
  value: string
  description?: string
}

interface ComboBoxTagsProps {
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  selected: string[]
  onChange: (values: string[]) => void
  options: Option[]
  disabled?: boolean
  className?: string
}

export default function ComboBoxTags({
  label,
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  selected,
  onChange,
  options,
  disabled = false,
  className,
}: ComboBoxTagsProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOptions = options.filter(option => selected.includes(option.value))
  // Show all options for search, but handle selection state properly
  const availableOptions = options

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      // Remove if already selected
      onChange(selected.filter(item => item !== value))
    } else {
      // Add if not selected
      onChange([...selected, value])
    }
    // Keep the dropdown open for multi-select
    // setOpen(false) - Removed to allow multiple selections
  }

  const handleRemove = (value: string) => {
    onChange(selected.filter(item => item !== value))
  }

  const handleClearAll = () => {
    onChange([])
  }

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}

      {/* Selected tags */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-background min-h-[2.5rem]">
          {selectedOptions.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="text-xs">{option.label}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemove(option.value)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {option.label}</span>
              </Button>
            </Badge>
          ))}
          {selectedOptions.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleClearAll}
              disabled={disabled}
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'justify-between',
              selectedOptions.length === 0 && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            {selectedOptions.length > 0
              ? `${selectedOptions.length} selected`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          tabIndex={0}
          style={{ pointerEvents: 'auto' }}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList
              style={{ maxHeight: 288, overflowY: 'auto' }}
              onWheel={e => {
                e.stopPropagation();
                const target = e.currentTarget;
                target.scrollTop += e.deltaY;
              }}
            >
              <CommandEmpty>No items found.</CommandEmpty>
              <CommandGroup>
                {availableOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.description || ''}`}
                    onSelect={() => {
                      handleSelect(option.value)
                    }}
                    className="cursor-pointer flex items-center justify-between p-2"
                  >
                    <div className="flex flex-col flex-1">
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                    <Check
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        selected.includes(option.value) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
} 