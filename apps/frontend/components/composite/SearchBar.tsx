'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

interface SearchBarProps {
  placeholder?: string
  onSearch?: (value: string) => void
}

export default function SearchBar({ placeholder = 'Search...', onSearch }: SearchBarProps) {
  return (
    <div className="flex gap-2 items-center w-full max-w-md">
      <Input
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch?.((e.target as HTMLInputElement).value)
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const input = document.querySelector<HTMLInputElement>('input[placeholder="' + placeholder + '"]')
          if (input) onSearch?.(input.value)
        }}
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  )
}
