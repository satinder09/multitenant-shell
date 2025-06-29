'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ReactNode, useState } from 'react'

interface DialogFormProps {
  triggerLabel: string
  title: string
  description?: string
  children: ReactNode
  onSubmit?: () => void
}

export function DialogForm({
  triggerLabel,
  title,
  description,
  children,
  onSubmit,
}: DialogFormProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="space-y-4 mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit?.()
            setOpen(false)
          }}
        >
          {children}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
