"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Settings } from "lucide-react"
import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { ThemeToggle } from '@/components/theme-toggle'

interface NavigationProps {
  showHomeButton?: boolean
  showDashboardButton?: boolean
}

export function Navigation({ 
  showHomeButton = true,
  showDashboardButton = true
}: NavigationProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseBrowser()
        if (!supabase) return
        const { data: { user } } = await supabase.auth.getUser()
        setUserId(user?.id ?? null)
        setUserEmail((user?.email as string) || (user?.user_metadata?.email as string) || null)
        const pic = (user?.user_metadata as any)?.avatar_url || (user?.user_metadata as any)?.picture || null
        setAvatarUrl(pic || null)
      } catch {}
    }
    loadUser()
  }, [])

  const userLabel = useMemo(() => {
    if (userEmail) return userEmail
    if (userId) return `${userId.slice(0,6)}…${userId.slice(-4)}`
    return null
  }, [userEmail, userId])

  return (
    <header className="border-b border-thin border-border/50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Image 
              src="/images/voiceloop-logo.png" 
              alt="VoiceLoop" 
              width={56} 
              height={56} 
              className="rounded-lg" 
            />
          </Link>
          
          <div className="flex items-center gap-2">
            {userId && (
              <div className="flex items-center gap-2 mr-1 pl-2 pr-3 py-1 rounded-full border border-border/50 bg-background/60">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="User" width={24} height={24} className="rounded-full" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">
                    {(userLabel || 'U').slice(0,2).toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-muted-foreground max-w-[140px] truncate" title={userLabel || undefined}>
                  {userLabel}
                </span>
              </div>
            )}
            {showHomeButton && (
              <Button variant="outline" size="sm" className="font-montserrat-light bg-transparent" asChild>
                <Link href="/">
                  Home
                </Link>
              </Button>
            )}
            
            {showDashboardButton && (
              <Button variant="outline" size="sm" className="font-montserrat-light bg-transparent" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            )}
            
            <ThemeToggle />
            
            {userId ? (
              <>
                <Button variant="outline" size="sm" className="font-montserrat-light bg-transparent" asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-montserrat-light bg-transparent"
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
              </>
            ) : (
              <Button variant="outline" size="sm" className="font-montserrat-light bg-transparent" asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
