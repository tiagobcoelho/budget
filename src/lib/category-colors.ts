// Utility function to get category color
// Falls back to a default color if category doesn't have one
export function getCategoryColor(
  categoryName: string,
  categoryColor?: string | null
): string {
  if (categoryColor) {
    return categoryColor
  }

  // Default color mapping based on category name
  const colorMap: Record<string, string> = {
    'Food & Dining': '#22c55e',
    Transportation: '#f97316',
    Shopping: '#eab308',
    Entertainment: '#8b5cf6',
    Housing: '#3b82f6',
    'Health & Fitness': '#ec4899',
    'Bills & Utilities': '#6b7280',
    'Family & Education': '#ef4444',
    'Savings & Investments': '#22c55e',
    Miscellaneous: '#6b7280',
  }

  // Try to find a match (case-insensitive)
  const normalizedName = categoryName.toLowerCase()
  for (const [key, value] of Object.entries(colorMap)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return value
    }
  }

  // Default fallback color
  return '#6b7280'
}
