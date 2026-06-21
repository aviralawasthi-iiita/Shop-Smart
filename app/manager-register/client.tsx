"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Navigation } from "lucide-react"
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api"

export default function ManagerRegisterClient() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [storeName, setStoreName] = useState("")
  const [storeLocation, setStoreLocation] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  })

  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 })
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null)

  const fetchFallbackAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      const data = await res.json()
      if (data && data.display_name) {
        setStoreLocation(data.display_name)
      } else {
        setStoreLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      }
    } catch (e) {
      setStoreLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    }
  }

  const reverseGeocode = (pos: { lat: number; lng: number }) => {
    if (!window.google) {
      fetchFallbackAddress(pos.lat, pos.lng)
      return
    }
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: pos }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        setStoreLocation(results[0].formatted_address)
      } else {
        // Fallback to OpenStreetMap if the API key is missing or geocoding fails
        fetchFallbackAddress(pos.lat, pos.lng)
      }
    })
  }

  const handleGetLiveLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setMapCenter(pos)
          setMarkerPos(pos)
          reverseGeocode(pos)
        },
        (err) => {
          console.error("Error getting location:", err)
          setError("Could not get your live location. Please check browser permissions.")
        }
      )
    } else {
      setError("Geolocation is not supported by this browser.")
    }
  }

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      setMarkerPos(pos)
      reverseGeocode(pos)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to send OTP")
      }

      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/manager/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerEmail: email, managerPassword: password, storeName, storeLocation, otp }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to register")
      }

      // Success, redirect to manager dashboard/login
      router.push("/manager-login")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Manager Registration</CardTitle>
        <CardDescription>
          {step === 1 ? "Create your store manager account" : "Enter the verification code sent to your email"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Manager Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@walmart.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Walmart Neighborhood Market"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeLocation">Store Location</Label>
              <div className="flex gap-2">
                <Input
                  id="storeLocation"
                  value={storeLocation}
                  onChange={(e) => setStoreLocation(e.target.value)}
                  placeholder="Click map or use live location"
                  required
                />
                <Button type="button" variant="outline" onClick={handleGetLiveLocation}>
                  <Navigation className="h-4 w-4 mr-2" /> Live
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Search by typing or select directly on the map below.</p>
              {isLoaded ? (
                <div className="h-[200px] w-full rounded-md overflow-hidden border mt-2">
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={mapCenter}
                    zoom={markerPos ? 15 : 4}
                    onClick={handleMapClick}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                    }}
                  >
                    {markerPos && <Marker position={markerPos} />}
                  </GoogleMap>
                </div>
              ) : (
                <div className="h-[200px] w-full rounded-md border mt-2 flex items-center justify-center bg-muted text-muted-foreground">
                  Loading map...
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Verification Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">6-Digit Code</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Check your server console for the simulated email code!
              </p>
            </div>
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={loading}>
              {loading ? "Registering..." : "Complete Registration"}
            </Button>
            <Button type="button" variant="outline" className="w-full mt-2" onClick={() => setStep(1)} disabled={loading}>
              Back
            </Button>
          </form>
        )}
      </CardContent>
      {step === 1 && (
        <CardFooter className="flex justify-center border-t p-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/manager-login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      )}
    </Card>
  )
}
