"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Key, Save, Eye, EyeOff } from "lucide-react"

export default function SettingsPage() {
  const [openaiKey, setOpenaiKey] = useState("")
  const [elevenlabsKey, setElevenlabsKey] = useState("")
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showElevenlabsKey, setShowElevenlabsKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Load saved keys from localStorage
    const savedOpenaiKey = localStorage.getItem("voiceloop_openai_key") || ""
    const savedElevenlabsKey = localStorage.getItem("voiceloop_elevenlabs_key") || ""
    setOpenaiKey(savedOpenaiKey)
    setElevenlabsKey(savedElevenlabsKey)
  }, [])

  const handleSave = () => {
    localStorage.setItem("voiceloop_openai_key", openaiKey)
    localStorage.setItem("voiceloop_elevenlabs_key", elevenlabsKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const maskKey = (key: string) => {
    if (!key) return ""
    return key.slice(0, 8) + "..." + key.slice(-4)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-thin border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/images/voiceloop-logo.png" alt="VoiceLoop" width={40} height={40} className="rounded-lg" />
              <span className="text-xl font-light text-foreground">VoiceLoop</span>
            </div>
            <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Settings Content */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-light text-foreground mb-2">API Settings</h1>
            <p className="text-muted-foreground font-light">
              Configure your API keys to enable AI processing and voice features
            </p>
          </div>

          <div className="space-y-6">
            {/* OpenAI API Key */}
            <Card className="p-6 border-thin">
              <div className="flex items-center gap-3 mb-4">
                <Key className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-light">OpenAI API Key</h2>
              </div>
              <p className="text-sm text-muted-foreground font-light mb-4">
                Required for document summarization (GPT-4) and audio transcription (Whisper)
              </p>

              <div className="space-y-3">
                <Label htmlFor="openai-key" className="text-sm font-light">
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    id="openai-key"
                    type={showOpenaiKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  >
                    {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {openaiKey && !showOpenaiKey && (
                  <p className="text-xs text-muted-foreground font-mono">Current: {maskKey(openaiKey)}</p>
                )}
              </div>
            </Card>

            {/* ElevenLabs API Key */}
            <Card className="p-6 border-thin">
              <div className="flex items-center gap-3 mb-4">
                <Key className="h-5 w-5 text-secondary" />
                <h2 className="text-xl font-light">ElevenLabs API Key</h2>
              </div>
              <p className="text-sm text-muted-foreground font-light mb-4">
                Required for high-quality text-to-speech and voice responses
              </p>

              <div className="space-y-3">
                <Label htmlFor="elevenlabs-key" className="text-sm font-light">
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    id="elevenlabs-key"
                    type={showElevenlabsKey ? "text" : "password"}
                    placeholder="sk_..."
                    value={elevenlabsKey}
                    onChange={(e) => setElevenlabsKey(e.target.value)}
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowElevenlabsKey(!showElevenlabsKey)}
                  >
                    {showElevenlabsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {elevenlabsKey && !showElevenlabsKey && (
                  <p className="text-xs text-muted-foreground font-mono">Current: {maskKey(elevenlabsKey)}</p>
                )}
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} className="font-light px-8" disabled={!openaiKey && !elevenlabsKey}>
                <Save className="mr-2 h-4 w-4" />
                {saved ? "Saved!" : "Save Settings"}
              </Button>
            </div>

            {/* Info Card */}
            <Card className="p-6 border-thin bg-muted/30">
              <h3 className="text-lg font-light mb-3">Security Notice</h3>
              <div className="space-y-2 text-sm text-muted-foreground font-light">
                <p>• API keys are stored locally in your browser and never sent to our servers</p>
                <p>• Keys are used only for direct API calls to OpenAI and ElevenLabs</p>
                <p>• You can clear your keys anytime by clearing browser data</p>
                <p>
                  • Get your OpenAI key at: <span className="font-mono">platform.openai.com</span>
                </p>
                <p>
                  • Get your ElevenLabs key at: <span className="font-mono">elevenlabs.io</span>
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
