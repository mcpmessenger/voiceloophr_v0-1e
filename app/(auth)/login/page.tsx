"use client"

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const signInWithProvider = async (provider: 'google' | 'linkedin_oidc') => {
    setLoading(true)
    setMessage('')
    const supabase = getSupabaseBrowser()
    if (!supabase) {
      setMessage('Auth not configured')
      setLoading(false)
      return
    }
    const scopes = provider === 'google'
      ? 'openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file'
      : 'openid profile email'
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}`,
        scopes,
        queryParams: { prompt: 'consent select_account', access_type: 'offline' }
      }
    })
    if (error) setMessage(error.message)
    setLoading(false)
  }

  const signInWithEmail = async () => {
    setLoading(true)
    setMessage('')
    const supabase = getSupabaseBrowser()
    if (!supabase) {
      setMessage('Auth not configured')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}` } })
    if (!error) setMessage('Check your email for the magic link.')
    else setMessage(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-light text-center">Sign in</h1>
        <Button disabled={loading} onClick={() => signInWithProvider('google')} className="w-full">Continue with Google</Button>
        <Button disabled={loading} onClick={() => signInWithProvider('linkedin_oidc')} className="w-full" variant="outline">Continue with LinkedIn</Button>
        <div className="border-t pt-4">
          <input className="w-full border p-2 rounded mb-2" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <Button disabled={loading || !email} onClick={signInWithEmail} className="w-full">Send magic link</Button>
        </div>
        {message && <p className="text-sm text-muted-foreground text-center">{message}</p>}
        <p className="text-center text-sm"><Link href="/">Back to Home</Link></p>
      </div>
    </div>
  )
}


