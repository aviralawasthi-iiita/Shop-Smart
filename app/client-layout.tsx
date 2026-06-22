"use client"

import type React from "react"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"

export default function ClientRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="shopsmart-theme">
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
        <Toaster position="top-center" theme="dark" />
      </div>
    </ThemeProvider>
  )
}

