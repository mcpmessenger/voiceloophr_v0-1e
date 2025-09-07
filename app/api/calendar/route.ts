import { NextRequest, NextResponse } from 'next/server'

// Mock calendar service for production
class MockCalendarService {
  async testConnection(): Promise<boolean> {
    return true
  }

  async getUpcomingEvents(days: number = 7) {
    // Return mock events
    const mockEvents = [
      {
        id: 'event_1',
        title: 'Team Meeting',
        description: 'Weekly team sync',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        attendees: ['team@company.com'],
        status: 'confirmed',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      },
      {
        id: 'event_2',
        title: 'Project Review',
        description: 'Monthly project review meeting',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
        attendees: ['manager@company.com', 'dev@company.com'],
        status: 'confirmed',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    ]

    return {
      success: true,
      events: mockEvents.slice(0, Math.min(days, mockEvents.length)),
      count: mockEvents.length,
      period: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      },
      provider: 'mock'
    }
  }

  async scheduleMeeting(
    title: string,
    startTime: string,
    endTime: string,
    attendees: string[] = [],
    description?: string,
    location?: string
  ) {
    // Mock successful scheduling
    return {
      success: true,
      event: {
        id: `event_${Date.now()}`,
        title,
        description,
        startTime,
        endTime,
        attendees,
        location,
        status: 'confirmed',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    }
  }
}

const calendarService = new MockCalendarService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'test-connection':
        const connected = await calendarService.testConnection()
        return NextResponse.json({ success: true, connected })

      case 'upcoming-events':
        const days = parseInt(searchParams.get('days') || '7')
        const result = await calendarService.getUpcomingEvents(days)
        return NextResponse.json(result)

      case 'schedule-meeting':
        // This would be handled by POST
        return NextResponse.json({ error: 'Use POST method for scheduling meetings' }, { status: 405 })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'schedule-meeting':
        const result = await calendarService.scheduleMeeting(
          params.title,
          params.startTime,
          params.endTime,
          params.attendees || [],
          params.description,
          params.location
        )
        return NextResponse.json(result)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
