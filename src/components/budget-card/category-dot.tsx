import { getCategoryColor } from '@/lib/category-colors'

interface CategoryDotProps {
  category: string
  color?: string | null
}

export function CategoryDot({ category, color }: CategoryDotProps) {
  const dotColor = getCategoryColor(category, color)

  return (
    <div
      className="size-3 shrink-0 rounded-full"
      style={{ backgroundColor: dotColor }}
    />
  )
}
