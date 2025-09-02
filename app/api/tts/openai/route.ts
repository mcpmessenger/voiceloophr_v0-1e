import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, openaiKey, voice } = await request.json()

    if (!text || !openaiKey) {
      return NextResponse.json({ error: "Missing text or OpenAI key" }, { status: 400 })
    }

    const trimmed = String(text).slice(0, 1200)
    const chosenVoice = voice || 'alloy'

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: trimmed,
        voice: chosenVoice,
        speed: 1
      })
    })

    if (!response.ok) {
      let detail = ''
      try {
        const ct = response.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const j = await response.json()
          detail = j?.error?.message || JSON.stringify(j)
        } else {
          detail = await response.text()
        }
      } catch {}
      return NextResponse.json({ error: `OpenAI TTS failed: HTTP ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ''}` }, { status: 500 })
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('audio/')) {
      return NextResponse.json({ error: 'Invalid response from OpenAI TTS - no audio content received' }, { status: 500 })
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline; filename="tts-audio.mp3"',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('OpenAI TTS route error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}


