"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { Upload, Mic, Search, Zap, FileText, Volume2, LayoutDashboard } from "lucide-react"
import { useEffect, useState } from 'react'
import { AuthModal } from '@/components/auth-modal'

export default function HomePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
                <Link href="/settings">Settings</Link>
              </Button>
              {userId ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent"
                  onClick={async () => {
                    try {
                      const supabase = getSupabaseBrowser()
                      await supabase?.auth.signOut()
                      setUserId(null)
                    } catch {}
                  }}
                >
                  Sign out
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent"
                  onClick={() => setAuthOpen(true)}
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <Image
              src="/images/voiceloop-logo.png"
              alt="VoiceLoop"
              width={120}
              height={120}
              className="mx-auto mb-8 rounded-2xl"
            />
          </div>

          <h1 className="text-5xl md:text-6xl font-light text-foreground mb-6 text-balance">
            Transform Documents into
            <span className="text-secondary"> Conversations</span>
          </h1>

          <p className="text-xl text-muted-foreground font-light mb-8 max-w-2xl mx-auto text-pretty">
            Upload any document or audio file and engage in intelligent voice conversations with AI-powered summaries
            and semantic search.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="font-light text-lg px-8 py-6" asChild>
              <Link href="/upload">
                Get Started
                <Zap className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="font-light text-lg px-8 py-6 bg-transparent" asChild>
              <Link href="/dashboard">
                View Dashboard
                <LayoutDashboard className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Auth CTA removed in favor of single nav button */}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-light text-center mb-12 text-balance">Intelligent Document Processing</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 border-thin hover:border-accent/50 transition-colors">
              <Upload className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-light mb-3">Smart Upload</h3>
              <p className="text-muted-foreground font-light">
                Support for PDF, Markdown, CSV, audio, and video files with intelligent processing.
              </p>
            </Card>

            <Card className="p-8 border-thin hover:border-secondary/50 transition-colors">
              <FileText className="h-12 w-12 text-secondary mb-4" />
              <h3 className="text-xl font-light mb-3">AI Summaries</h3>
              <p className="text-muted-foreground font-light">
                Get concise, intelligent summaries with key insights and action items highlighted.
              </p>
            </Card>

            <Card className="p-8 border-thin hover:border-primary/50 transition-colors">
              <Mic className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-light mb-3">Voice Chat</h3>
              <p className="text-muted-foreground font-light">
                Ask questions about your documents using natural voice commands and responses.
              </p>
            </Card>

            <Card className="p-8 border-thin hover:border-accent/50 transition-colors">
              <Search className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-light mb-3">Semantic Search</h3>
              <p className="text-muted-foreground font-light">
                Find relevant information across all your documents using natural language queries.
              </p>
            </Card>

            <Card className="p-8 border-thin hover:border-secondary/50 transition-colors">
              <Volume2 className="h-12 w-12 text-secondary mb-4" />
              <h3 className="text-xl font-light mb-3">Text-to-Speech</h3>
              <p className="text-muted-foreground font-light">
                Listen to summaries and responses with natural, high-quality voice synthesis.
              </p>
            </Card>

            <Card className="p-8 border-thin hover:border-primary/50 transition-colors">
              <Zap className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-light mb-3">Fast Processing</h3>
              <p className="text-muted-foreground font-light">
                Lightning-fast document analysis and transcription in under 30 seconds.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-light mb-6 text-balance">Ready to Transform Your Documents?</h2>
          <p className="text-xl text-muted-foreground font-light mb-8 text-pretty">
            Join thousands of professionals who are already using VoiceLoop to unlock the power of their documents
            through AI and voice interaction.
          </p>
          <Button size="lg" className="font-light text-lg px-12 py-6" asChild>
            <Link href="/upload">
              Start Free Trial
              <Zap className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-thin border-border/50 py-8 px-6">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image src="/images/voiceloop-logo.png" alt="VoiceLoop" width={24} height={24} className="rounded" />
            <span className="text-sm font-light text-muted-foreground">VoiceLoop HR - AI Document Processing</span>
          </div>
          <p className="text-sm text-muted-foreground font-light">
            © 2025 VoiceLoop. Transform documents into conversations.
          </p>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
