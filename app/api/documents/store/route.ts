import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { content, fileName, userId } = await request.json()

    if (!content || !fileName) {
      return NextResponse.json({ error: 'Content and fileName are required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({ user_id: userId ?? null, file_name: fileName, content })
      .select()
      .single()

    if (docError || !document) {
      console.error('Error storing document:', docError)
      return NextResponse.json({ error: 'Failed to store document' }, { status: 500 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content
    })

    const embedding = embeddingResponse.data[0]?.embedding
    if (!embedding) {
      return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 })
    }

    const { error: embeddingError } = await supabaseAdmin
      .from('document_embeddings')
      .insert({ document_id: document.id, embedding })

    if (embeddingError) {
      console.error('Error storing embedding:', embeddingError)
      return NextResponse.json({ error: 'Failed to store document embedding' }, { status: 500 })
    }

    return NextResponse.json({ success: true, documentId: document.id, message: 'Document stored and vectorized successfully' })
  } catch (err) {
    console.error('Error in document storage:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


