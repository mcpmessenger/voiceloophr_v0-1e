import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id, 
      name, 
      type, 
      size, 
      extractedText, 
      summary, 
      processingMethod, 
      userId 
    } = body

    if (!supabaseAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database not configured' 
      }, { status: 500 })
    }

    // Save document to database
    const { data, error } = await supabaseAdmin
      .from('documents')
      .upsert({
        id,
        file_name: name,
        mime_type: type,
        file_size: size,
        content: extractedText,
        summary: summary,
        processing_method: processingMethod,
        user_id: userId,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'id' 
      })

    if (error) {
      console.error('Save document error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save document' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      document: data 
    })
  } catch (err) {
    console.error('Save document error:', err)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
