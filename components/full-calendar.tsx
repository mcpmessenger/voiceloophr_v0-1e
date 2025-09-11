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
  ChevronRight,
  Grid3X3,
  CalendarDays,
  List
} from "lucide-react"
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

type ViewMode = 'month' | 'week' | 'day'

interface FullCalendarProps {
  className?: string
}

export function FullCalendar({ className = "" }: FullCalendarProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [connectedProviders, setConnectedProviders] = useState<any[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [provider, setProvider] = useState<'google' | 'microsoft'>('google')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [eventsByDate, setEventsByDate] = useState<Record<string, CalendarEvent[]>>({})
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
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

  // Store both providers' tokens so both connections can persist
  const [googleTokens, setGoogleTokens] = useState<{ access_token: string; refresh_token?: string } | null>(null)
  const [microsoftTokens, setMicrosoftTokens] = useState<{ access_token: string; refresh_token?: string } | null>(null)

  useEffect(() => {
    checkConnection()
    // Load both providers' tokens from localStorage
    try {
      const g = localStorage.getItem('google_calendar_tokens')
      const m = localStorage.getItem('microsoft_calendar_tokens')
      const providers: any[] = []
      if (g) {
        const t = JSON.parse(g)
        setGoogleTokens({ access_token: t.access_token, refresh_token: t.refresh_token })
        providers.push({ id: 'google', name: 'Google Calendar', type: 'google', status: 'connected' })
      }
      if (m) {
        const t = JSON.parse(m)
        setMicrosoftTokens({ access_token: t.access_token, refresh_token: t.refresh_token })
        providers.push({ id: 'microsoft', name: 'Microsoft Calendar', type: 'microsoft', status: 'connected' })
      }
      if (providers.length > 0) {
        setIsConnected(true)
        setConnectedProviders(providers)
        const defaultProvider: 'google' | 'microsoft' = providers.find(p => p.id === 'google') ? 'google' : 'microsoft'
        setProvider(defaultProvider)
        const defTokens = defaultProvider === 'google' ? g && JSON.parse(g) : m && JSON.parse(m)
        if (defTokens) {
          setAccessToken(defTokens.access_token)
          setRefreshToken(defTokens.refresh_token || null)
          loadRealEvents()
          loadEventsForCurrentView()
        }
      }
    } catch (error) {
      console.error('Failed to parse stored tokens:', error)
    }

    // Listen for tokens arriving from OAuth popup (storage event)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'google_calendar_tokens' && e.newValue) {
        try {
          const tokens = JSON.parse(e.newValue)
          setGoogleTokens({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
          setIsConnected(true)
          setConnectedProviders(prev => {
            const map = new Map<string, any>()
            ;[...prev, { id: 'google', name: 'Google Calendar', type: 'google', status: 'connected' }].forEach(p => map.set(p.id, p))
            return Array.from(map.values())
          })
          if (!accessToken) {
            setProvider('google')
            setAccessToken(tokens.access_token)
            setRefreshToken(tokens.refresh_token)
          }
          setShowAuthModal(false)
          loadEventsForCurrentView()
        } catch {}
      }
      if (e.key === 'microsoft_calendar_tokens' && e.newValue) {
        try {
          const tokens = JSON.parse(e.newValue)
          setMicrosoftTokens({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
          setIsConnected(true)
          setConnectedProviders(prev => {
            const map = new Map<string, any>()
            ;[...prev, { id: 'microsoft', name: 'Microsoft Calendar', type: 'microsoft', status: 'connected' }].forEach(p => map.set(p.id, p))
            return Array.from(map.values())
          })
          if (!accessToken) {
            setProvider('microsoft')
            setAccessToken(tokens.access_token)
            setRefreshToken(tokens.refresh_token)
          }
          setShowAuthModal(false)
          loadEventsForCurrentView()
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Load events when view or date changes
  useEffect(() => {
    if (isConnected && accessToken) {
      loadEventsForCurrentView()
    }
  }, [isConnected, accessToken, currentDate, viewMode])

  const checkConnection = async () => {
    try {
      // Test provider availability (google by default)
      const response = await fetch('/api/calendar/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()

      // Do not mark connected here; connection depends on presence of tokens
      if (data.success) {
        // keep provider label if already connected
        if (accessToken) {
          const current = provider === 'microsoft' ?
            [{ id: 'microsoft', name: 'Microsoft Calendar', type: 'microsoft', status: 'connected' }] :
            [{ id: 'google', name: 'Google Calendar', type: 'google', status: 'connected' }]
          setConnectedProviders(current)
          loadEventsForCurrentView()
        }
      }
    } catch (error) {
      console.error('Calendar connection check failed:', error)
    }
  }

  // Helpers for date calculations
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
  const startOfDay = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }
  const endOfDay = (date: Date) => {
    const d = new Date(date)
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

  const getWeekDays = (date: Date): Date[] => {
    const start = startOfWeek(date)
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  const loadEventsForCurrentView = async () => {
    if (!accessToken) return

    let start: string, end: string

    switch (viewMode) {
      case 'month':
        start = startOfWeek(startOfMonth(currentDate)).toISOString()
        end = endOfWeek(endOfMonth(currentDate)).toISOString()
        break
      case 'week':
        start = startOfWeek(currentDate).toISOString()
        end = endOfWeek(currentDate).toISOString()
        break
      case 'day':
        start = startOfDay(currentDate).toISOString()
        end = endOfDay(currentDate).toISOString()
        break
    }

    try {
      const response = await fetch('/api/calendar/real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-events-range',
          start,
          end,
          accessToken,
          refreshToken,
          provider
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
            body: JSON.stringify({ action: 'get-holidays-range', start, end, accessToken, refreshToken, provider })
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
          provider,
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
          refreshToken,
          provider
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
        loadEventsForCurrentView()
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
      localStorage.removeItem('microsoft_calendar_tokens')
    } catch {}
    setAccessToken(null)
    setRefreshToken(null)
    setIsConnected(false)
    setConnectedProviders([])
    setEvents([])
    setEventsByDate({})
    setError('Disconnected from Calendar')
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

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    switch (viewMode) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const renderMonthView = () => {
    const days = getMonthGridDays(currentDate)
    const today = new Date()
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          const inMonth = day.getMonth() === currentDate.getMonth()
          const isToday = day.toDateString() === today.toDateString()
          const key = day.toISOString().slice(0,10)
          const dayEvents = eventsByDate[key] || []
          
          return (
            <div 
              key={`${key}-${idx}`} 
              className={`border rounded-md p-2 h-28 overflow-hidden ${inMonth ? '' : 'opacity-50'} cursor-pointer hover:bg-muted/40 ${isToday ? 'bg-primary/10 border-primary' : ''}`} 
              onClick={() => setSelectedDate(day)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}>{day.getDate()}</span>
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
    )
  }

  const renderWeekView = () => {
    const days = getWeekDays(currentDate)
    const today = new Date()
    
    return (
      <div className="space-y-2">
        {days.map((day, idx) => {
          const isToday = day.toDateString() === today.toDateString()
          const key = day.toISOString().slice(0,10)
          const dayEvents = eventsByDate[key] || []
          
          return (
            <div key={key} className={`border rounded-md p-3 ${isToday ? 'bg-primary/10 border-primary' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isToday ? 'text-primary' : ''}`}>
                    {day.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                  {dayEvents.length > 0 && (
                    <Badge variant="outline" className="text-xs">{dayEvents.length} events</Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {dayEvents.length > 0 ? (
                  dayEvents.map(ev => {
                    const isAllDay = !String(ev.startTime).includes('T') || String(ev.id).startsWith('holiday_')
                    return (
                      <div key={ev.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded text-sm">
                        <Clock className="h-3 w-3 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{ev.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {isAllDay ? 'All day' : `${formatTime(ev.startTime)} - ${formatTime(ev.endTime)}`}
                            {ev.location && ` • ${ev.location}`}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-sm text-muted-foreground italic">No events</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderDayView = () => {
    const key = currentDate.toISOString().slice(0,10)
    const dayEvents = eventsByDate[key] || []
    const today = new Date()
    const isToday = currentDate.toDateString() === today.toDateString()
    
    return (
      <div className="space-y-4">
        <div className={`border rounded-md p-4 ${isToday ? 'bg-primary/10 border-primary' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-medium ${isToday ? 'text-primary' : ''}`}>
              {currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            {dayEvents.length > 0 && (
              <Badge variant="outline">{dayEvents.length} events</Badge>
            )}
          </div>
          
          <div className="space-y-3">
            {dayEvents.length > 0 ? (
              dayEvents.map(ev => {
                const isAllDay = !String(ev.startTime).includes('T') || String(ev.id).startsWith('holiday_')
                return (
                  <div key={ev.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{ev.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {isAllDay ? 'All day' : `${formatTime(ev.startTime)} - ${formatTime(ev.endTime)}`}
                        {ev.location && ` • ${ev.location}`}
                      </div>
                      {ev.description && (
                        <div className="text-sm text-muted-foreground mt-1">{ev.description}</div>
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getEventStatusColor(ev.status)}`}
                    >
                      {ev.status}
                    </Badge>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No events scheduled</p>
                <p className="text-sm">Schedule a meeting to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <Card className={`p-6 border-dashed border-2 border-muted-foreground/25 ${className}`}>
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
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-montserrat-light text-foreground mb-2">Calendar</h2>
          <p className="text-muted-foreground font-montserrat-light">
            Manage your meetings and schedule events
          </p>
        </div>
      </div>

      {/* Connected Providers */}
      {connectedProviders.length > 0 && (
        <Card className="p-4">
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

      {/* View Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-medium px-4">
              {viewMode === 'month' && currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              {viewMode === 'week' && `Week of ${startOfWeek(currentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
              {viewMode === 'day' && currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="ml-2">
              Today
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              <Grid3X3 className="h-4 w-4 mr-2" />
              Month
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Week
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              <List className="h-4 w-4 mr-2" />
              Day
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        {viewMode === 'month' && (
          <>
            <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center">{d}</div>
              ))}
            </div>
            {renderMonthView()}
          </>
        )}
        
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Button 
          variant="outline" 
          size="lg" 
          className="h-16 font-light text-lg bg-transparent"
          onClick={() => { checkConnection(); if (isConnected && accessToken) { loadEventsForCurrentView() } }}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-3 h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button 
          variant="outline"
          size="lg" 
          className="h-16 font-light text-lg bg-transparent"
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          Disconnect
        </Button>
        <Button 
          size="lg" 
          className="h-16 font-light text-lg"
          onClick={() => setShowScheduleForm(!showScheduleForm)}
          disabled={!isConnected}
        >
          <Plus className="mr-3 h-6 w-6" />
          Schedule Meeting
        </Button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Card className="p-4">
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
        <Card className="p-6 border-primary/20">
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
    </div>
  )
}
