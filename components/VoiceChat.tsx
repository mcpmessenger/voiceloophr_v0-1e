"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Send, Bot, User, Loader2, Volume2, VolumeX } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface VoiceChatProps {
  documentText: string
  documentName: string
  isOpen: boolean
  onClose: () => void
}

export default function VoiceChat({ documentText, documentName, isOpen, onClose }: VoiceChatProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)
  const [lastTranscription, setLastTranscription] = useState<string>("")
  const [lastTranscriptionAt, setLastTranscriptionAt] = useState<number>(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
             setMessages([
         {
           id: '1',
           type: 'ai',
           content: `Hello! I'm your AI assistant. I have access to the COMPLETE "${documentName}" document and I'm ready to answer your questions about it. I can see all the content, so ask me anything specific - I'll reference the actual document details in my answers.`,
           timestamp: new Date()
         }
       ])
    }
  }, [isOpen, documentName, messages.length])

  // Attempt autoplay when a new audioUrl is set and the <audio> element mounts
  useEffect(() => {
    const el = audioRef.current
    if (!audioUrl || !el) return

    // Ensure element has the latest src
    if (!el.src || el.src !== audioUrl) {
      try { el.pause() } catch {}
      el.src = audioUrl
      el.load()
    }

    const tryPlay = () => {
      el.play().then(() => {
        setIsPlaying(true)
        setAutoplayBlocked(false)
      }).catch((err) => {
        console.warn('Autoplay failed (effect):', err)
        setAutoplayBlocked(true)
        setIsPlaying(false)
      })
    }

    tryPlay()
    el.oncanplaythrough = tryPlay
  }, [audioUrl])

  const startRecording = async () => {
    try {
      // Guard: mic access requires secure context (HTTPS or localhost) and mediaDevices support
      const isBrowser = typeof window !== 'undefined'
      const isSecure = isBrowser && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
      const hasMedia = typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

      if (!isSecure || !hasMedia) {
        console.warn('Microphone unavailable', { isSecure, hasMedia, host: isBrowser ? window.location.host : 'n/a' })
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'ai',
            content: 'Microphone access is unavailable in this context. Please open the app via https:// or http://localhost (not a LAN IP), then try again. You can still type your question below.',
            timestamp: new Date()
          }
        ])
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await processAudioInput(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setIsListening(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsListening(false)
    }
  }

  const processAudioInput = async (audioBlob: Blob) => {
    try {
      setIsLoading(true)
      
      // Convert audio to text via our server STT proxy to avoid CORS
      const openaiKey = localStorage.getItem('voiceloop_openai_key') || localStorage.getItem('openai_api_key')
      if (!openaiKey) {
        throw new Error('OpenAI API key not configured')
      }

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.wav')
      formData.append('openaiKey', openaiKey)

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Speech-to-text failed')
      }

      const result = await response.json()
      const transcribedText = (result.transcription || result.text || "").trim()

      // Basic noise filtering: ignore too-short/low-signal phrases and common false positives
      const normalized = transcribedText.toLowerCase()
      const wordCount = normalized.split(/\s+/).filter(Boolean).length
      const shortStoplist = new Set(["you", "test", "yeah", "uh", "um", "okay", "ok"])
      const now = Date.now()
      const isRepeat = normalized === lastTranscription.toLowerCase() && (now - lastTranscriptionAt) < 8000

      if (!normalized || normalized.length < 5 || wordCount < 2 || shortStoplist.has(normalized) || isRepeat) {
        // Surface a lightweight note in the thread but don't hit the AI
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'ai',
          content: 'Heard very short or unclear audio. Please try again or speak a full question.',
          timestamp: new Date()
        }])
        setLastTranscription(transcribedText)
        setLastTranscriptionAt(now)
        return
      }

      setLastTranscription(transcribedText)
      setLastTranscriptionAt(now)

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: transcribedText,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])

      // Get AI response
      await getAIResponse(transcribedText)

    } catch (error) {
      console.error('Error processing audio:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Sorry, I had trouble processing your audio. Please try typing your question instead.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const getAIResponse = async (question: string) => {
    try {
      setIsLoading(true)

      const openaiKey = localStorage.getItem('voiceloop_openai_key') || localStorage.getItem('openai_api_key')
      if (!openaiKey) {
        throw new Error('OpenAI API key not configured')
      }



      // Create context-aware prompt with FULL document content
      const prompt = `You are an AI assistant helping a user understand a document called "${documentName}". 

IMPORTANT: You have access to the COMPLETE document content below. Use ALL available information to provide comprehensive, accurate answers.

Document Content:
${documentText}

User Question: ${question}

Please provide a helpful, accurate answer based on the COMPLETE document content. Be conversational but professional. If the question cannot be answered from the document content, say so politely and suggest what information might be needed.

Answer:`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
                     messages: [
             {
               role: 'system',
               content: 'You are a helpful AI assistant that answers questions about documents. You have access to the complete document content and should use ALL available information to provide comprehensive, accurate answers. Be conversational but professional, and always reference specific details from the document when possible.'
             },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        let detail = ''
        try {
          const errBody = await response.json()
          detail = errBody?.error?.message || JSON.stringify(errBody)
        } catch (_) {
          try { detail = await response.text() } catch { detail = '' }
        }
        console.error('OpenAI chat error:', response.status, response.statusText, detail)
        // Show a helpful, user-facing message
        let friendly = 'Sorry, I could not reach the AI service.'
        if (response.status === 401) {
          friendly = 'OpenAI key is invalid or missing. Please update your key in Settings and try again.'
        } else if (response.status === 429) {
          friendly = 'OpenAI quota exceeded for this key. Please check your plan/billing or try again later.'
        }
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'ai',
          content: friendly,
          timestamp: new Date()
        }])
        return
      }

      const result = await response.json()
      const aiResponse = result.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

      // Add AI message
      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])

      // Generate speech for AI response
      await generateSpeech(aiResponse)

    } catch (error) {
      console.error('Error getting AI response:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const generateSpeech = async (text: string) => {
    try {
      // Prefer ElevenLabs if configured; fallback to OpenAI TTS
      const elevenKey = localStorage.getItem('voiceloop_elevenlabs_key')
      if (elevenKey) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, elevenlabsKey: elevenKey })
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.error || 'ElevenLabs TTS failed')
        }

        const audioBlob = await response.blob()
        console.log('TTS blob size(bytes):', audioBlob.size)
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        return
      }

      const openaiKey = localStorage.getItem('voiceloop_openai_key') || localStorage.getItem('openai_api_key')
      if (!openaiKey) return

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'alloy',
          speed: 1
        })
      })

      if (!response.ok) return

      const audioBlob = await response.blob()
      console.log('TTS blob size(bytes):', audioBlob.size)
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
    } catch (error) {
      console.error('Error generating speech:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInputText('')

    await getAIResponse(inputText)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleAudio = () => {
    const el = audioRef.current
    if (!el) return
    try {
      if (isPlaying) {
        el.pause()
        setIsPlaying(false)
      } else {
        el.play().then(() => setIsPlaying(true)).catch((err) => {
          // Ignore AbortError (happens if paused mid-play), show controls otherwise
          if (!(err && (err.name === 'AbortError' || err.name === 'NotAllowedError'))) {
            console.warn('Manual play failed:', err)
          }
          setAutoplayBlocked(true)
          setIsPlaying(false)
        })
      }
    } catch (err) {
      console.warn('Toggle audio error:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col bg-background border-2 border-primary/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary/20">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-light">Voice Chat - {documentName}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <div className="px-4 py-2 border-t border-primary/20">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAudio}
                className="h-8 w-8 p-0"
              >
                {isPlaying ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <span className="text-xs text-muted-foreground">
                {isPlaying ? 'Playing AI response...' : (autoplayBlocked ? 'AI response ready — tap play' : 'AI response ready')}
              </span>
            </div>
            <audio ref={audioRef} src={audioUrl ?? undefined} onEnded={() => setIsPlaying(false)} controls={autoplayBlocked} />
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-primary/20">
          <div className="flex gap-2">
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className="h-10 w-10 p-0"
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about the document..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              size="sm"
              className="h-10 px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {isRecording ? 'Recording...' : isListening ? 'Listening...' : 'Ready'}
            </Badge>
            {isRecording && (
              <div className="flex gap-1">
                <div className="w-1 h-3 bg-red-500 animate-pulse rounded"></div>
                <div className="w-1 h-3 bg-red-500 animate-pulse rounded" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-3 bg-red-500 animate-pulse rounded" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
