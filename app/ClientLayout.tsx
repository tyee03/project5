"use client"
import "@/app/globals.css"
import type React from "react"

import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import ProtectedRoute from "@/components/protected-route"
import { usePathname } from "next/navigation"

const fontSans = GeistSans
const fontMono = GeistMono

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = ["/login", "/signup", "/reset-password", "/update-password"].includes(pathname)

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Customer RoadMap Dashboard</title>
        <meta name="description" content="Customer relationship management dashboard" />
        <meta name="generator" content="v0.dev" />
      </head>
      <body className={`${fontSans.variable} ${fontMono.variable} min-h-screen bg-background font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {isAuthPage ? (
              <div className="flex min-h-screen items-center justify-center">{children}</div>
            ) : (
              <ProtectedRoute>
                <SidebarProvider>
                  <AppSidebar variant="inset" />
                  <SidebarInset>{children}</SidebarInset>
                </SidebarProvider>
              </ProtectedRoute>
            )}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
