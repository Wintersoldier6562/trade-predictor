import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Trend Predictor - Stock Analysis',
  description: 'AI-powered stock analysis with automated cron jobs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
