import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface SearchRequestBody {
  query: string
  userId?: string
  limit?: number
  threshold?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SearchRequestBody
    const query = body?.query?.trim()
    const userId = body?.userId
    const limit = Math.min(Math.max(body?.limit ?? 10, 1), 50)
    const threshold = body?.threshold ?? 0.5

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured', code: 'OPENAI_KEY_MISSING' }, { status: 500 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured', code: 'SUPABASE_MISSING' }, { status: 500 })
    }

    let queryEmbedding: number[] | null = null
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      })
      queryEmbedding = embeddingResponse.data[0]?.embedding as unknown as number[]
    } catch (e: any) {
      console.error('OpenAI embedding error:', e)
      return NextResponse.json({ error: 'Failed to generate query embedding', code: 'EMBEDDING_ERROR' }, { status: 500 })
    }

    if (!queryEmbedding) {
      return NextResponse.json({ error: 'Failed to generate query embedding', code: 'NO_EMBEDDING' }, { status: 500 })
    }

    const { data: results, error } = await supabaseAdmin.rpc('search_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      user_id_filter: userId ?? null
    })

    if (error) {
      console.error('Vector search error:', error)
      return NextResponse.json({ error: 'Vector search failed', code: 'VECTOR_SEARCH_ERROR', details: error.message || error }, { status: 500 })
    }

    return NextResponse.json({ success: true, results: results ?? [], totalResults: results?.length ?? 0 })
  } catch (err) {
    console.error('Semantic search error:', err)
    return NextResponse.json({ error: 'Internal server error during search', code: 'UNKNOWN' }, { status: 500 })
  }
}


