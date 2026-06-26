"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Mic, MicOff, Camera, CameraOff, Loader2, X, ArrowLeft, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StoreCombobox, StoreInfo } from "@/components/store-combobox"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// --- Custom Hook for Typewriter Effect ---
const useTypewriter = (text: string, speed = 50) => {
  const [displayText, setDisplayText] = useState("")

  useEffect(() => {
    let cancelled = false
    
    setDisplayText((prev) => text.startsWith(prev) ? prev : "")

    const interval = setInterval(() => {
      setDisplayText((current) => {
        if (current.length < text.length && text.startsWith(current)) {
          return text.slice(0, current.length + 1)
        }
        if (!text.startsWith(current)) {
          return ""
        }
        return current
      })
    }, speed)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [text, speed])
  
  return displayText
}

// --- SpeechRecognition Interface ---
interface ISpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((this: ISpeechRecognition, ev: any) => any) | null
  onerror: ((this: ISpeechRecognition, ev: any) => any) | null
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: { new(): ISpeechRecognition }
    webkitSpeechRecognition: { new(): ISpeechRecognition }
  }
}

export default function CustomerClient() {
  type AppState =
    | "idle"
    | "awaiting_capture"
    | "processing_image"
    | "image_session_active"
    | "general_listening"
    | "processing_chat"

  const [appState, setAppState] = useState<AppState>("idle")
  const [isCameraOn, setIsCameraOn] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const [isMicOn, setIsMicOn] = useState(false)
  const [inputText, setInputText] = useState("")
  const [chatMode, setChatMode] = useState<"follow_up" | "new_chat">("new_chat")
  const [isTtsEnabled, setIsTtsEnabled] = useState(true)
  const ttsEnabledRef = useRef(true)

  const toggleTts = () => {
    setIsTtsEnabled(prev => {
      const next = !prev;
      ttsEnabledRef.current = next;
      if (!next && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
      return next;
    })
  }

  const [apiResponse, setApiResponse] = useState(
    "Welcome! Tap the screen, use the chat, or open the camera to begin."
  )
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [femaleVoice, setFemaleVoice] = useState<SpeechSynthesisVoice | null>(null)

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [selectedStoreName, setSelectedStoreName] = useState<string>("Unknown Store")
  const [showStoreSelection, setShowStoreSelection] = useState(false)
  const [storeSelectionDismissed, setStoreSelectionDismissed] = useState(false)

  // Complaint form state
  const [showComplaintDialog, setShowComplaintDialog] = useState(false)
  const [complaintText, setComplaintText] = useState("")
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false)
  const [complaintSuccessMessage, setComplaintSuccessMessage] = useState("")

  const handleSubmitComplaint = async () => {
    if (!complaintText.trim() || !selectedStoreId) return
    setIsSubmittingComplaint(true)
    setComplaintSuccessMessage("")
    try {
      const res = await fetch("/api/customer/complaint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: selectedStoreId,
          complaint: complaintText.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setComplaintSuccessMessage("Your complaint has been submitted successfully to the store manager.")
        setComplaintText("")
        speakText("Complaint submitted successfully.")
        setTimeout(() => {
          setShowComplaintDialog(false)
          setComplaintSuccessMessage("")
        }, 2000)
      } else {
        throw new Error(data.error || "Failed to submit complaint")
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmittingComplaint(false)
    }
  }

  // Recent announcements state
  const [showRecentAnnouncementsDialog, setShowRecentAnnouncementsDialog] = useState(false)
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([])
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false)

  const handleShowRecentAnnouncements = async () => {
    if (!selectedStoreId) return
    setShowRecentAnnouncementsDialog(true)
    setIsLoadingAnnouncements(true)
    try {
      const res = await fetch(`/api/customer/announcements/recent?storeId=${selectedStoreId}`)
      const data = await res.json()
      if (res.ok) {
        setRecentAnnouncements(data.announcements || [])
      } else {
        console.error("Failed to fetch recent announcements:", data.error)
      }
    } catch (err) {
      console.error("Error fetching announcements:", err)
    } finally {
      setIsLoadingAnnouncements(false)
    }
  }

  // Live Store Announcements state & listener
  const [activeAnnouncement, setActiveAnnouncement] = useState<{
    id: number
    title: string
    descrip?: string
  } | null>(null)

  useEffect(() => {
    if (!selectedStoreId) return

    const eventSource = new EventSource(`/api/customer/announcements/sse?storeId=${selectedStoreId}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setActiveAnnouncement(data)
        speakText(`Attention: New store announcement. ${data.title}. ${data.descrip || ""}`)

        // Dismiss the announcement banner after 10 seconds
        const timer = setTimeout(() => {
          setActiveAnnouncement(null)
        }, 10000)

        return () => clearTimeout(timer)
      } catch (err) {
        console.error("Error parsing SSE announcement message:", err)
      }
    }

    eventSource.onerror = (err) => {
      console.error("SSE EventSource error, closing stream:", err)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [selectedStoreId])

  // Initialize store selection
  useEffect(() => {
    const storedStoreId = localStorage.getItem("storeId")
    const storedStoreName = localStorage.getItem("storeName")
    const storedDismissed = localStorage.getItem("storeSelectionDismissed")

    if (storedStoreId) {
      setSelectedStoreId(Number.parseInt(storedStoreId))
      if (storedStoreName) setSelectedStoreName(storedStoreName)
    } else if (storedDismissed === "true") {
      setStoreSelectionDismissed(true)
    } else {
      setShowStoreSelection(true)
    }
  }, [])

  const handleStoreSelection = (store: StoreInfo) => {
    setSelectedStoreId(store.storeId)
    setSelectedStoreName(store.storeName)
    setStoreSelectionDismissed(false)
    localStorage.setItem("storeId", store.storeId.toString())
    localStorage.setItem("storeName", store.storeName)
    localStorage.removeItem("storeSelectionDismissed")
    setShowStoreSelection(false)
    speakText(`Store changed to ${store.storeName}`)
  }

  const handleDismissStoreSelection = () => {
    setShowStoreSelection(false)
    setStoreSelectionDismissed(true)
    localStorage.setItem("storeSelectionDismissed", "true")
  }

  const videoRef = useRef<HTMLVideoElement>(null)
  const recogRef = useRef<ISpeechRecognition | null>(null)
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingApiCall = useRef(false)

  const displayedResponse = useTypewriter(apiResponse)

  const isMobile = useMemo(() => /Mobi|Android/i.test(navigator.userAgent), [])

  // --- Preload and select female voice once ---
  useEffect(() => {
    const synth = window.speechSynthesis
    const loadVoices = () => {
      const voices = synth.getVoices()
      if (voices.length) {
        const fv =
          voices.find((v) =>
            /female|woman|zira|susan|kathleen/i.test(v.name)
          ) || voices[0]
        setFemaleVoice(fv)
      }
    }
    loadVoices()
    synth.onvoiceschanged = loadVoices
    return () => {
      synth.onvoiceschanged = null
    }
  }, [])

  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window) || !ttsEnabledRef.current) {
        resolve()
        return
      }
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)

      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()

      utterance.voice =
        femaleVoice ||
        window.speechSynthesis
          .getVoices()
          .find((v) =>
            /female|woman|zira|susan|kathleen/i.test(v.name)
          ) ||
        window.speechSynthesis.getVoices()[0]
      utterance.rate = isMobile ? 1.0 : 1.4 // 1.0 for mobile, 1.4 for others
      utterance.pitch = 1
      utterance.volume = 1
      window.speechSynthesis.speak(utterance)
    })
  }

  // --- Stop speech immediately ---
  const stopSpeech = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
  }

  // --- Microphone controls ---
  const startMicrophone = () => {
    if (recogRef.current && !isProcessingApiCall.current && !isMicOn) {
      try {
        recogRef.current.start()
        toast.success("Microphone on. Listening...")
        speakText("Microphone on.")
      } catch (e) {
        console.error(e)
      }
    }
  }
  const stopMicrophone = () => {
    if (recogRef.current && isMicOn) {
      try {
        recogRef.current.stop()
        toast.info("Microphone off.")
        speakText("Microphone off.")
      } catch (e) {
        console.error(e)
      }
    }
  }
  const toggleMicrophone = () => {
    isMicOn ? stopMicrophone() : startMicrophone()
  }

  const startCaptureCountdown = () => {
    if (!videoRef.current || appState === "awaiting_capture") return
    setAppState("awaiting_capture")
    setCountdown(3)

    let counter = 3
    const interval = setInterval(() => {
      counter -= 1
      if (counter > 0) {
        setCountdown(counter)
      } else {
        clearInterval(interval)
        setCountdown(null)
        captureAndSendImage()
      }
    }, 1000)
  }

  // --- Image capture & API ---
  const captureAndSendImage = async () => {
    if (!videoRef.current) return
    setAppState("processing_image")
    setApiResponse("Analyzing image...")
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0)
    canvas.toBlob(
      async (blob) => {
        if (!blob) return
        isProcessingApiCall.current = true
        try {
          const base64Image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          // Step 1: Analyze Image
          const formData = new FormData()
          formData.append("image", blob, "capture.jpg")
          formData.append("storeId", selectedStoreId?.toString() || "0")

          const analyzeRes = await fetch(`/api/ai/analyze-image`, {
            method: "POST",
            body: formData,
          })
          const analyzeData = await analyzeRes.json()
          if (!analyzeRes.ok) throw new Error(analyzeData.detail)

          let intermediateText = "";
          if (analyzeData.searchTerms && analyzeData.searchTerms.length > 0) {
            intermediateText = `I have analysed the product and it is likely "${analyzeData.searchTerms.join(", ")}".`;
          } else {
            intermediateText = `I have analysed the product but could not match it to our inventory.`;
          }

          setApiResponse(intermediateText)
          const speechPromise = speakText(intermediateText);

          // Step 2: Final Answer
          const userQuery = `The user showed an image of "${analyzeData.searchTerms?.join(", ") || "an unknown product"}". Please tell them if we have it in stock, its price, and if there are any cheaper alternatives based on the inventory context provided.`;

          const answerRes = await fetch(`/api/chat/answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question: userQuery,
              session_id: sessionId,
              storeId: selectedStoreId,
              isProductQuery: true,
              searchTerms: analyzeData.searchTerms || [],
              base64Image: base64Image
            }),
          })
          const answerData = await answerRes.json()
          if (!answerRes.ok) throw new Error(answerData.detail)

          await speechPromise; // Wait for the first message to finish speaking

          setSessionId(answerData.session_id)
          if (chatMode === "new_chat") setChatMode("follow_up")
          const finalFullText = intermediateText + "\n\n" + answerData.response;
          setApiResponse(finalFullText)
          speakText(answerData.response) // Speak the final part

          setAppState("image_session_active")
        } catch (e) {
          console.error(e)
          const errorMsg = "Sorry, I couldn't analyze the image.";
          setApiResponse(errorMsg)
          speakText(errorMsg)
          setAppState("image_session_active")
        } finally {
          isProcessingApiCall.current = false
        }
      },
      "image/jpeg"
    )
  }

  const handleFollowUpQuestion = async (text: string) => {
    if (!text.trim()) return
    setInputText("") // Clear the text in the input box
    
    let currentSessionId = chatMode === "follow_up" ? sessionId : null;

    setApiResponse("Thinking...")
    setAppState("processing_chat")
    isProcessingApiCall.current = true
    stopMicrophone()
    try {
      // Step 1: Analyze Intent
      const analyzeRes = await fetch(`/api/chat/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, storeId: selectedStoreId, session_id: currentSessionId }),
      })
      const analyzeData = await analyzeRes.json()
      if (!analyzeRes.ok) throw new Error(analyzeData.detail)

      let intermediateText = "";
      if (analyzeData.isProductQuery && analyzeData.searchTerms && analyzeData.searchTerms.length > 0) {
        intermediateText = `I have analysed your query and you are asking about "${analyzeData.searchTerms.join(', ')}".`;
      }

      let speechPromise = Promise.resolve();
      if (intermediateText) {
        setApiResponse(intermediateText);
        speechPromise = speakText(intermediateText);
      } else {
        setApiResponse("Thinking...");
      }

      const answerRes = await fetch(`/api/chat/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          session_id: currentSessionId,
          storeId: selectedStoreId,
          isProductQuery: analyzeData.isProductQuery,
          searchTerms: analyzeData.searchTerms
        }),
      })
      const answerData = await answerRes.json()
      if (!answerRes.ok) throw new Error(answerData.detail)

      await speechPromise; // Wait for the first message to finish

      if (answerData.session_id) setSessionId(answerData.session_id);
      if (chatMode === "new_chat") setChatMode("follow_up");

      const finalFullText = intermediateText ? intermediateText + "\n\n" + answerData.response : answerData.response;
      setApiResponse(finalFullText);

      speakText(answerData.response);

      setAppState(isCameraOn ? "image_session_active" : "general_listening")
    } catch (e) {
      console.error(e)
      const errorMsg = "Sorry, something went wrong. Please try again.";
      setApiResponse(errorMsg)
      speakText(errorMsg)
    } finally {
      isProcessingApiCall.current = false
    }
  }

  // --- Camera controls ---
  const startCamera = async () => {
    try {
      const constraints = isMobile ? { video: { facingMode: 'environment' } } : { video: true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setIsCameraOn(true)
      setSessionId(null)
      toast.success("Camera started. Click 'Capture Photo' to analyze.")
      speakText("Camera started.")
      setAppState("image_session_active")
    } catch {
      setPermissionError("Camera access denied.")
      speakText("Camera access denied.")
    }
  }
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
    }
    setIsCameraOn(false)
    setSessionId(null)
    toast.info("Camera off.")
    speakText("Camera off.")
    setAppState("general_listening")
  }
  const toggleCamera = () => {
    isCameraOn ? stopCamera() : startCamera()
  }

  // --- Setup SpeechRecognition ---
  useEffect(() => {
    const SpeechRec =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRec) {
      setPermissionError("SpeechRecognition not supported.")
      return
    }
    const recog = new SpeechRec()
    recog.continuous = false
    recog.interimResults = false
    recog.lang = "en-US"
    recog.onstart = () => setIsMicOn(true)
    recog.onend = () => setIsMicOn(false)
    recog.onresult = (ev) =>
      handleFollowUpQuestion(ev.results[0][0].transcript)
    recog.onerror = (err) => err.error !== "no-speech" && console.error(err)
    recogRef.current = recog
  }, [])


  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
      }
      if (recogRef.current) {
        recogRef.current.stop()
      }
      window.speechSynthesis.cancel()
    }
  }, [])

  return (
    <div
      className="min-h-screen bg-gray-900 text-white"
      onClick={appState === "idle" && !showStoreSelection ? toggleCamera : undefined}
    >
      {/* Store Selection Dialog */}
      <Dialog
        open={showStoreSelection}
        onOpenChange={(open) => {
          if (!open) handleDismissStoreSelection()
        }}
      >
        <DialogContent className="bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>Select Your Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">Please choose the store you are entering:</p>
            <StoreCombobox
              selectedStoreId={selectedStoreId}
              onSelectStore={handleStoreSelection}
              buttonClassName="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              className="w-full bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Complaint Dialog */}
      <Dialog
        open={showComplaintDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowComplaintDialog(false)
            setComplaintSuccessMessage("")
          }
        }}
      >
        <DialogContent className="bg-gray-800 text-white border-gray-700" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>File a Store Complaint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {complaintSuccessMessage ? (
              <Alert className="bg-green-900/30 border-green-700 text-green-200">
                <AlertDescription>{complaintSuccessMessage}</AlertDescription>
              </Alert>
            ) : (
              <>
                <p className="text-sm text-gray-300">
                  Please details your complaint for <span className="font-bold text-white">{selectedStoreName}</span>.
                  The store manager will review it.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="complaintText">Complaint Details *</Label>
                  <Textarea
                    id="complaintText"
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    placeholder="Describe your complaint here..."
                    rows={4}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowComplaintDialog(false)}
                    disabled={isSubmittingComplaint}
                    className="bg-transparent border-gray-600 text-gray-200 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitComplaint}
                    disabled={!complaintText.trim() || isSubmittingComplaint}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600 flex items-center gap-2"
                  >
                    {isSubmittingComplaint && <Loader2 className="h-4 w-4 animate-spin" />}
                    Submit Complaint
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Announcements Dialog */}
      <Dialog
        open={showRecentAnnouncementsDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowRecentAnnouncementsDialog(false)
          }
        }}
      >
        <DialogContent className="bg-gray-800 text-white border-gray-700 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Recent Announcements</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-[300px]">
            {isLoadingAnnouncements ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : recentAnnouncements.length === 0 ? (
              <p className="text-gray-400 text-center mt-8">No recent announcements.</p>
            ) : (
              recentAnnouncements.map((announcement) => (
                <div key={announcement.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <h4 className="font-bold text-lg">{announcement.title}</h4>
                  {announcement.descrip && <p className="text-gray-300 mt-1">{announcement.descrip}</p>}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(announcement.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={() => setShowRecentAnnouncementsDialog(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top Bar for Store Settings */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-gray-300 text-sm sm:text-base">
              Store: <span className="font-medium text-white">{selectedStoreId ? selectedStoreName : "None Selected"}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setShowStoreSelection(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
            >
              {selectedStoreId ? "Change Store" : "Select Store"}
            </Button>
            {selectedStoreId && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleShowRecentAnnouncements()
                }}
                className="bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600"
              >
                Recent Announcements
              </Button>
            )}
            {selectedStoreId && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowComplaintDialog(true)
                }}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                File a Complaint
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {activeAnnouncement && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-xl shadow-lg border border-emerald-500 mb-6 animate-pulse" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider bg-emerald-800 px-2 py-0.5 rounded">Store Announcement</span>
                <h4 className="text-lg font-bold mt-1 text-white">{activeAnnouncement.title}</h4>
                {activeAnnouncement.descrip && <p className="text-sm mt-1 text-emerald-100">{activeAnnouncement.descrip}</p>}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setActiveAnnouncement(null); }}
                className="text-white hover:bg-emerald-800/50 p-1 h-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {permissionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{permissionError}</AlertDescription>
          </Alert>
        )}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <Card className="overflow-hidden rounded-2xl bg-black relative">
              <CardContent className="p-0 relative">
                <div className="absolute top-4 left-4 z-10 flex space-x-2">
                  <Button
                    size="lg"
                    className="rounded-full bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                    aria-label={
                      isCameraOn ? "Turn camera off" : "Turn camera on"
                    }
                  >
                    {isCameraOn ? (
                      <CameraOff className="h-5 w-5" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </Button>
                  {isCameraOn && (
                    <Button
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 rounded-full"
                      onClick={(e) => { e.stopPropagation(); startCaptureCountdown(); }}
                      disabled={appState === "processing_image" || appState === "awaiting_capture"}
                    >
                      Capture Photo
                    </Button>
                  )}
                  <Button
                    size="lg"
                    className="rounded-full bg-gray-600 hover:bg-gray-700"
                    onClick={(e) => { e.stopPropagation(); toggleMicrophone(); }}
                    aria-label={isMicOn ? "Mute mic" : "Unmute mic"}
                  >
                    {isMicOn ? (
                      <Mic className="h-5 w-5 text-green-400" />
                    ) : (
                      <MicOff className="h-5 w-5 text-red-400" />
                    )}
                  </Button>
                  <Button
                    size="lg"
                    className="rounded-full bg-gray-600 hover:bg-gray-700"
                    onClick={(e) => { e.stopPropagation(); toggleTts(); }}
                    aria-label={isTtsEnabled ? "Mute TTS" : "Unmute TTS"}
                  >
                    {isTtsEnabled ? (
                      <Volume2 className="h-5 w-5 text-blue-400" />
                    ) : (
                      <VolumeX className="h-5 w-5 text-red-400" />
                    )}
                  </Button>

                </div>



                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
                    <span className="text-white text-9xl font-bold drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{countdown}</span>
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

          <div className="flex flex-col gap-6">
            <Card className="rounded-2xl h-full bg-gray-800/50">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center justify-between">
                      <span>Assistant:</span>
                      {isProcessingApiCall.current && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                    </h3>
                    <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg min-h-[150px] shadow-inner">
                      <p className="text-white whitespace-pre-wrap leading-relaxed text-lg">
                        {displayedResponse || "..."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 relative">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      Your Question:
                    </h3>
                    <div className="flex items-center space-x-3 relative">
                      <Select value={chatMode} onValueChange={(val: any) => setChatMode(val)}>
                        <SelectTrigger className="w-[140px] bg-gray-900 border-gray-700 text-white rounded-lg h-[58px]">
                          <SelectValue placeholder="Mode" />
                        </SelectTrigger>
                        <SelectContent side="top" className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                          <SelectItem value="new_chat">New Chat</SelectItem>
                        </SelectContent>
                      </Select>
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleFollowUpQuestion(inputText)}
                        placeholder="Type here or use the microphone..."
                        className="w-full p-4 pl-4 pr-12 bg-gray-900/90 border border-gray-700 rounded-lg text-white shadow-inner focus:outline-none focus:border-blue-500 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          (e.target as HTMLInputElement).select();
                        }}
                        disabled={isProcessingApiCall.current}
                      />
                      {isMicOn && (
                        <div className="absolute right-4 animate-pulse">
                          <Mic className="h-5 w-5 text-green-400" />
                        </div>
                      )}
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