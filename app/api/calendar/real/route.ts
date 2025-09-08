import { NextRequest, NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/services/google-calendar'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    // Check if we have Google Calendar credentials
    if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar credentials not configured'
      }, { status: 500 })
    }

    const googleService = new GoogleCalendarService({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: 'https://v0-voice-loop-hr-platform.vercel.app/api/calendar/auth/google',
      accessToken: params.accessToken,
      refreshToken: params.refreshToken
    })

    switch (action) {
      case 'test-connection':
        const connected = await googleService.testConnection()
        return NextResponse.json({ 
          success: true, 
          connected,
          message: connected ? 'Connected to Google Calendar' : 'Not connected to Google Calendar'
        })

      case 'get-events':
        const events = await googleService.getUpcomingEvents(params.days || 7)
        return NextResponse.json({
          success: true,
          events,
          message: `Found ${events.length} events`
        })

      case 'schedule-meeting':
        if (!params.accessToken) {
          return NextResponse.json({
            success: false,
            error: 'Access token required for scheduling meetings'
          }, { status: 401 })
        }

        const event = await googleService.scheduleMeeting(
          params.title,
          params.startTime,
          params.endTime,
          params.attendees || [],
          params.description,
          params.location
        )
        
        return NextResponse.json({
          success: true,
          event,
          message: 'Meeting scheduled successfully in Google Calendar'
        })

      case 'get-auth-url':
        const authUrl = googleService.getAuthUrl(true)
        return NextResponse.json({
          success: true,
          authUrl,
          message: 'Google Calendar OAuth URL generated'
        })

      default:
        return NextResponse.json({ 
          success: false,
          error: 'Invalid action' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Real calendar API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar credentials not configured'
      }, { status: 500 })
    }

    const googleService = new GoogleCalendarService({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: 'https://v0-voice-loop-hr-platform.vercel.app/api/calendar/auth/google'
    })

    switch (action) {
      case 'auth-url':
        const authUrl = googleService.getAuthUrl(true)
        return NextResponse.json({
          success: true,
          authUrl,
          message: 'Google Calendar OAuth URL generated'
        })

      default:
        return NextResponse.json({ 
          success: false,
          error: 'Invalid action' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Real calendar API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
