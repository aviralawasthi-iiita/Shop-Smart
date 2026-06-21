"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Mic, MicOff, Camera, CameraOff, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StoreCombobox, StoreInfo } from "@/components/store-combobox"

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
    return () => { cancelled = true }
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

export default function VisuallyImpairedClient() {
  type AppState =
    | "idle"
    | "awaiting_capture"
    | "processing_image"
    | "image_session_active"
    | "general_listening"
    | "processing_chat"

  const [appState, setAppState] = useState<AppState>("idle")
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [apiResponse, setApiResponse] = useState(
    "Welcome! Tap the screen or the camera button to begin."
  )
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [femaleVoice, setFemaleVoice] = useState<SpeechSynthesisVoice | null>(null)

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [selectedStoreName, setSelectedStoreName] = useState<string>("Unknown Store")
  const [showStoreSelection, setShowStoreSelection] = useState(false)
  const [storeSelectionDismissed, setStoreSelectionDismissed] = useState(false)

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

  // --- Text to Speech with female voice & fallback ---
  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
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
  }

  // --- Backup: speak on every apiResponse change ---
  useEffect(() => {
    speakText(apiResponse)
  }, [apiResponse])

  // --- Stop speech immediately ---
  const stopSpeech = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
  }

  // --- Microphone controls ---
  const startMicrophone = () => {
    if (recogRef.current && !isProcessingApiCall.current && !isMicOn) {
      recogRef.current.start()
    }
  }
  const stopMicrophone = () => {
    if (recogRef.current && isMicOn) {
      recogRef.current.stop()
    }
  }
  const toggleMicrophone = () => {
    isMicOn ? stopMicrophone() : startMicrophone()
  }

  // --- Image capture & API ---
  const captureAndSendImage = async () => {
    if (!videoRef.current) return
    setAppState("processing_image")
    setApiResponse("Capturing image, please wait.")
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0)
    canvas.toBlob(
      async (blob) => {
        if (!blob) return
        const formData = new FormData()
        formData.append("file", blob, "capture.jpg")
        isProcessingApiCall.current = true
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/upload_image`, {
            method: "POST",
            body: formData,
          })
          const data = await res.json()
          if (res.ok) {
            setSessionId(data.session_id)
            setApiResponse(data.response)
            setAppState("image_session_active")
          } else throw new Error(data.detail)
        } catch (e) {
          console.error(e)
          setApiResponse("Sorry, I couldn't analyze the image.")
        } finally {
          isProcessingApiCall.current = false
        }
      },
      "image/jpeg"
    )
  }

  // --- Follow-up (manual mic) ---
  const handleFollowUpQuestion = async (text: string) => {
    setTranscript(text)
    setAppState("processing_chat")
    isProcessingApiCall.current = true
    stopMicrophone()
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, session_id: sessionId }),
      })
      const data = await res.json()
      if (res.ok) {
        setApiResponse(data.response)
        setTimeout(() => speakText(data.response), 100)
        setAppState(isCameraOn ? "image_session_active" : "general_listening")
      } else throw new Error(data.detail)
    } catch (e) {
      console.error(e)
      setApiResponse("Sorry, something went wrong.")
    } finally {
      isProcessingApiCall.current = false
    }
  }

  // --- Camera controls ---
  const startCamera = async () => {
    try {
      const constraints = isMobile ? { video: { facingMode: 'environment' } } : { video: true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (videoRef.current) videoRef.current.srcObject = stream
      setIsCameraOn(true)
      setSessionId(null)
      setApiResponse("Camera started. Capturing image in 5 seconds.")
      setAppState("awaiting_capture")
    } catch {
      setPermissionError("Camera access denied.")
    }
  }
  const stopCamera = () => {
    if (videoRef.current?.srcObject)
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop())
    setIsCameraOn(false)
    setSessionId(null)
    setApiResponse("Camera off.")
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

  // --- Capture countdown ---
  useEffect(() => {
    if (appState === "awaiting_capture") {
      setCountdown(5)
      countdownIntervalRef.current = setInterval(
        () =>
          setCountdown((prev) => (prev && prev > 1 ? prev - 1 : null)),
        1000
      )
      captureTimeoutRef.current = setTimeout(
        captureAndSendImage,
        5000
      )
    } else {
      clearTimeout(captureTimeoutRef.current!)
      clearInterval(countdownIntervalRef.current!)
      setCountdown(null)
    }
  }, [appState])

  // --- Cleanup on unmount ---
  useEffect(
    () => () => {
      stopCamera()
      stopMicrophone()
      window.speechSynthesis.cancel()
    },
    []
  )

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

      {/* Top Bar for Store Settings */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <span className="text-gray-300">
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
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
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
                    onClick={toggleCamera}
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
                  <Button
                    size="lg"
                    className="rounded-full bg-gray-600 hover:bg-gray-700"
                    onClick={toggleMicrophone}
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
                    className="rounded-full bg-red-600 hover:bg-red-700"
                    onClick={stopSpeech}
                    aria-label="Stop response"
                  >
                    <X className="h-5 w-5 text-white" />
                  </Button>
                </div>

                {countdown !== null && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
                    <div className="text-9xl font-bold text-white drop-shadow-lg">
                      {countdown}
                    </div>
                  </div>
                )}

                {(appState === "processing_image" ||
                  appState === "processing_chat") && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-20">
                    <Loader2 className="h-24 w-24 animate-spin text-white" />
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
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      You said:
                    </h3>
                    <div className="p-4 bg-gray-900/70 rounded-lg min-h-[50px]">
                      <p className="text-gray-200">{transcript || "..."}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">
                      Assistant:
                    </h3>
                    <div className="p-4 bg-blue-900/20 rounded-lg min-h-[150px]">
                      <p className="text-white whitespace-pre-wrap">
                        {displayedResponse || "..."}
                      </p>
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