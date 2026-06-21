"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { PlusCircle, Check, Clock, Bell, CalendarClock, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { StoreCombobox } from "@/components/store-combobox"

// Types
interface ShoppingItem {
  id: string
  name: string
  emoji: string
  reminderTime: number
  completed: boolean
  createdAt: number
  timerStarted: boolean
  timedOut: boolean
}

interface QuietTimeRequest {
  id: number
  storeId: number
  storeLocation: string
  date: string
  timeWindow: string
  reason: string
  status: "pending" | "approved" | "rejected"
}

interface TimedOutItemAction {
  itemId: string
  action: "rewind" | "cancel" | null
}

interface LoginResponse {
  userId: number
  userEmail: string
  quietRequests: QuietTimeRequest[]
}

interface StoreInfo {
  storeId: number
  storeName: string
  storeLocation: string
}

export default function NeurodivergentClient({setIsLoggedIn}:{setIsLoggedIn: (isLoggedIn: boolean) => void}) {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [userId, setUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Add this useEffect after the existing state declarations
  useEffect(() => {
    // Load saved email and userId from localStorage on component mount
    const savedEmail = localStorage.getItem("userEmail")
    const savedUserId = localStorage.getItem("userId")
    if (savedEmail) {
      setEmail(savedEmail)
    }
    if (savedUserId) {
      setUserId(Number.parseInt(savedUserId))
      setIsAuthenticated(true)
      // Load user data if already authenticated
      loadUserData(Number.parseInt(savedUserId))
    }
  }, [isAuthenticated])

  // Shopping list state
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [newItemName, setNewItemName] = useState("")
  const [newItemEmoji, setNewItemEmoji] = useState("🛒")
  const [newItemReminderMinutes, setNewItemReminderMinutes] = useState(15)

  // Add this after the existing state declarations
  const [itemProgress, setItemProgress] = useState<{ [key: string]: number }>({})

  // Timer and reminder state
  const [timedOutItems, setTimedOutItems] = useState<ShoppingItem[]>([])
  const [itemActions, setItemActions] = useState<TimedOutItemAction[]>([])
  const [showTimedOutDialog, setShowTimedOutDialog] = useState(false)
  const timersRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Quiet time request state
  const [quietRequests, setQuietRequests] = useState<QuietTimeRequest[]>([])
  const [storeLocation, setStoreLocation] = useState("")
  const [requestDate, setRequestDate] = useState("")
  const [timeWindow, setTimeWindow] = useState("")
  const [requestReason, setRequestReason] = useState("")
  const [requestSuccess, setRequestSuccess] = useState(false)
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [storeComboboxOpen, setStoreComboboxOpen] = useState(false)

  // Fetch stores on mount
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch('/api/stores')
        if (res.ok) {
          const data = await res.json()
          setStores(data)
        }
      } catch (err) {
        console.error("Failed to fetch stores", err)
      }
    }
    fetchStores()
  }, [])

  // Common emojis for shopping
  const commonEmojis = ["🛒", "🥕", "🥩", "🍎", "🥛", "🧀", "🍞", "🧻", "🧼", "💊", "📱"]

  // Store mapping removed as backend now handles dynamic stores

  // Add CircularProgress component
  const CircularProgress = ({ progress, size = 40 }: { progress: number; size?: number }) => {
    const radius = (size - 4) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (progress / 100) * circumference

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
            className="text-muted-foreground/20"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ${
              progress >= 100 ? "text-red-500" : progress >= 75 ? "text-orange-500" : "text-primary"
            }`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-xs font-medium ${
              progress >= 100 ? "text-red-500" : progress >= 75 ? "text-orange-500" : "text-primary"
            }`}
          >
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    )
  }

  // Load user data from API
  const loadUserData = async (userId: number) => {
    try {
      const response = await fetch(`/api/user/quiettime?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setQuietRequests(data)
      }

    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  // Handle login with API call
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: email,
          password: password,
        }),
      })

      if (response.ok) {
        const data: LoginResponse = await response.json()

        // Save to localStorage
        localStorage.setItem("userEmail", data.userEmail)
        localStorage.setItem("userId", data.userId.toString())

        // Update state
        setUserId(data.userId)
        setIsAuthenticated(true)
        setQuietRequests(data.quietRequests || [])
        setIsLoggedIn(true)

        // Initialize empty shopping list
        setItems([])
      } else {
        // Handle login error
        console.error("Login failed")
        alert("Login failed. Please check your credentials.")
      }
    } catch (error) {
      console.error("Login error:", error)
      alert("Login error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Start timer for an item
  const startTimer = (item: ShoppingItem) => {
    if (timersRef.current[item.id]) {
      clearTimeout(timersRef.current[item.id])
    }

    timersRef.current[item.id] = setTimeout(
      () => {
        setItems((prevItems) => prevItems.map((i) => (i.id === item.id ? { ...i, timedOut: true } : i)))
      },
      item.reminderTime * 60 * 1000,
    ) // Convert minutes to milliseconds
  }

  // Clear timer for an item
  const clearTimer = (itemId: string) => {
    if (timersRef.current[itemId]) {
      clearTimeout(timersRef.current[itemId])
      delete timersRef.current[itemId]
    }
  }

  // Add new shopping item
  const addItem = () => {
    if (newItemName.trim()) {
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        name: newItemName,
        emoji: newItemEmoji,
        reminderTime: newItemReminderMinutes,
        completed: false,
        createdAt: Date.now(),
        timerStarted: true,
        timedOut: false,
      }
      setItems([...items, newItem])
      startTimer(newItem)
      setNewItemName("")
      setNewItemEmoji("🛒")
      setNewItemReminderMinutes(15)
    }
  }

  // Toggle item completion - now deletes the item instead of marking as completed
  const toggleItemCompletion = (id: string) => {
    // Clear the timer for this item
    clearTimer(id)

    // Remove the item completely from the list
    setItems(items.filter((item) => item.id !== id))
  }

  // Speak the timed out message
  const speakTimedOutMessage = (items: ShoppingItem[]) => {
    if ("speechSynthesis" in window) {
      const itemNames = items.map((item) => item.name).join(", ")
      const message = `Hey! Your time has run out for ${itemNames}`

      speechRef.current = new SpeechSynthesisUtterance(message)
      speechRef.current.rate = 0.8
      speechRef.current.pitch = 1
      speechRef.current.volume = 0.8

      window.speechSynthesis.speak(speechRef.current)
    }
  }

  // Handle action selection for timed out item
  const handleItemAction = (itemId: string, action: "rewind" | "cancel") => {
    setItemActions((prev) => {
      const existing = prev.find((a) => a.itemId === itemId)
      if (existing) {
        return prev.map((a) => (a.itemId === itemId ? { ...a, action } : a))
      } else {
        return [...prev, { itemId, action }]
      }
    })
  }

  // Submit actions for all timed out items
  const submitTimedOutActions = () => {
    setItems((prevItems) => {
      return prevItems
        .filter((item) => {
          const action = itemActions.find((a) => a.itemId === item.id)
          if (action?.action === "cancel") {
            clearTimer(item.id)
            return false // Remove item
          } else if (action?.action === "rewind") {
            clearTimer(item.id)
            const rewindedItem = { ...item, timedOut: false, createdAt: Date.now() }
            startTimer(rewindedItem)
            return true // Keep item but it will be updated
          }
          return true
        })
        .map((item) => {
          const action = itemActions.find((a) => a.itemId === item.id)
          if (action?.action === "rewind") {
            return { ...item, timedOut: false, createdAt: Date.now() }
          }
          return item
        })
    })

    // Reset dialog state
    setTimedOutItems([])
    setItemActions([])
    setShowTimedOutDialog(false)
  }

  // Check if all timed out items have actions selected
  const allActionsSelected = timedOutItems.every((item) =>
    itemActions.some((action) => action.itemId === item.id && action.action !== null),
  )

  // Submit quiet time request with API call
  const submitQuietTimeRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (storeLocation && requestDate && timeWindow && userId) {
      setIsLoading(true)

      try {
        const response = await fetch("/api/user/quiettime", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userId,
            storeLocation: storeLocation,
            date: requestDate,
            timeWindow: timeWindow,
            reason: requestReason,
          }),
        })

        if (response.ok) {
          // Refresh quiet time requests
          await loadUserData(userId)

          setRequestSuccess(true)
          // Reset form
          setStoreLocation("")
          setRequestDate("")
          setTimeWindow("")
          setRequestReason("")

          // Hide success message after 3 seconds
          setTimeout(() => {
            setRequestSuccess(false)
          }, 3000)
        } else {
          console.error("Failed to submit quiet time request")
          alert("Failed to submit request. Please try again.")
        }
      } catch (error) {
        console.error("Error submitting quiet time request:", error)
        alert("Error submitting request. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Check for timed out items
  useEffect(() => {
    const checkTimedOut = setInterval(() => {
      const currentTimedOut = items.filter((item) => item.timedOut && !item.completed)

      if (currentTimedOut.length > 0 && !showTimedOutDialog) {
        setTimedOutItems(currentTimedOut)
        setItemActions(currentTimedOut.map((item) => ({ itemId: item.id, action: null })))
        setShowTimedOutDialog(true)
        speakTimedOutMessage(currentTimedOut)
      }
    }, 1000) // Check every second

    return () => clearInterval(checkTimedOut)
  }, [items, showTimedOutDialog])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  // Update progress for all active items
  useEffect(() => {
    const updateProgress = setInterval(() => {
      const now = Date.now()
      const newProgress: { [key: string]: number } = {}

      items.forEach((item) => {
        if (item.timerStarted && !item.timedOut) {
          const elapsed = now - item.createdAt
          const totalTime = item.reminderTime * 60 * 1000 // Convert to milliseconds
          const progress = Math.min((elapsed / totalTime) * 100, 100)
          newProgress[item.id] = progress
        } else if (item.timedOut) {
          newProgress[item.id] = 100
        } else {
          newProgress[item.id] = 0
        }
      })

      setItemProgress(newProgress)
    }, 1000) // Update every second

    return () => clearInterval(updateProgress)
  }, [items])

  // If not authenticated, show login form
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center">
        <Card className="w-full max-w-md rounded-2xl">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Sign in to access your shopping list and quiet time requests</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-2 border-t p-4">
            <p className="text-sm text-muted-foreground">Enter your credentials to continue</p>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/student-register" className="text-primary hover:underline">
                Register here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Timed Out Items Dialog */}
      <Dialog open={showTimedOutDialog} onOpenChange={() => {}}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-red-500" />
              Time's Up!
            </DialogTitle>
            <DialogDescription>
              Your time has run out for the following items. Choose an action for each:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-60 overflow-y-auto">
            {timedOutItems.map((item) => {
              const currentAction = itemActions.find((a) => a.itemId === item.id)?.action
              return (
                <div key={item.id} className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-lg font-medium">{item.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={currentAction === "rewind" ? "default" : "outline"}
                      onClick={() => handleItemAction(item.id, "rewind")}
                      className="flex-1"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Rewind Timer
                    </Button>
                    <Button
                      size="sm"
                      variant={currentAction === "cancel" ? "destructive" : "outline"}
                      onClick={() => handleItemAction(item.id, "cancel")}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel Item
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button onClick={submitTimedOutActions} disabled={!allActionsSelected} className="w-full">
              Submit Actions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="shopping-list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="shopping-list">Shopping List</TabsTrigger>
          <TabsTrigger value="quiet-time">Quiet Time Request</TabsTrigger>
        </TabsList>

        <TabsContent value="shopping-list" className="space-y-6">
          {/* Next Item Card */}
          {items.length > 0 && (
            <Card className="rounded-2xl border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Next Item</CardTitle>
                <CardDescription>Focus on getting this item next</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const nextItem = items[0]
                  if (nextItem) {
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CircularProgress progress={itemProgress[nextItem.id] || 0} size={48} />
                          <span className="text-4xl">{nextItem.emoji}</span>
                          <div className="flex flex-col">
                            <span className="text-2xl font-medium">{nextItem.name}</span>
                            {nextItem.timedOut && (
                              <span className="text-sm text-red-500 font-medium">⏰ Time's up!</span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" className="rounded-full" onClick={() => toggleItemCompletion(nextItem.id)}>
                          <Check className="h-5 w-5 mr-1" /> Delete Item
                        </Button>
                      </div>
                    )
                  }
                })()}
              </CardContent>
            </Card>
          )}

          {/* Add Item Card */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Add Item to Shopping List
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <Label htmlFor="item-name">Item Name</Label>
                    <Input
                      id="item-name"
                      placeholder="Enter item name"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="item-emoji">Emoji</Label>
                    <Select value={newItemEmoji} onValueChange={setNewItemEmoji}>
                      <SelectTrigger id="item-emoji">
                        <SelectValue placeholder="🛒" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonEmojis.map((emoji) => (
                          <SelectItem key={emoji} value={emoji}>
                            {emoji}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="reminder-time">Reminder (minutes)</Label>
                  <Select
                    value={newItemReminderMinutes.toString()}
                    onValueChange={(value) => setNewItemReminderMinutes(Number.parseInt(value))}
                  >
                    <SelectTrigger id="reminder-time">
                      <SelectValue placeholder="15 minutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minute</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addItem}>Add Item</Button>
              </div>
            </CardContent>
          </Card>

          {/* Shopping List Card */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Your Shopping List
              </CardTitle>
              <CardDescription>{items.length} items remaining</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Your shopping list is empty. Add some items above.
                  </p>
                ) : (
                  <>
                    {/* Pending Items */}
                    {items.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">To Get:</h3>
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              item.timedOut ? "bg-red-50 border border-red-200" : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <CircularProgress progress={itemProgress[item.id] || 0} size={32} />
                              <span className="text-2xl">{item.emoji}</span>
                              <div className="flex flex-col">
                                <span>{item.name}</span>
                                {item.timedOut && (
                                  <span className="text-xs text-red-500 font-medium">⏰ Time's up!</span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-full h-8 w-8 p-0"
                              onClick={() => toggleItemCompletion(item.id)}
                            >
                              <Check className="h-4 w-4" />
                              <span className="sr-only">Delete item</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quiet-time" className="space-y-6">
          {/* Request Success Alert */}
          {requestSuccess && (
            <Alert className="bg-green-500/10 text-green-500 border-green-500/50">
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                Your quiet time request has been submitted. You'll be notified when it's approved.
              </AlertDescription>
            </Alert>
          )}

          {/* Quiet Time Request Form */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Request Quiet Shopping Time
              </CardTitle>
              <CardDescription>Submit a request for a low-stimulation shopping experience</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitQuietTimeRequest} className="space-y-4">
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="store-location">Walmart Store</Label>
                  <StoreCombobox 
                    selectedStoreId={stores.find(s => s.storeLocation === storeLocation)?.storeId || null}
                    onSelectStore={(store) => setStoreLocation(store.storeLocation)}
                    buttonClassName="w-full"
                    className="w-[400px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-date">Date</Label>
                  <Input
                    id="request-date"
                    type="date"
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time-window">Time Window</Label>
                  <Select value={timeWindow} onValueChange={setTimeWindow} required disabled={isLoading}>
                    <SelectTrigger id="time-window">
                      <SelectValue placeholder="Select time window" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8:00 AM - 9:00 AM">8:00 AM - 9:00 AM</SelectItem>
                      <SelectItem value="9:00 AM - 10:00 AM">9:00 AM - 10:00 AM</SelectItem>
                      <SelectItem value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</SelectItem>
                      <SelectItem value="2:00 PM - 3:00 PM">2:00 PM - 3:00 PM</SelectItem>
                      <SelectItem value="3:00 PM - 4:00 PM">3:00 PM - 4:00 PM</SelectItem>
                      <SelectItem value="7:00 PM - 8:00 PM">7:00 PM - 8:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-reason">Reason (Optional)</Label>
                  <Textarea
                    id="request-reason"
                    placeholder="Please briefly explain why you're requesting quiet shopping time"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    className="min-h-[100px]"
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Previous Requests */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Your Requests</CardTitle>
              <CardDescription>Status of your quiet time requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quietRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    You haven't made any quiet time requests yet.
                  </p>
                ) : (
                  quietRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{request.storeLocation}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.status === "approved"
                              ? "bg-green-500/10 text-green-500"
                              : request.status === "rejected"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {request.date} • {request.timeWindow}
                      </p>
                      {request.reason && <p className="text-sm mt-2 bg-muted p-2 rounded">{request.reason}</p>}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
