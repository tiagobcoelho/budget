'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryDot } from '@/components/budget-card/category-dot'
import { Pencil, Check, X, Archive, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

interface EditableBudgetCardProps {
  categoryName: string
  allocated: number
  currencyCode?: string
  percentage?: number
  onSave?: (newAllocated: number) => Promise<void> | void
  onArchive?: () => Promise<void> | void
  archiveLabel?: string
}

function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as Promise<T>).then === 'function'
  )
}

export function EditableBudgetCard({
  categoryName,
  allocated,
  currencyCode = 'USD',
  percentage,
  onSave,
  onArchive,
  archiveLabel = 'Archive',
}: EditableBudgetCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [editValue, setEditValue] = useState(allocated.toString())

  const currencySymbol = useMemo(() => {
    try {
      const parts = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: 'narrowSymbol',
      }).formatToParts(0)
      return (
        parts.find((part) => part.type === 'currency')?.value ?? currencyCode
      )
    } catch {
      return currencyCode
    }
  }, [currencyCode])

  const displayValue = useMemo(
    () => formatCurrency(allocated, currencyCode),
    [allocated, currencyCode]
  )

  const handleSave = async () => {
    if (isSaving) return
    const newValue = Number.parseFloat(editValue)
    if (!isNaN(newValue) && newValue > 0) {
      try {
        const result = onSave?.(newValue)
        if (isPromise(result)) {
          setIsSaving(true)
          await result
        }
        setIsEditing(false)
      } catch (error) {
        console.error('Failed to update budget allocation', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleCancel = () => {
    setEditValue(allocated.toString())
    setIsEditing(false)
    setIsSaving(false)
  }

  const handleArchive = async () => {
    if (!onArchive || isArchiving) return
    try {
      const result = onArchive()
      if (isPromise(result)) {
        setIsArchiving(true)
        await result
      }
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to archive budget definition', error)
    } finally {
      setIsArchiving(false)
    }
  }

  const percentageLabel =
    percentage !== undefined ? `${percentage.toFixed(1)}%` : undefined

  return (
    <Card>
      <CardContent className="pb-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CategoryDot category={categoryName} />
            <div className="space-y-0.5">
              <p className="text-base font-semibold leading-tight">
                {categoryName}
              </p>
            </div>
          </div>
          {!isEditing ? (
            <div className="text-right">
              <p className="text-xl font-bold leading-none">{displayValue}</p>
              {percentageLabel && (
                <p className="text-xs text-muted-foreground mt-1">
                  {percentageLabel}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm">{currencySymbol}</span>
                <Input
                  id={`budget-${categoryName}`}
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 max-w-[160px]"
                  autoFocus
                  disabled={isSaving}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSave()
                    if (e.key === 'Escape') handleCancel()
                  }}
                />
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleSave()}
                    className="h-7 w-7 p-0"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 animate-spin text-success" />
                    ) : (
                      <Check className="size-3.5 text-success" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="h-7 w-7 p-0"
                    disabled={isSaving}
                  >
                    <X className="size-3.5 text-muted-foreground" />
                  </Button>
                </>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-4">
          {onArchive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleArchive()}
              className="h-7 gap-1.5 px-2 text-destructive"
              disabled={isArchiving}
            >
              {isArchiving ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Archive className="size-3" />
              )}
              {archiveLabel}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-7 gap-1.5 px-2"
            disabled={isArchiving}
          >
            <Pencil className="size-3" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
