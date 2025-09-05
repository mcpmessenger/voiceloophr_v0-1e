"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Key, Save, Eye, EyeOff, LogIn, LogOut } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { AuthModal } from '@/components/auth-modal'

export default function SettingsPage() {
  const [openaiKey, setOpenaiKey] = useState("")
  const [elevenlabsKey, setElevenlabsKey] = useState("")
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showElevenlabsKey, setShowElevenlabsKey] = useState(false)
  const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'openai' | 'auto'>("auto")
  const [elevenlabsVoice, setElevenlabsVoice] = useState<string>("")
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    // Load saved keys from localStorage
    const savedOpenaiKey = localStorage.getItem("voiceloop_openai_key") || ""
    const savedElevenlabsKey = localStorage.getItem("voiceloop_elevenlabs_key") || ""
    const savedProvider = (localStorage.getItem("voiceloop_tts_provider") as any) || 'auto'
    const savedVoice = localStorage.getItem("voiceloop_elevenlabs_voice") || ""
    setOpenaiKey(savedOpenaiKey)
    setElevenlabsKey(savedElevenlabsKey)
    setTtsProvider(savedProvider === 'elevenlabs' || savedProvider === 'openai' ? savedProvider : 'auto')
    setElevenlabsVoice(savedVoice)

    // Load user authentication status
    const loadUser = async () => {
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) return
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id ?? null)
      } catch {}
    }
    loadUser()
  }, [])

  const handleSave = () => {
    localStorage.setItem("voiceloop_openai_key", openaiKey)
    localStorage.setItem("voiceloop_elevenlabs_key", elevenlabsKey)
    localStorage.setItem("voiceloop_tts_provider", ttsProvider)
    localStorage.setItem("voiceloop_elevenlabs_voice", elevenlabsVoice)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const maskKey = (key: string) => {
    if (!key) return ""
    return key.slice(0, 8) + "..." + key.slice(-4)
  }

  const handleOAuth = async (provider: 'google' | 'linkedin_oidc') => {
    try {
      const supabase = getSupabaseBrowser()
      if (!supabase) return
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
      await supabase.auth.signInWithOAuth({ provider, options: { redirectTo, queryParams: { prompt: 'select_account' } } })
    } catch (e) {
      console.error('Auth error:', e)
    }
  }

  const handleEmailMagic = async () => {
    const email = prompt('Enter your email for a magic link')
    if (!email) return
    try {
      const supabase = getSupabaseBrowser()
      if (!supabase) return
      await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined } })
      alert('Check your email for the sign-in link.')
    } catch (e) {
      console.error('Email sign-in error:', e)
    }
  }

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseBrowser()
      await supabase?.auth.signOut()
      setUserId(null)
    } catch (e) {
      console.error('Sign out error:', e)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navigation />

      {/* Settings Content */}
      <section className="py-12 px-6">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-montserrat-light text-foreground mb-2">Settings</h1>
            <p className="text-muted-foreground font-montserrat-light">
              Configure your account and API keys to enable AI processing and voice features
            </p>
          </div>

          <div className="space-y-6">
            {/* Authentication Section */}
            <Card className="p-6 border-thin">
              <div className="flex items-center gap-3 mb-4">
                {userId ? <LogOut className="h-5 w-5 text-accent" /> : <LogIn className="h-5 w-5 text-accent" />}
                <h2 className="text-xl font-montserrat-light">Account</h2>
              </div>
              
              {userId ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground font-montserrat-light">
                    You are signed in. Your documents and settings are synced across devices.
                  </p>
                  <Button 
                    variant="outline" 
                    className="font-montserrat-light bg-transparent"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground font-montserrat-light">
                    Sign in to sync your documents and settings across devices.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="font-montserrat-light bg-transparent"
                      onClick={() => handleOAuth('google')}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign in with Google
                    </Button>
                    <Button 
                      variant="outline" 
                      className="font-montserrat-light bg-transparent"
                      onClick={() => handleOAuth('linkedin_oidc')}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign in with LinkedIn
                    </Button>
                    <Button 
                      variant="outline" 
                      className="font-montserrat-light bg-transparent"
                      onClick={handleEmailMagic}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Magic Link
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* API Settings Section */}
            <Card className="p-6 border-thin">
              <div className="flex items-center gap-3 mb-4">
                <Key className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-montserrat-light">API Settings</h2>
              </div>
              <p className="text-sm text-muted-foreground font-montserrat-light mb-4">
                Configure your API keys to enable AI processing and voice features
              </p>

              {/* OpenAI API Key */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-montserrat-light mb-2">OpenAI API Key</h3>
                  <p className="text-sm text-muted-foreground font-montserrat-light mb-4">
                    Required for document summarization (GPT-4) and audio transcription (Whisper)
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="openai-key" className="text-sm font-montserrat-light">
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
              </div>

              {/* ElevenLabs API Key */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-montserrat-light mb-2">ElevenLabs API Key</h3>
                  <p className="text-sm text-muted-foreground font-montserrat-light mb-4">
                    Required for high-quality text-to-speech and voice responses
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="elevenlabs-key" className="text-sm font-montserrat-light">
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
              </div>
            </Card>

            {/* TTS Settings */}
            <Card className="p-6 border-thin">
              <h3 className="text-lg font-light mb-2">Text-to-Speech</h3>
              <p className="text-sm text-muted-foreground mb-4">Choose provider and voice for spoken responses.</p>
              <div className="space-y-3">
                <Label className="text-sm font-light">Provider</Label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tts" value="auto" checked={ttsProvider === 'auto'} onChange={() => setTtsProvider('auto')} />
                    Auto (prefer ElevenLabs, fallback to OpenAI)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tts" value="elevenlabs" checked={ttsProvider === 'elevenlabs'} onChange={() => setTtsProvider('elevenlabs')} />
                    ElevenLabs
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="tts" value="openai" checked={ttsProvider === 'openai'} onChange={() => setTtsProvider('openai')} />
                    OpenAI
                  </label>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-light">ElevenLabs Voice (ID or name)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter voice name or ID (e.g., Jessica)"
                      value={elevenlabsVoice}
                      onChange={(e) => setElevenlabsVoice(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-light"
                      onClick={async () => {
                        try {
                          const key = localStorage.getItem('voiceloop_elevenlabs_key')
                          if (!key) { alert('Add ElevenLabs key first'); return }
                          const resp = await fetch('/api/tts/voices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elevenlabsKey: key }) })
                          const data = await resp.json()
                          if (!resp.ok || !data?.voices) { alert(data?.error || 'Failed to fetch voices'); return }
                          const choice = window.prompt('Available voices (copy a name or ID):\n\n' + data.voices.map((v: any) => `${v.name} — ${v.id}`).join('\n'))
                          if (choice) setElevenlabsVoice(choice)
                        } catch (e) { alert('Failed to load voices'); }
                      }}
                    >
                      List Voices
                    </Button>
                  </div>
                </div>
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

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
