import ManagerRegisterClient from "./client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Manager Registration",
  description: "Register for a manager account",
}

export default function ManagerRegisterPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6">Manager Registration</h1>
        <p className="text-lg mb-8 text-gray-300">Create an account to manage your store's quiet times and announcements.</p>
      </div>
      <ManagerRegisterClient />
    </div>
  )
}
