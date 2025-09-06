"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Settings } from "lucide-react"
import { useEffect, useState } from 'react'
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
