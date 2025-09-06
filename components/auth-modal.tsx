"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: MessageEvent) => {
      if (e?.data?.type === 'supabase-auth' && e?.data?.ok) {
        onClose()
        try { window.location.reload() } catch {}
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [open, onClose])

  if (!open) return null

  const openOAuth = async (provider: 'google' | 'linkedin_oidc') => {
    try {
      const supabase = getSupabaseBrowser()
      if (!supabase) return
      const redirectTo = `${window.location.origin}/auth/callback`
      const scopes = provider === 'google'
        ? 'openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file'
        : 'openid profile email'
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          // Provider-specific scopes
          scopes,
          queryParams: { prompt: 'consent select_account', access_type: 'offline' }
        }
      })
      if (error) throw error
      const url = data?.url
      if (url) {
        const w = 480, h = 640
        const left = window.screenX + (window.outerWidth - w) / 2
        const top = window.screenY + (window.outerHeight - h) / 2
        window.open(url, 'supabase_oauth', `width=${w},height=${h},left=${left},top=${top}`)
      }
    } catch (e) {
      console.error('OAuth error:', e)
    }
  }

  const sendMagicLink = async () => {
    if (!email) return
    try {
      setSending(true)
      const supabase = getSupabaseBrowser()
      if (!supabase) return
      await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      alert('Check your email for the sign-in link.')
    } catch (e) {
      console.error('Magic link error:', e)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Image src="/images/voiceloop-logo.png" alt="VoiceLoop" width={56} height={56} className="rounded" />
          <h2 className="text-xl font-light">Sign in to VoiceLoop</h2>

          <Button className="w-full font-light" onClick={() => openOAuth('google')}>Sign in with Google</Button>
          <Button className="w-full font-light" variant="outline" onClick={() => openOAuth('linkedin_oidc')}>Sign in with LinkedIn</Button>

          <div className="w-full pt-2">
            <div className="text-xs text-muted-foreground mb-2 text-left">Or use email</div>
            <div className="flex gap-2">
              <Input placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button onClick={sendMagicLink} disabled={!email || sending} className="font-light">{sending ? 'Sending...' : 'Send link'}</Button>
            </div>
          </div>

          <Button variant="ghost" className="w-full font-light" onClick={onClose}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}


