import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    let query = supabaseAdmin.from('documents').select('*').order('uploaded_at', { ascending: false })
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    if (error) {
      console.error('Fetch documents error:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    return NextResponse.json({ success: true, documents: data ?? [] })
  } catch (err) {
    console.error('Documents GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


