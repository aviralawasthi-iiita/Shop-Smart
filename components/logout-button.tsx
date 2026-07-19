"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LogoutButton({isLoggedIn}:{isLoggedIn: boolean}) {
  const router = useRouter()

  const handleLogout = async () => {
    // Remove user data from localStorage (for customers)
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userId")
    localStorage.removeItem("managerDetails")

    // Clear manager HttpOnly cookie
    try {
      await fetch("/api/manager/logout", { method: "POST" })
    } catch (e) {}

    // Optionally redirect to login or home page
    router.push("/")
  }

  return (
  <>
    {isLoggedIn ? (
      <Button
        onClick={handleLogout}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 bg-transparent"
      >
        <LogOut className="h-4 w-4" />
        Log Out
      </Button>
    ) : null}
  </>
);

}
