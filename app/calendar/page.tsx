"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  Plus,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { Navigation } from "@/components/navigation"
import { GoogleAccountSelector } from "@/components/google-account-selector"

interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  attendees: string[]
  location?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  created: string
  updated: string
}

export default function CalendarPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [connectedProviders, setConnectedProviders] = useState<any[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [eventsByDate, setEventsByDate] = useState<Record<string, CalendarEvent[]>>({})

  // Form state for scheduling
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    attendees: '',
    location: ''
  })

  useEffect(() => {
    checkConnection()
    // Check for stored tokens
    const storedTokens = localStorage.getItem('google_calendar_tokens')
    if (storedTokens) {
      try {
        const tokens = JSON.parse(storedTokens)
        setAccessToken(tokens.access_token)
        setRefreshToken(tokens.refresh_token)
        setIsConnected(true)
        setConnectedProviders(prev => {
          const map = new Map<string, any>()
          ;[...prev, { id: 'google', name: 'Google Calendar', type: 'google', status: 'connected' }].forEach(p => map.set(p.id, p))
          return Array.from(map.values())
        })
        loadRealEvents()
        loadMonthEvents(currentMonth)
      } catch (error) {
        console.error('Failed to parse stored tokens:', error)
      }
    }

    // Listen for tokens arriving from OAuth popup (storage event)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'google_calendar_tokens' && e.newValue) {
        try {
          const tokens = JSON.parse(e.newValue)
          setAccessToken(tokens.access_token)
          setRefreshToken(tokens.refresh_token)
          setIsConnected(true)
          setConnectedProviders(prev => {
            const map = new Map<string, any>()
            ;[...prev, { id: 'google', name: 'Google Calendar', type: 'google', status: 'connected' }].forEach(p => map.set(p.id, p))
            return Array.from(map.values())
          })
          setShowAuthModal(false)
          loadMonthEvents(currentMonth)
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const checkConnection = async () => {
    try {
      // Test if we can reach the Google OAuth API
      const response = await fetch('/api/calendar/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()

      // Do not mark connected here; connection depends on presence of tokens
      if (data.success) {
        // keep provider label if already connected
        if (accessToken) {
          setConnectedProviders([{ id: 'google', name: 'Google Calendar', type: 'google', status: 'connected' }])
          loadMonthEvents(currentMonth)
        }
      }
    } catch (error) {
      console.error('Calendar connection check failed:', error)
    }
  }

  // Helpers for month grid
  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
  const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const startOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay() // 0 Sun - 6 Sat
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d
  }
  const endOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    d.setDate(d.getDate() + (6 - day))
    d.setHours(23, 59, 59, 999)
    return d
  }

  const getMonthGridDays = (month: Date): Date[] => {
    const start = startOfWeek(startOfMonth(month))
    const end = endOfWeek(endOfMonth(month))
    const days: Date[] = []
    const cursor = new Date(start)
    while (cursor <= end) {
      days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return days
  }

  const loadMonthEvents = async (month: Date) => {
    if (!accessToken) return
    const start = startOfWeek(startOfMonth(month)).toISOString()
    const end = endOfWeek(endOfMonth(month)).toISOString()

    try {
      const response = await fetch('/api/calendar/real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-events-range',
          start,
          end,
          accessToken,
          refreshToken
        })
      })
      const data = await response.json()
      if (data.success && Array.isArray(data.events)) {
        const map: Record<string, CalendarEvent[]> = {}
        for (const ev of data.events as CalendarEvent[]) {
          const key = new Date(ev.startTime).toISOString().slice(0, 10)
          map[key] = map[key] || []
          map[key].push(ev)
        }
        setEventsByDate(map)
      }
    } catch (_) {}
  }

  // Load month events on connection or when month changes
  useEffect(() => {
    if (isConnected && accessToken) {
      loadMonthEvents(currentMonth)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, accessToken, currentMonth])

  const loadRealEvents = async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/calendar/real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-events',
          accessToken,
          refreshToken,
          days: 30
        })
      })

      const data = await response.json()
      
      if (data.success && data.events) {
        setEvents(data.events)
        setError(`✅ ${data.message}`)
      } else {
        setError(`❌ Failed to load events: ${data.error}`)
      }
    } catch (error) {
      setError(`❌ Error loading events: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProviderConnected = (provider: any) => {
    setConnectedProviders(prev => {
      const map = new Map<string, any>()
      ;[...prev, provider].forEach(p => map.set(p.id, p))
      return Array.from(map.values())
    })
    setIsConnected(true)
    setShowAuthModal(false)
    setError(null)
  }

  const handleProviderDisconnected = (providerId: string) => {
    setConnectedProviders(prev => prev.filter(p => p.id !== providerId))
    if (connectedProviders.length <= 1) {
      setIsConnected(false)
    }
  }

  const testGoogleOAuth = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/calendar/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      
      if (data.success) {
        setError(`✅ Google OAuth URL generated successfully!`)
        // Open the OAuth URL
        window.open(data.authUrl, '_blank')
      } else {
        setError(`❌ Google OAuth failed: ${data.error}`)
      }
    } catch (error) {
      setError(`❌ Google OAuth error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScheduleMeeting = async () => {
    if (!scheduleForm.startTime || !scheduleForm.endTime || !scheduleForm.title) {
      setError('Please provide title, start time, and end time')
      return
    }

    if (!accessToken) {
      setError('Please connect to Google Calendar first')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const attendees = scheduleForm.attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email)

      const toISO = (v: string) => new Date(v).toISOString()

      const response = await fetch('/api/calendar/real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule-meeting',
          title: scheduleForm.title,
          startTime: toISO(scheduleForm.startTime),
          endTime: toISO(scheduleForm.endTime),
          attendees,
          description: scheduleForm.description,
          location: scheduleForm.location,
          accessToken,
          refreshToken
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setShowScheduleForm(false)
        setScheduleForm({
          title: '',
          description: '',
          startTime: '',
          endTime: '',
          attendees: '',
          location: ''
        })
        setError(`✅ ${data.message}`)
        // Refresh events
        loadRealEvents()
      } else {
        setError(`❌ Failed to schedule meeting: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
      setError(`❌ Failed to schedule meeting: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    try {
      localStorage.removeItem('google_calendar_tokens')
    } catch {}
    setAccessToken(null)
    setRefreshToken(null)
    setIsConnected(false)
    setConnectedProviders([])
    setEvents([])
    setEventsByDate({})
    setError('Disconnected from Google Calendar')
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString()
  }

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString([], { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
      case 'tentative': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-foreground mb-2">Calendar</h1>
            <p className="text-muted-foreground">
              Manage your meetings and schedule events
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { checkConnection(); if (isConnected && accessToken) { loadMonthEvents(currentMonth) } }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {!isConnected ? (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowAuthModal(true)}
                disabled={isLoading}
              >
                Connect
              </Button>
            ) : (
              <Button 
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                Disconnect
              </Button>
            )}
            <Button 
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              disabled={!isConnected}
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <Card className="p-6 border-dashed border-2 border-muted-foreground/25 mb-8">
            <div className="flex items-center gap-3 text-muted-foreground mb-4">
              <Calendar className="h-6 w-6" />
              <div>
                <p className="font-medium">Calendar Integration</p>
                <p className="text-sm">Connect your calendar to view and schedule events</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowAuthModal(true)}
                disabled={isLoading}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Calendar
              </Button>
              
            <Button 
              variant="outline"
              onClick={testGoogleOAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Test OAuth
            </Button>
            
            {accessToken && (
              <Button 
                variant="outline"
                onClick={() => { loadRealEvents(); loadMonthEvents(currentMonth) }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reload Month
              </Button>
            )}
            </div>
          </Card>
        )}

        {/* Connected Providers */}
        {connectedProviders.length > 0 && (
          <Card className="p-4 mb-6">
            <h3 className="font-medium mb-2">Connected Providers</h3>
            <div className="flex gap-2">
              {connectedProviders.map((provider, idx) => (
                <div key={`${provider.id}-${idx}`} className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <CheckCircle className="h-3 w-3" />
                  {provider.name}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Month View */}
        {isConnected && (
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-lg font-medium">
                  {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {getMonthGridDays(currentMonth).map((day, idx) => {
                const inMonth = day.getMonth() === currentMonth.getMonth()
                const key = day.toISOString().slice(0,10)
                const dayEvents = eventsByDate[key] || []
                return (
                  <div key={`${key}-${idx}`} className={`border rounded-md p-2 h-28 overflow-hidden ${inMonth ? '' : 'opacity-50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{day.getDate()}</span>
                      {dayEvents.length > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{dayEvents.length}</Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0,3).map(ev => (
                        <div key={ev.id} className="truncate text-xs">
                          • {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Error/Success Messages */}
        {error && (
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-2">
              {error.includes('✅') ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium">Status</span>
            </div>
            <p className="text-sm mt-1">{error}</p>
          </Card>
        )}

        {/* Schedule Meeting Form */}
        {showScheduleForm && isConnected && (
          <Card className="p-6 border-primary/20 mb-8">
            <h3 className="font-semibold mb-4">Schedule New Meeting</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Meeting title"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Location</label>
                <input
                  type="text"
                  value={scheduleForm.location}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Conference Room A"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Start Time *</label>
                <input
                  type="datetime-local"
                  value={scheduleForm.startTime}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="text-sm font-medium">End Time *</label>
                <input
                  type="datetime-local"
                  value={scheduleForm.endTime}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Attendees (comma-separated emails)</label>
                <input
                  type="text"
                  value={scheduleForm.attendees}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, attendees: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="user1@company.com, user2@company.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Meeting description"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handleScheduleMeeting}
                disabled={isLoading || !scheduleForm.startTime || !scheduleForm.endTime || !scheduleForm.title}
              >
                {isLoading ? (
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Schedule Meeting
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowScheduleForm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Events List */}
        {isConnected && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Upcoming Events</h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {events.length} events
                </Badge>
              </div>
            </div>

            {events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold truncate">{event.title}</h3>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getEventStatusColor(event.status)}`}
                        >
                          {event.status}
                        </Badge>
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-medium">{formatDate(event.startTime)}</span>
                        <span>•</span>
                        <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                        {event.location && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          </>
                        )}
                        {event.attendees.length > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No upcoming events</p>
                <p className="text-sm">Schedule a meeting to get started</p>
              </div>
            )}
          </Card>
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Connect Calendar</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAuthModal(false)}
                >
                  ×
                </Button>
              </div>
              
              <GoogleAccountSelector onProviderConnected={handleProviderConnected} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}