"use client"
import Link from "next/link"
import { Eye, Ear, Brain, ArrowRight } from "lucide-react"
import ThemeToggle from "@/components/theme-toggle"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
export default function Home() {

  return (
    <div className="min-h-screen gradient-bg dark:gradient-bg light:gradient-bg-light grid-pattern dark:grid-pattern light:grid-pattern-light">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-12">
          <div className="text-center mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-green-600 mb-4">
                Walmart Assist
            </h1>
            <p className="text-xl text-muted-foreground">Empowering Inclusive Shopping</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Main Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <Link href="/visually-impaired" className="block group">
            <Card className="h-full transition-all duration-300 hover:scale-105 modern-card dark:modern-card light:modern-card-light border-emerald-500/20 hover:border-emerald-500/40 glow-green">
              <CardHeader className="p-8">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center mb-6 floating">
                  <Eye className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-2xl text-white">Visually Impaired</CardTitle>
                <CardDescription className="text-emerald-200">Voice-guided shopping assistance</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <p className="text-gray-300">
                  Use voice commands to navigate the store and identify products. Our assistant will describe what's in
                  front of you.
                </p>
              </CardContent>
              <CardFooter className="p-8">
                <span className="text-emerald-400 font-medium group-hover:text-emerald-300 transition-colors">
                  Tap to start →
                </span>
              </CardFooter>
            </Card>
          </Link>

          <Link href="/hearing-impaired" className="block group">
            <Card className="h-full transition-all duration-300 hover:scale-105 modern-card dark:modern-card light:modern-card-light border-emerald-500/20 hover:border-emerald-500/40 glow-green">
              <CardHeader className="p-8">
                <div
                  className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center mb-6 floating"
                  style={{ animationDelay: "2s" }}
                >
                  <Ear className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-2xl text-white">Hearing Impaired</CardTitle>
                <CardDescription className="text-emerald-200">Text interpretation</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <p className="text-gray-300">
                  Type in the input box to communicate with our app. We'll interpret your questions and provide text responses.
                </p>
              </CardContent>
              <CardFooter className="p-8">
                <span className="text-emerald-400 font-medium group-hover:text-emerald-300 transition-colors">
                  Tap to start →
                </span>
              </CardFooter>
            </Card>
          </Link>

          <Link href="/neurodivergent" className="block group">
            <Card className="h-full transition-all duration-300 hover:scale-105 modern-card dark:modern-card light:modern-card-light border-emerald-500/20 hover:border-emerald-500/40 glow-green">
              <CardHeader className="p-8">
                <div
                  className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center mb-6 floating"
                  style={{ animationDelay: "4s" }}
                >
                  <Brain className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-2xl text-white">Neurodivergent</CardTitle>
                <CardDescription className="text-emerald-200">Focused shopping experience</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <p className="text-gray-300">
                  Create shopping lists with reminders and request quiet shopping times for a distraction-free
                  experience.
                </p>
              </CardContent>
              <CardFooter className="p-8">
                <span className="text-emerald-400 font-medium group-hover:text-emerald-300 transition-colors">
                  Tap to start →
                </span>
              </CardFooter>
            </Card>
          </Link>
        </div>

        {/* How It Works Section */}
        <div className="space-y-20">
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">See It In Action</h2>
            <p className="text-xl text-emerald-200 max-w-3xl mx-auto">
              Explore the intuitive interface and powerful features that make Walmart Assist the best choice for
              accessible shopping experiences.
            </p>
          </div>

          {/* Voice-Guided Shopping */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-white">Voice-Guided Shopping</h3>
              <p className="text-lg text-emerald-200 leading-relaxed">
                Get a complete overview of your shopping experience with our comprehensive voice assistant. Navigate the
                store hands-free and identify products with ease.
              </p>
              <ul className="space-y-4 text-emerald-200">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  Real-time camera analysis with audio descriptions
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  Voice commands for navigation and product identification
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  Hands-free shopping experience
                </li>
              </ul>
              <Button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white">
                Try Voice Assistant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="rounded-2xl aspect-[4/3] flex items-center justify-center border-2 border-green-700">
              <img
                  src="/visuallyimpaired.png"
                  alt="Descriptive alt text"
                  className="w-full h-full object-cover rounded-2xl "
                />
            </div>
          </div>

          {/* Text Language Support */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="rounded-2xl aspect-[4/3] flex items-center justify-center border-2 border-green-700">
              <img
                  src="/hearingimpaired.png"
                  alt="Descriptive alt text"
                  className="w-full h-full object-cover rounded-2xl "
                />
            </div>
            <div className="space-y-6 lg:order-2">
              <h3 className="text-3xl md:text-4xl font-bold text-white">Text-based Language Interpretation</h3>
              <p className="text-lg text-emerald-200 leading-relaxed">
                Type in the input box to communicate with our app. We'll interpret your questions and provide text responses.
              </p>
              <ul className="space-y-4 text-emerald-200">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  Real-time sign language to text conversion
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  Visual product identification and guidance
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  Clear text-based responses and feedback
                </li>
              </ul>
              <Button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white">
                Try Text Interpretation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Focused Shopping */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-white">Focused Shopping Experience</h3>
              <p className="text-lg text-emerald-200 leading-relaxed">
                Manage your shopping efficiently with organized lists, timely reminders, and the ability to request
                quiet shopping times for a distraction-free experience.
              </p>
              <ul className="space-y-4 text-emerald-200">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  Smart shopping lists with emoji support
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  Timer-based reminders for each item
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  Quiet time requests for sensory-friendly shopping
                </li>
              </ul>
              <Button className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white">
                Create Shopping List
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="rounded-2xl aspect-[4/3] flex items-center justify-center border-2 border-green-700">
              <img
                  src="/neurodivergent.png"
                  alt="Descriptive alt text"
                  className="w-full h-full object-cover rounded-2xl "
                />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
