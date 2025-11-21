'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { trpc } from '@/lib/trpc/client'

/**
 * Component that syncs the theme from the database to next-themes
 * This ensures the user's theme preference is applied on app load
 */
export function ThemeSync() {
  const { data: pref } = trpc.preference.get.useQuery()
  const { theme: currentTheme, setTheme: setNextTheme } = useTheme()

  useEffect(() => {
    if (pref?.theme && currentTheme !== pref.theme.toLowerCase()) {
      setNextTheme(pref.theme.toLowerCase() as 'light' | 'dark' | 'system')
    }
  }, [pref?.theme, currentTheme, setNextTheme])

  return null
}
