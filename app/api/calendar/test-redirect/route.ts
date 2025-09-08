import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI || 
                       `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/auth/google`
    
    return NextResponse.json({
      success: true,
      redirectUri,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      message: 'Current redirect URI configuration'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get redirect URI'
    }, { status: 500 })
  }
}
