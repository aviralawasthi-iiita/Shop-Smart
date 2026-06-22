import type { Metadata } from "next"
import CustomerClient from "./client"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Customer Assistance",
  description: "Personalized shopping assistance",
}

export default function CustomerPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-6">Customer Assistance</h1>
      <p className="text-lg mb-8">
        Use text, voice commands or camera to check products and get help.
      </p>

      <CustomerClient />
    </div>
  )
}
