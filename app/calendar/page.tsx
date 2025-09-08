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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    description: ''
  })

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

  const openDayView = (day: Date) => {
    setSelectedDate(day)
  }

  const closeDayView = () => {
    setSelectedDate(null)
    setEditingEvent(null)
  }

  const beginEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setEditForm({
      title: event.title || '',
      startTime: event.startTime ? new Date(event.startTime).toISOString().slice(0,16) : '',
      endTime: event.endTime ? new Date(event.endTime).toISOString().slice(0,16) : '',
      location: event.location || '',
      description: event.description || ''
    })
  }

  const saveEditEvent = async () => {
    if (!editingEvent) return
    try {
      const payload: any = { action: 'update-event', eventId: editingEvent.id, updates: {} }
      if (editForm.title) payload.updates.title = editForm.title
      if (editForm.location) payload.updates.location = editForm.location
      if (editForm.description) payload.updates.description = editForm.description
      if (editForm.startTime) payload.updates.startTime = new Date(editForm.startTime).toISOString()
      if (editForm.endTime) payload.updates.endTime = new Date(editForm.endTime).toISOString()
      payload.accessToken = accessToken
      payload.refreshToken = refreshToken

      const res = await fetch('/api/calendar/real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        setError('✅ Event updated')
        setEditingEvent(null)
        loadMonthEvents(currentMonth)
      } else {
        setError(`❌ Update failed: ${data.error}`)
      }
    } catch (e) {
      setError('❌ Update failed')
    }
  }

  const deleteEvent = async (eventId: string) => {
    try {
      const res = await fetch('/api/calendar/real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel-event', eventId, accessToken, refreshToken })
      })
      const data = await res.json()
      if (data.success) {
        setError('✅ Event cancelled')
        loadMonthEvents(currentMonth)
      } else {
        setError(`❌ Cancel failed: ${data.error}`)
      }
    } catch {
      setError('❌ Cancel failed')
    }
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
        // Fetch holidays overlay
        try {
          const hres = await fetch('/api/calendar/real', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get-holidays-range', start, end, accessToken, refreshToken })
          })
          const hdata = await hres.json()
          if (hdata.success && Array.isArray(hdata.events)) {
            for (const ev of hdata.events as CalendarEvent[]) {
              const key = new Date(ev.startTime).toISOString().slice(0, 10)
              map[key] = map[key] || []
              map[key].push({ ...ev, status: 'confirmed' })
            }
          }
        } catch {}
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
                  <div key={`${key}-${idx}`} className={`border rounded-md p-2 h-28 overflow-hidden ${inMonth ? '' : 'opacity-50'} cursor-pointer hover:bg-muted/40`} onClick={() => openDayView(day)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{day.getDate()}</span>
                      {dayEvents.length > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{dayEvents.length}</Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0,3).map(ev => {
                        const isAllDay = !String(ev.startTime).includes('T') || String(ev.id).startsWith('holiday_')
                        return (
                          <div key={ev.id} className="truncate text-xs">
                            • {isAllDay ? '' : `${formatTime(ev.startTime)} `}{ev.title}
                            {ev.location ? ` @ ${ev.location}` : ''}
                          </div>
                        )
                      })}
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
            <div className="bg-card text-foreground rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-xl">
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

        {/* Day View Modal */}
        {selectedDate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card text-foreground rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
                <Button variant="outline" size="sm" onClick={closeDayView}>×</Button>
              </div>
              {(() => {
                const key = selectedDate.toISOString().slice(0,10)
                const list = eventsByDate[key] || []
                if (list.length === 0) return (<div className="text-sm text-muted-foreground">No events</div>)
                return (
                  <div className="space-y-3">
                    {list.map(ev => (
                      <Card key={ev.id} className="p-3">
                        {editingEvent?.id === ev.id ? (
                          <div className="space-y-2">
                            <input className="w-full border border-border bg-background text-foreground px-2 py-1 rounded" value={editForm.title} onChange={e=>setEditForm(s=>({...s,title:e.target.value}))} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <input type="datetime-local" className="w-full border border-border bg-background text-foreground px-2 py-1 rounded" value={editForm.startTime} onChange={e=>setEditForm(s=>({...s,startTime:e.target.value}))} />
                              <input type="datetime-local" className="w-full border border-border bg-background text-foreground px-2 py-1 rounded" value={editForm.endTime} onChange={e=>setEditForm(s=>({...s,endTime:e.target.value}))} />
                            </div>
                            <input className="w-full border border-border bg-background text-foreground px-2 py-1 rounded" placeholder="Location" value={editForm.location} onChange={e=>setEditForm(s=>({...s,location:e.target.value}))} />
                            <textarea className="w-full border border-border bg-background text-foreground px-2 py-1 rounded" placeholder="Description" value={editForm.description} onChange={e=>setEditForm(s=>({...s,description:e.target.value}))} />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveEditEvent}>Save</Button>
                              <Button size="sm" variant="outline" onClick={()=>setEditingEvent(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-sm">{ev.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {String(ev.id).startsWith('holiday_') ? 'All day' : `${formatTime(ev.startTime)} - ${formatTime(ev.endTime)}`}
                                {ev.location ? ` • ${ev.location}` : ''}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {!String(ev.id).startsWith('holiday_') && (
                                <Button size="sm" variant="outline" onClick={()=>beginEditEvent(ev)}>Edit</Button>
                              )}
                              {!String(ev.id).startsWith('holiday_') && (
                                <Button size="sm" variant="destructive" onClick={()=>deleteEvent(ev.id)}>Delete</Button>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}