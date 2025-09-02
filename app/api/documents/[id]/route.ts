import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const documentId = params.id
    if (!documentId) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('documents').delete().eq('id', documentId)
    if (error) {
      console.error('Delete document error:', error)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Documents DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


