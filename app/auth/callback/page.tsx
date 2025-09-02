"use client"

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking')

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) {
          setStatus('error')
          return
        }
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          try {
            window.opener?.postMessage({ type: 'supabase-auth', ok: true }, '*')
          } catch {}
          setStatus('ok')
          setTimeout(() => window.close(), 800)
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    }
    run()
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ fontFamily: 'sans-serif', fontSize: 14, color: '#666' }}>
        {status === 'checking' && 'Completing sign in...'}
        {status === 'ok' && 'Signed in. You can close this window.'}
        {status === 'error' && 'Authentication complete. You may close this window.'}
      </div>
    </div>
  )
}


