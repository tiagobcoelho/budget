import type React from 'react'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeSync } from '@/components/theme-sync'
import { ClerkProvider } from '@clerk/nextjs'
import { TRPCProvider } from '@/lib/trpc/Provider'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Budget Planner - Track Your Finances',
  description:
    'A modern budget planning app to manage your income, expenses, and financial goals',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ClerkProvider>
          <TRPCProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
              storageKey="budget-theme"
            >
              <ThemeSync />
              {children}
              <Toaster position="top-center" />
            </ThemeProvider>
          </TRPCProvider>
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  )
}
