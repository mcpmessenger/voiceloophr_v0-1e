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
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  AlertCircle,
  RefreshCw
} from "lucide-react"
import { Navigation } from "@/components/navigation"
import { CalendarServiceBrowser } from "@/lib/services/calendar-browser"

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
  const [calendarService] = useState(() => new CalendarServiceBrowser())
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showScheduleForm, setShowScheduleForm] = useState(false)

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
    loadEvents()
  }, [])

  const checkConnection = async () => {
    try {
      const connected = await calendarService.testConnection()
      setIsConnected(connected)
    } catch (error) {
      console.error('Calendar connection check failed:', error)
      setIsConnected(false)
    }
  }

  const loadEvents = async () => {
    if (!isConnected) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await calendarService.getUpcomingEvents(30) // Next 30 days
      if (result.success && result.events) {
        setEvents(result.events)
      }
    } catch (error) {
      console.error('Failed to load events:', error)
      setError('Failed to load calendar events')
    } finally {
      setIsLoading(false)
    }
  }

  const handleScheduleMeeting = async () => {
    if (!scheduleForm.startTime || !scheduleForm.endTime || !scheduleForm.title) {
      setError('Please provide title, start time, and end time')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const attendees = scheduleForm.attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email)

      const result = await calendarService.scheduleMeeting(
        scheduleForm.title,
        scheduleForm.startTime,
        scheduleForm.endTime,
        attendees,
        scheduleForm.description,
        scheduleForm.location
      )

      if (result.success) {
        setShowScheduleForm(false)
        setScheduleForm({
          title: '',
          description: '',
          startTime: '',
          endTime: '',
          attendees: '',
          location: ''
        })
        loadEvents() // Refresh events
      } else {
        setError('Failed to schedule meeting')
      }
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
      setError('Failed to schedule meeting')
    } finally {
      setIsLoading(false)
    }
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
              onClick={loadEvents}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar className="h-6 w-6" />
              <div>
                <p className="font-medium">Calendar Integration</p>
                <p className="text-sm">Connect your calendar to view and schedule events</p>
              </div>
            </div>
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={checkConnection}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Connect Calendar
            </Button>
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

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm mt-4">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

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

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : events.length > 0 ? (
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

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm mt-4">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
