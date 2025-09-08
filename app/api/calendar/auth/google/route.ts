import { NextRequest, NextResponse } from 'next/server'
import { GoogleCalendarService } from '@/lib/services/google-calendar'

export async function POST(request: NextRequest) {
  try {
    // Use the same OAuth credentials as Google Drive
    const googleService = new GoogleCalendarService({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/auth/google`,
    })

    const authUrl = googleService.getAuthUrl(true) // Force account selection
    
    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Google OAuth URL generated using existing Drive credentials'
    })
  } catch (error) {
    console.error('Google auth URL generation failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate Google OAuth URL. Please check your Google OAuth credentials.'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.json({
        success: false,
        error: 'Authorization code not provided'
      }, { status: 400 })
    }

    const googleService = new GoogleCalendarService({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/auth/google`,
    })

    const tokens = await googleService.getTokens(code)
    
    // Store tokens in database or session
    // For now, we'll return them to the client
    return NextResponse.json({
      success: true,
      tokens,
      message: 'Google Calendar connected successfully'
    })
  } catch (error) {
    console.error('Google token exchange failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to exchange authorization code for tokens'
    }, { status: 500 })
  }
}
