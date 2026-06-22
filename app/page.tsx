"use client"

import Link from "next/link"
import { ShoppingBag, ShieldCheck } from "lucide-react"
import ThemeToggle from "@/components/theme-toggle"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen gradient-bg dark:gradient-bg light:gradient-bg-light grid-pattern dark:grid-pattern light:grid-pattern-light flex flex-col justify-between">
      {/* Top Header */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-500">
            ShopSmart
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Hero & Portals */}
      <main className="container mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-300">
            Welcome to ShopSmart
          </h1>
          <p className="text-lg md:text-xl text-emerald-100/70">
            Select an option below to enter the portal.
          </p>
        </div>

        {/* Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
          {/* Customer Portal Card */}
          <Link href="/customer" className="group block">
            <Card className="h-full cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] border-emerald-500/20 hover:border-emerald-500/50 bg-black/40 backdrop-blur-md glow-green flex flex-col justify-between">
              <CardHeader className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center mb-6 floating shadow-lg shadow-emerald-500/20">
                  <ShoppingBag className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-2">Are you a Customer?</CardTitle>
                <CardDescription className="text-emerald-300/80">
                  Select your store and start shopping with AI visual analysis and voice/text assistance.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <p className="text-gray-400 leading-relaxed">
                  Get personalized recommendations, stock status, pricing inquiries, and interactive navigation help.
                </p>
              </CardContent>
              <CardFooter className="p-8 border-t border-white/5 bg-white/[0.02]">
                <span className="text-emerald-400 font-semibold group-hover:text-emerald-300 transition-colors flex items-center gap-1">
                  Enter Shopping Assistant &rarr;
                </span>
              </CardFooter>
            </Card>
          </Link>

          {/* Manager Portal Card */}
          <Link href="/manager-login" className="group block">
            <Card className="h-full cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] border-blue-500/20 hover:border-blue-500/50 bg-black/40 backdrop-blur-md flex flex-col justify-between">
              <CardHeader className="p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 floating shadow-lg shadow-blue-500/20">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-2">Are you a Manager?</CardTitle>
                <CardDescription className="text-blue-300/80">
                  Access the management console to configure store layout, inventory, and check stats.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <p className="text-gray-400 leading-relaxed">
                  Log in to supervise inventory levels, add new stock, view store diagnostics, and update configurations.
                </p>
              </CardContent>
              <CardFooter className="p-8 border-t border-white/5 bg-white/[0.02]">
                <span className="text-blue-400 font-semibold group-hover:text-blue-300 transition-colors flex items-center gap-1">
                  Access Manager Portal &rarr;
                </span>
              </CardFooter>
            </Card>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500 border-t border-white/5">
        <p>&copy; {new Date().getFullYear()} ShopSmart. All rights reserved.</p>
      </footer>
    </div>
  )
}

