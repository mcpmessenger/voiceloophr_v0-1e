import { NextRequest, NextResponse } from 'next/server'
import { OpenAIService } from '@/lib/services/openai'

export async function POST(request: NextRequest) {
  try {
    const { text, fileName, fileType, openaiKey } = await request.json()

    if (!text || !fileName || !openaiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: text, fileName, or openaiKey' },
        { status: 400 }
      )
    }

    // Initialize OpenAI service
    const openaiService = new OpenAIService({ apiKey: openaiKey })

    // Perform real AI analysis
    const analysis = await openaiService.analyzeDocument(text, fileName, fileType)

    return NextResponse.json({
      success: true,
      analysis,
      message: 'Document analyzed successfully with OpenAI'
    })

  } catch (error) {
    console.error('AI analysis API error:', error)
    
    return NextResponse.json(
      { 
        error: 'AI analysis failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: 'Using basic text analysis instead'
      },
      { status: 500 }
    )
  }
}
