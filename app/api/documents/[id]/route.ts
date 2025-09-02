import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Delete the document from the database
    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (error) {
      console.error('Database deletion error:', error)
      return NextResponse.json(
        { error: 'Failed to delete document from database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Document deleted successfully',
      documentId
    })

  } catch (error) {
    console.error('Document deletion error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
