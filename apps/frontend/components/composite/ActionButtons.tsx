'use client'

import { Button } from '@/components/ui/button'

interface ActionButtonsProps {
  onCancel?: () => void
  onSubmit?: () => void
  cancelLabel?: string
  submitLabel?: string
}

export default function ActionButtons({
  onCancel,
  onSubmit,
  cancelLabel = 'Cancel',
  submitLabel = 'Save',
}: ActionButtonsProps) {
  return (
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="outline" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button type="submit" onClick={onSubmit}>
        {submitLabel}
      </Button>
    </div>
  )
}
