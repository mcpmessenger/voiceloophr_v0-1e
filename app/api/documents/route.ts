import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Try to get documents from database if Supabase is configured
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin.from('documents').select('*').order('uploaded_at', { ascending: false })
        if (userId) {
          query = query.eq('user_id', userId)
        }

        const { data, error } = await query
        if (error) {
          console.error('Database fetch error:', error)
          // Fall through to return empty array instead of failing
        } else {
          return NextResponse.json({ success: true, documents: data ?? [] })
        }
      } catch (dbError) {
        console.error('Database connection error:', dbError)
        // Fall through to return empty array
      }
    }

    // If database is not available or fails, return empty array
    // The dashboard will fall back to localStorage data
    return NextResponse.json({ success: true, documents: [] })
  } catch (err) {
    console.error('Documents GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


