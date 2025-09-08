"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Users,
  Plus,
  MoreHorizontal
} from "lucide-react"
// Dashboard mini-calendar now reads tokens directly and uses the real calendar API

interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  attendees: string[]
  location?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
}

interface MiniCalendarProps {
  className?: string
  showUpcoming?: boolean
  maxEvents?: number
}

export function MiniCalendar({ 
  className = "", 
  showUpcoming = true, 
  maxEvents = 3 
}: MiniCalendarProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
  }, [])

  useEffect(() => {
    if (showUpcoming) {
      loadUpcomingEvents()
    }
  }, [showUpcoming, isConnected, accessToken])

  const checkConnection = async () => {
    try {
      const stored = localStorage.getItem('google_calendar_tokens')
      if (stored) {
        const tokens = JSON.parse(stored)
        setAccessToken(tokens.access_token || null)
        setRefreshToken(tokens.refresh_token || null)
        setIsConnected(Boolean(tokens.access_token))
      } else {
        setIsConnected(false)
      }
    } catch (error) {
      setIsConnected(false)
    }
  }

  const loadUpcomingEvents = async () => {
    if (!isConnected || !accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/calendar/real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-events', days: 7, accessToken, refreshToken })
      })
      const result = await res.json()
      if (result.success && Array.isArray(result.events)) {
        setUpcomingEvents(result.events.slice(0, maxEvents))
      } else if (!result.success && result.error) {
        setError(result.error)
      }
    } catch (error) {
      console.error('Failed to load upcoming events:', error)
      setError('Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200'
      case 'tentative': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!isConnected) {
    return (
      <Card className={`p-4 border-dashed border-2 border-muted-foreground/25 ${className}`}>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Calendar className="h-5 w-5" />
          <div className="flex-1">
            <p className="font-medium text-sm">Calendar</p>
            <p className="text-xs">Connect to view events</p>
          </div>
        </div>
        <Button 
          className="mt-3 w-full" 
          variant="outline" 
          size="sm"
          onClick={() => {
            checkConnection();
            // Navigate to /calendar for full connect flow
            window.location.href = '/calendar'
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Calendar className="h-4 w-4 mr-2" />
          )}
          Connect
        </Button>
      </Card>
    )
  }

  return (
    <Card className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Calendar</h3>
          <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
            Connected
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={loadUpcomingEvents}
          disabled={isLoading}
          className="h-6 w-6 p-0"
        >
          {isLoading ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <MoreHorizontal className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Upcoming Events */}
      {showUpcoming && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <div key={event.id} className="group">
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{event.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getEventStatusColor(event.status)}`}
                      >
                        {event.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(event.startTime)}</span>
                      <span>•</span>
                      <span>{formatTime(event.startTime)}</span>
                      {event.location && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{event.location}</span>
                          </div>
                        </>
                      )}
                      {event.attendees.length > 0 && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{event.attendees.length}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming events</p>
              <p className="text-xs">Schedule meetings to get started</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}

          {/* Quick Action */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={() => {
              // This would open a calendar modal or navigate to calendar page
              console.log('Open calendar')
            }}
          >
            <Plus className="h-3 w-3 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      )}
    </Card>
  )
}
