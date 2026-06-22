"use client"

import { useState, useEffect } from "react"
import { Check, X, CalendarClock, Loader2, Plus, List, Send } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

// Types
interface QuietTimeRequest {
  id: number
  userId: string
  userName: string
  storeLocation: string
  date: string
  timeWindow: string
  reason: string
  status: "pending" | "approved" | "rejected"
}

interface ManagerDetails {
  storeId: number
  storeName?: string
  storeLocation?: string
  managerEmail?: string
}

interface Announcement {
  id: number
  title: string
  descrip?: string
  storeId: number
  createdAt: string
}

interface ManagerDashboardClientProps {
  announcements: Announcement[]
  setAnnouncements: (announcements: Announcement[]) => void
}

export default function ManagerDashboardClient({ announcements, setAnnouncements }: ManagerDashboardClientProps) {
  const [requests, setRequests] = useState<QuietTimeRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingRequestId, setUpdatingRequestId] = useState<number | null>(null)
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [announcementTitle, setAnnouncementTitle] = useState("")
  const [announcementDescription, setAnnouncementDescription] = useState("")
  const [managerDetails, setManagerDetails] = useState<ManagerDetails | null>(null)
  
  // Shopify config state
  const [shopDomain, setShopDomain] = useState("")
  const [apiToken, setApiToken] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [isSavingShopify, setIsSavingShopify] = useState(false)
  const [shopifyMessage, setShopifyMessage] = useState({ type: "", text: "" })

  const router = useRouter()


  // Check if user is authenticated and load data
  useEffect(() => {
    const managerDetailsStr = localStorage.getItem("managerDetails")
    if (!managerDetailsStr) {
      // Redirect to login if no manager details found
      router.push("/manager-login")
      return
    }

    try {
      const manager: ManagerDetails = JSON.parse(managerDetailsStr)
      setManagerDetails(manager)
      fetchQuietTimeRequests(manager.storeId)
    } catch (err) {
      setError("Invalid manager session. Please login again.")
      router.push("/manager-login")
    }
  }, [router])

  // Establish real-time requests event stream (SSE via Kafka)
  useEffect(() => {
    if (!managerDetails?.storeId) return

    const eventSource = new EventSource(`/api/manager/requests/sse?storeId=${managerDetails.storeId}`)
    
    eventSource.onmessage = (event) => {
      try {
        const newRequest = JSON.parse(event.data)
        setRequests((prev) => {
          if (prev.some((r) => r.id === newRequest.id)) return prev
          return [newRequest, ...prev]
        })
      } catch (err) {
        console.error("Error parsing requests SSE event:", err)
      }
    }

    eventSource.onerror = (err) => {
      console.error("Requests SSE failed:", err)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [managerDetails?.storeId])

  // Fetch quiet time requests from API
  const fetchQuietTimeRequests = async (storeId: number) => {
    try {
      setIsLoading(true)
      setError("")
      const response = await fetch(`/api/manager/quiettime?storeId=${storeId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch quiet time requests")
      }
      const data = await response.json()
      setRequests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching requests")
    } finally {
      setIsLoading(false)
    }
  }

  // Update request status
  const updateRequestStatus = async (id: number, status: "approved" | "rejected") => {
    try {
      setUpdatingRequestId(id)
      setError("")
      const response = await fetch("/api/manager/quiettime", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      })

      if (!response.ok) {
        throw new Error("Failed to update request status")
      }

      // Update local state
      setRequests(requests.map((request) => (request.id === id ? { ...request, status } : request)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while updating the request")
    } finally {
      setUpdatingRequestId(null)
    }
  }

  // Post new announcement
  const postAnnouncement = async () => {
    if (!announcementTitle.trim() || !managerDetails) {
      return
    }

    try {
      setIsPosting(true)
      setError("")

      const response = await fetch("/api/manager/announcement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: announcementTitle.trim(),
          descrip: announcementDescription.trim() || null,
          storeId: managerDetails.storeId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to post announcement")
      }

      const result = await response.json()

      // Create new announcement object and update state
      const newAnnouncement: Announcement = {
        id: result.insertedId,
        title: announcementTitle.trim(),
        descrip: announcementDescription.trim() || undefined,
        storeId: managerDetails.storeId,
        createdAt: new Date().toISOString(),
      }

      setAnnouncements([newAnnouncement, ...announcements])

      // Reset form and close dialog
      setAnnouncementTitle("")
      setAnnouncementDescription("")
      setIsPostDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while posting the announcement")
    } finally {
      setIsPosting(false)
    }
  }

  // Save Shopify Configuration
  const saveShopifyConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!managerDetails) return

    try {
      setIsSavingShopify(true)
      setShopifyMessage({ type: "", text: "" })

      const response = await fetch("/api/stores/shopify-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: managerDetails.storeId,
          shopDomain,
          apiToken,
          webhookSecret,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to save configuration")
      }

      setShopifyMessage({ type: "success", text: "Shopify configuration saved and initial sync triggered successfully!" })
    } catch (err) {
      setShopifyMessage({ type: "error", text: err instanceof Error ? err.message : "An error occurred" })
    } finally {
      setIsSavingShopify(false)
    }
  }

  // Filter requests by status
  const pendingRequests = requests.filter((request) => request.status === "pending")
  const approvedRequests = requests.filter((request) => request.status === "approved")
  const rejectedRequests = requests.filter((request) => request.status === "rejected")

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading quiet time requests...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Store Heading Banner */}
      {managerDetails && (
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-6 rounded-2xl border border-blue-500/20 shadow-md">
          <h2 className="text-2xl font-bold text-white mb-1">
            Store Portal: {managerDetails.storeName || "Active Store"}
          </h2>
          <p className="text-sm text-blue-300/80">
            Location: {managerDetails.storeLocation || "Unknown Location"}
          </p>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50">
        <div className="flex flex-wrap gap-3">
          <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Post Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Post New Announcement</DialogTitle>
                <DialogDescription>Create a new announcement for your store customers.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="Enter announcement title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={announcementDescription}
                    onChange={(e) => setAnnouncementDescription(e.target.value)}
                    placeholder="Enter announcement description (optional)"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPostDialogOpen(false)} disabled={isPosting}>
                  Cancel
                </Button>
                <Button
                  onClick={postAnnouncement}
                  disabled={!announcementTitle.trim() || isPosting}
                  className="flex items-center gap-2"
                >
                  {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Post
                </Button>
              </div>
            </DialogContent>
          </Dialog>
 
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 bg-transparent border-gray-600 text-gray-200 hover:bg-gray-700">
                <List className="h-4 w-4" />
                View Announcements
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Store Announcements</DialogTitle>
                <DialogDescription>View all announcements for your store.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto">
                {announcements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No announcements posted yet.</p>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <Card key={announcement.id} className="rounded-lg">
                        <CardContent className="p-4">
                          <h3 className="font-medium mb-2">{announcement.title}</h3>
                          {announcement.descrip && (
                            <p className="text-sm text-muted-foreground mb-2">{announcement.descrip}</p>
                          )}
                          {announcement.createdAt && (
                            <p className="text-xs text-muted-foreground">
                              Posted: {new Date(announcement.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
 
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem("managerDetails")
              router.push("/")
            }}
            className="bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            Log Out
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="pending">
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="shopify">Shopify Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Pending Quiet Time Requests
              </CardTitle>
              <CardDescription>Review and approve or reject customer requests</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No pending requests at this time.</p>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="rounded-lg">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{request.userName}</h3>
                            <Badge variant={request.timeWindow === "Complaint" ? "destructive" : "secondary"}>
                              {request.timeWindow === "Complaint" ? "Complaint" : "Quiet Time"}
                            </Badge>
                          </div>
                          <Badge>Pending</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{request.storeLocation}</p>
                        <p className="text-sm text-muted-foreground mb-3" suppressHydrationWarning>
                          {request.date} • {request.timeWindow}
                        </p>
                        {request.reason && <p className="text-sm bg-muted p-3 rounded mb-4">{request.reason}</p>}
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 bg-transparent"
                            onClick={() => updateRequestStatus(request.id, "rejected")}
                            disabled={updatingRequestId === request.id}
                          >
                            {updatingRequestId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => updateRequestStatus(request.id, "approved")}
                            disabled={updatingRequestId === request.id}
                          >
                            {updatingRequestId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Approved Requests</CardTitle>
              <CardDescription>Quiet time requests that have been approved</CardDescription>
            </CardHeader>
            <CardContent>
              {approvedRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No approved requests at this time.</p>
              ) : (
                <div className="space-y-4">
                  {approvedRequests.map((request) => (
                    <Card key={request.id} className="rounded-lg">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{request.userName}</h3>
                            <Badge variant={request.timeWindow === "Complaint" ? "destructive" : "secondary"}>
                              {request.timeWindow === "Complaint" ? "Complaint" : "Quiet Time"}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50">
                            Approved
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{request.storeLocation}</p>
                        <p className="text-sm text-muted-foreground mb-3" suppressHydrationWarning>
                          {request.date} • {request.timeWindow}
                        </p>
                        {request.reason && <p className="text-sm bg-muted p-3 rounded">{request.reason}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Rejected Requests</CardTitle>
              <CardDescription>Quiet time requests that have been rejected</CardDescription>
            </CardHeader>
            <CardContent>
              {rejectedRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No rejected requests at this time.</p>
              ) : (
                <div className="space-y-4">
                  {rejectedRequests.map((request) => (
                    <Card key={request.id} className="rounded-lg">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{request.userName}</h3>
                            <Badge variant={request.timeWindow === "Complaint" ? "destructive" : "secondary"}>
                              {request.timeWindow === "Complaint" ? "Complaint" : "Quiet Time"}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/50">
                            Rejected
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{request.storeLocation}</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          {request.date} • {request.timeWindow}
                        </p>
                        {request.reason && <p className="text-sm bg-muted p-3 rounded">{request.reason}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shopify" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Shopify Integration</CardTitle>
              <CardDescription>Configure your Shopify Admin API credentials to enable real-time inventory sync.</CardDescription>
            </CardHeader>
            <CardContent>
              {shopifyMessage.text && (
                <Alert variant={shopifyMessage.type === "success" ? "default" : "destructive"} className="mb-4">
                  <AlertDescription>{shopifyMessage.text}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={saveShopifyConfig} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shopDomain">Shopify Store Domain</Label>
                  <Input
                    id="shopDomain"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    placeholder="mystore.myshopify.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">The full .myshopify.com domain of your store.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiToken">Admin API Access Token</Label>
                  <Input
                    id="apiToken"
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="shpat_..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">Found in the Shopify Admin under Custom Apps.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Webhook Secret</Label>
                  <Input
                    id="webhookSecret"
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Enter webhook secret..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">Used to securely verify incoming inventory webhooks from Shopify.</p>
                </div>
                <Button type="submit" disabled={isSavingShopify} className="w-full sm:w-auto">
                  {isSavingShopify ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving & Syncing...
                    </>
                  ) : (
                    "Save Configuration & Trigger Sync"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
