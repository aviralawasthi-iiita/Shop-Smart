"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Camera, CameraOff, X, Loader2, Bell, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StoreCombobox, StoreInfo } from "@/components/store-combobox"

// Announcement interface
interface Announcement {
  id: number
  title: string
  descrip?: string
  storeId: number
  createdAt: string
}

interface HearingImpairedClientProps {
  announcements?: Announcement[]
}

// --- Custom Hook for Typewriter Effect ---
const useTypewriter = (text: string, speed = 50) => {
  const [displayText, setDisplayText] = useState("")

  useEffect(() => {
    let cancelled = false
    setDisplayText("")

    if (text) {
      const typeChar = (index: number) => {
        if (cancelled) return
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1))
          setTimeout(() => typeChar(index + 1), speed)
        }
      }
      typeChar(0)
    }

    return () => {
      cancelled = true
    }
  }, [text, speed])

  return displayText
}

export default function HearingImpairedClient({ announcements = [] }: HearingImpairedClientProps) {
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [inputText, setInputText] = useState("")
  const [apiResponse, setApiResponse] = useState("Welcome! Type your question or turn on the camera.")
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [femaleVoice, setFemaleVoice] = useState<SpeechSynthesisVoice | null>(null)

  // Announcement states
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [selectedStoreName, setSelectedStoreName] = useState<string>("Unknown Store")
  const [showStoreSelection, setShowStoreSelection] = useState(false)
  const [readAnnouncements, setReadAnnouncements] = useState<Set<string>>(new Set())
  const [showAnnouncementsList, setShowAnnouncementsList] = useState(false)
  const [currentNotification, setCurrentNotification] = useState<Announcement | null>(null)
  const [lastAnnouncementCount, setLastAnnouncementCount] = useState(0)
  const [storeSelectionDismissed, setStoreSelectionDismissed] = useState(false)
  const [storeSelectionOpenedViaButton, setStoreSelectionOpenedViaButton] = useState(false)
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const displayedResponse = useTypewriter(apiResponse)

  // --- Detect if the device is mobile ---
  const isMobile = useMemo(() => /Mobi|Android/i.test(navigator.userAgent), [])

  // Initialize store selection and read announcements from localStorage
  useEffect(() => {
    const storedStoreId = localStorage.getItem("storeId")
    const storedStoreName = localStorage.getItem("storeName")
    const storedReadAnnouncements = localStorage.getItem("readAnnouncements")
    const storedDismissed = localStorage.getItem("storeSelectionDismissed")

    if (storedStoreId) {
      setSelectedStoreId(Number.parseInt(storedStoreId))
      if (storedStoreName) setSelectedStoreName(storedStoreName)
    } else if (storedDismissed === "true") {
      setStoreSelectionDismissed(true)
    } else {
      setShowStoreSelection(true)
    }

    if (storedReadAnnouncements) {
      setReadAnnouncements(new Set(JSON.parse(storedReadAnnouncements)))
    }
  }, [])

  // Filter announcements by selected store
  const filteredAnnouncements = useMemo(() => {
    if (!selectedStoreId) return []
    return announcements.filter((announcement) => announcement.storeId === selectedStoreId)
  }, [announcements, selectedStoreId])

  // Get unread announcements
  const unreadAnnouncements = useMemo(() => {
    return filteredAnnouncements.filter((announcement) => !readAnnouncements.has(announcement.id.toString()))
  }, [filteredAnnouncements, readAnnouncements])

  // Check for new announcements and show notification
  useEffect(() => {
    if (filteredAnnouncements.length > lastAnnouncementCount && lastAnnouncementCount > 0) {
      const newAnnouncements = filteredAnnouncements.slice(lastAnnouncementCount)
      if (newAnnouncements.length > 0) {
        const latestAnnouncement = newAnnouncements[newAnnouncements.length - 1]
        setCurrentNotification(latestAnnouncement)

        // Clear existing timeout
        if (notificationTimeoutRef.current) {
          clearTimeout(notificationTimeoutRef.current)
        }

        // Hide notification after 3 seconds
        notificationTimeoutRef.current = setTimeout(() => {
          setCurrentNotification(null)
        }, 3000)
      }
    }
    setLastAnnouncementCount(filteredAnnouncements.length)
  }, [filteredAnnouncements, lastAnnouncementCount])

  const handleStoreSelection = (store: StoreInfo) => {
    setSelectedStoreId(store.storeId)
    setSelectedStoreName(store.storeName)
    setStoreSelectionDismissed(false)
    setStoreSelectionOpenedViaButton(false)
    localStorage.setItem("storeId", store.storeId.toString())
    localStorage.setItem("storeName", store.storeName)
    localStorage.removeItem("storeSelectionDismissed")
    setShowStoreSelection(false)
  }

  // Handle exit store
  const handleExitStore = () => {
    localStorage.removeItem("storeId")
    localStorage.removeItem("storeName")
    localStorage.removeItem("readAnnouncements")
    localStorage.removeItem("storeSelectionDismissed")
    setSelectedStoreId(null)
    setStoreSelectionDismissed(false)
    setReadAnnouncements(new Set())
    setShowStoreSelection(true)
    setShowAnnouncementsList(false)
    setCurrentNotification(null)
  }

  const markAsRead = (announcementId: number) => {
    const newReadAnnouncements = new Set(readAnnouncements)
    newReadAnnouncements.add(announcementId.toString())
    setReadAnnouncements(newReadAnnouncements)
    localStorage.setItem("readAnnouncements", JSON.stringify(Array.from(newReadAnnouncements)))
  }

  // Get store name by ID
  const getStoreName = (storeId: number) => {
    return selectedStoreName
  }

  // --- Preload and select female voice once ---
  useEffect(() => {
    const synth = window.speechSynthesis

    const loadVoices = () => {
      const voices = synth.getVoices()
      if (voices.length) {
        const fv = voices.find((v) => /female|woman|zira|susan|kathleen/i.test(v.name)) || voices[0]
        setFemaleVoice(fv)
      }
    }

    loadVoices()
    synth.onvoiceschanged = loadVoices

    return () => {
      synth.onvoiceschanged = null
    }
  }, [])

  const speakText = (text: string) => {
    if ("speechSynthesis" in window && femaleVoice) {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.voice = femaleVoice
      // Set speech rate: 1.0 for mobile, 1.4 for other devices
      utter.rate = isMobile ? 1.0 : 1.4
      window.speechSynthesis.speak(utter)
    }
  }

  const stopSpeech = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
  }

  const startCamera = async () => {
    try {
      // Use back camera on mobile, default camera on other devices
      const constraints = isMobile ? { video: { facingMode: "environment" } } : { video: true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (videoRef.current) videoRef.current.srcObject = stream
      setIsCameraOn(true)
      setSessionId(null)
      setApiResponse("Capturing image in 5 seconds...")
      speakText("Capturing image in five seconds. Please hold steady.")
      setCountdown(5)

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : null))
      }, 1000)

      captureTimeoutRef.current = setTimeout(captureImage, 5000)
    } catch {
      setPermissionError("Camera access denied.")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      ;(videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
    setSessionId(null)
    setCountdown(null)
    clearTimeout(captureTimeoutRef.current!)
    clearInterval(countdownIntervalRef.current!)
    setApiResponse("Camera off. You can ask general questions below.")
    speakText("Camera off.")
  }

  const toggleCamera = () => (isCameraOn ? stopCamera() : startCamera())

  const captureImage = async () => {
    if (!videoRef.current) return

    setIsProcessingImage(true)
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0)

    canvas.toBlob(async (blob) => {
      if (!blob) return

      const fd = new FormData()
      fd.append("file", blob, "capture.jpg")

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload_image`, {
          method: "POST",
          body: fd,
        })
        const data = await res.json()

        if (res.ok) {
          setSessionId(data.session_id)
          setApiResponse(data.response)
          speakText(data.response)
        }
      } catch {
        console.error("Image upload failed")
      } finally {
        setIsProcessingImage(false)
      }
    }, "image/jpeg")
  }

  const sendQuestion = async () => {
    if (!inputText.trim()) return

    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: inputText, session_id: sessionId }),
      })
      const data = await res.json()

      if (res.ok) {
        setApiResponse(data.response)
        speakText(data.response)
      }
    } catch {
      console.error("Chat error")
    } finally {
      setIsLoading(false)
      setInputText("")
    }
  }

  useEffect(
    () => () => {
      stopCamera()
      stopSpeech()
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
    },
    [],
  )

  const handleDismissStoreSelection = () => {
    setShowStoreSelection(false)
    if (!storeSelectionOpenedViaButton) {
      setStoreSelectionDismissed(true)
      localStorage.setItem("storeSelectionDismissed", "true")
    }
    setStoreSelectionOpenedViaButton(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Store Selection Dialog */}
      <Dialog
        open={showStoreSelection}
        onOpenChange={(open) => {
          if (!open) {
            handleDismissStoreSelection()
          }
        }}
      >
        <DialogContent className="bg-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Select Your Walmart Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">Please choose the Walmart store you are entering:</p>
            <StoreCombobox 
              selectedStoreId={selectedStoreId} 
              onSelectStore={handleStoreSelection}
              buttonClassName="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              className="w-full bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Top Notification Bar */}
      {currentNotification && selectedStoreId && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-4 shadow-lg">
          <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1">
              <h4 className="font-semibold">{currentNotification.title}</h4>
              <p className="text-sm opacity-90">{currentNotification.descrip || ""}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-blue-600 hover:bg-gray-100 shrink-0"
              onClick={() => {
                markAsRead(currentNotification.id)
                setCurrentNotification(null)
              }}
            >
              Mark as Read
            </Button>
          </div>
        </div>
      )}

      {/* Top Bar with Store Selection, Exit Store and Bell Button */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto">
          {/* Mobile Layout */}
          <div className="block lg:hidden">
            {/* Mobile Header with Dropdown Toggle */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Store Controls</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
                className="text-white hover:bg-gray-700"
              >
                <svg
                  className={`h-4 w-4 transition-transform ${isMobileDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            </div>

            {/* Collapsible Mobile Content */}
            {isMobileDropdownOpen && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedStoreId ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStoreSelectionOpenedViaButton(true)
                          setShowStoreSelection(true)
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                      >
                        Change Store
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExitStore}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                      >
                        Exit Store
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAnnouncementsList(!showAnnouncementsList)}
                        className="relative bg-gray-700 hover:bg-gray-600 border-gray-600"
                      >
                        {unreadAnnouncements.length > 0 ? (
                          <BellRing className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                        {unreadAnnouncements.length > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadAnnouncements.length}
                          </span>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStoreSelectionOpenedViaButton(true)
                        setShowStoreSelection(true)
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                    >
                      Add Store
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedStoreId ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStoreSelectionOpenedViaButton(true)
                          setShowStoreSelection(true)
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                      >
                        Change Store
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExitStore}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                      >
                        Exit Store
                      </Button>
                    </div>
                    <span className="text-gray-300">
                      Current Store: <span className="font-medium">{getStoreName(selectedStoreId)}</span>
                    </span>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStoreSelectionOpenedViaButton(true)
                      setShowStoreSelection(true)
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    Add Store
                  </Button>
                )}
              </div>
              {selectedStoreId && (
                <div className="flex items-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAnnouncementsList(!showAnnouncementsList)}
                    className="relative bg-gray-700 hover:bg-gray-600 border-gray-600"
                  >
                    {unreadAnnouncements.length > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    {unreadAnnouncements.length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadAnnouncements.length}
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      {showAnnouncementsList && selectedStoreId && (
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="container mx-auto">
            <h3 className="text-lg font-semibold mb-4">Store Announcements</h3>
            {filteredAnnouncements.length === 0 ? (
              <p className="text-gray-400">No announcements for this store.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {filteredAnnouncements
                  .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : 0))
                  .map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`p-3 rounded-lg border ${
                        readAnnouncements.has(announcement.id.toString())
                          ? "bg-gray-700 border-gray-600 opacity-60"
                          : "bg-blue-900/20 border-blue-600"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium">{announcement.title}</h4>
                          <p className="text-sm text-gray-300 mt-1">
                            {announcement.descrip || "No description available"}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {announcement.createdAt
                              ? new Date(announcement.createdAt).toLocaleString()
                              : "No date available"}
                          </p>
                        </div>
                        {!readAnnouncements.has(announcement.id.toString()) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsRead(announcement.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shrink-0"
                          >
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {permissionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{permissionError}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Camera Column */}
          <div className="flex flex-col gap-6">
            <Card className="overflow-hidden rounded-2xl bg-black relative">
              <CardContent className="p-0 relative">
                <div className="absolute top-4 left-4 z-10 flex space-x-2">
                  <Button
                    size="lg"
                    onClick={toggleCamera}
                    aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"}
                    className="rounded-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isCameraOn ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                  </Button>
                  <Button
                    size="lg"
                    className="rounded-full bg-red-600 hover:bg-red-700"
                    onClick={stopSpeech}
                    aria-label="Stop response"
                  >
                    <X className="h-5 w-5 text-white" />
                  </Button>
                </div>

                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
                    <div className="text-9xl font-bold text-white">{countdown}</div>
                  </div>
                )}

                {isProcessingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-20">
                    <Loader2 className="h-16 w-16 animate-spin text-white" />
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/5] bg-black object-cover"
                />
              </CardContent>
            </Card>
          </div>

          {/* Input & Response Column */}
          <div>
            <Card className="rounded-2xl h-full bg-gray-800/50">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Input Row */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
                      placeholder="Type your question here..."
                      className="w-full p-4 bg-gray-900/70 rounded-lg text-white"
                    />
                    {isLoading && <span className="text-gray-300 italic">Generating response…</span>}
                  </div>

                  {/* Response */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Response:</h3>
                    <div className="p-4 bg-blue-900/20 rounded-lg min-h-[150px]">
                      <p className="text-white whitespace-pre-wrap">{displayedResponse || "..."}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
