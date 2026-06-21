import StudentRegisterClient from "./client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Student Registration",
  description: "Register for a student account",
}

export default function StudentRegisterPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6">Student Registration</h1>
        <p className="text-lg mb-8 text-gray-300">Create an account to access student features.</p>
      </div>
      <StudentRegisterClient />
    </div>
  )
}
