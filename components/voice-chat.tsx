"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Volume2, Send, Loader2, MessageCircle, Search } from "lucide-react"
import { SophisticatedLoader } from "@/components/sophisticated-loader"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  isVoice?: boolean
  isSearchResult?: boolean
  searchResults?: any[]
}

interface VoiceChatProps {
  fileId?: string
  fileName?: string
  documentText?: string
  documentName?: string
}

export default function VoiceChat({ fileId, fileName, documentText, documentName }: VoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [audioProgress, setAudioProgress] = useState(0)
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        type: "assistant",
        content: (documentName || fileName)
          ? `Hello! I'm ready to discuss "${documentName || fileName}" with you. You can ask me questions about the document using text or voice.`
          : "Hello! I'm your AI assistant. How can I help you today?",
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
    }
  }, [fileId, fileName, documentName, messages.length])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('voiceloop_auto_speak')
      if (saved) setAutoSpeak(saved === 'true')
    } catch {}
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data])
        }
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
      }

      setMediaRecorder(recorder)
      setAudioChunks([])
      recorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recording:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      setIsProcessing(true)
    }
  }

  const processVoiceInput = async (audioBlob: Blob) => {
    try {
      const openaiKey = localStorage.getItem("voiceloop_openai_key")
      if (!openaiKey) {
        throw new Error("OpenAI API key not configured. Please add your API key in Settings.")
      }

      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.wav")
      formData.append("openaiKey", openaiKey)

      const response = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Speech-to-text failed")
      }

      const result = await response.json()

      if (!result.success || !result.transcription) {
        throw new Error("Invalid response from STT API")
      }

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content: result.transcription,
        timestamp: new Date(),
        isVoice: true,
      }

      setMessages((prev) => [...prev, userMessage])

      // Get AI response
      await sendMessage(result.transcription, true)
    } catch (error) {
      console.error("Voice processing error:", error)
      
      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Voice Processing Error: ${error instanceof Error ? error.message : "Failed to process voice input"}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    if (audioChunks.length > 0 && !isRecording) {
      const audioBlob = new Blob(audioChunks, { type: "audio/wav" })
      processVoiceInput(audioBlob)
    }
  }, [audioChunks, isRecording])

  const sendMessage = async (message: string, isVoiceResponse = false) => {
    if (!message.trim()) return

    try {
      // Check if this is a search query
      if (isSearchMode || message.toLowerCase().includes('search') || message.toLowerCase().includes('find')) {
        await performSearch(message)
        return
      }

      const openaiKey = localStorage.getItem("voiceloop_openai_key")
      if (!openaiKey) {
        throw new Error("OpenAI API key not configured")
      }

      // Add user message if not from voice
      if (!isVoiceResponse) {
        const userMessage: Message = {
          id: Date.now().toString(),
          type: "user",
          content: message,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, userMessage])
        setInputMessage("")
      }

      // Get AI response
      // Try to include local document context from ALL local files if available and no fileId
      let contextText: string | undefined
      if (!fileId) {
        try {
          const existingRaw = localStorage.getItem('voiceloop_uploaded_files') || '{}'
          const existing: Record<string, any> = JSON.parse(existingRaw)
          const all: any[] = Object.values(existing)
          if (Array.isArray(all) && all.length > 0) {
            // Concatenate up to N documents' contents, newest first
            const sorted = all.sort((a: any, b: any) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime())
            const MAX_TOTAL = 12000
            let acc = ''
            for (const doc of sorted) {
              if (typeof doc.extractedText === 'string' && doc.extractedText.length > 0) {
                const header = `\n\n[Document: ${doc.name || 'Untitled'}]\n`
                const remaining = MAX_TOTAL - acc.length
                if (remaining <= 0) break
                const slice = String(doc.extractedText).slice(0, Math.max(0, remaining - header.length))
                acc += header + slice
              }
              if (acc.length >= MAX_TOTAL) break
            }
            if (acc.length > 0) contextText = acc
          }
        } catch {}
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          fileId,
          openaiKey,
          contextText: documentText && documentText.length > 0 ? String(documentText).slice(0, 12000) : contextText,
        }),
      })

      if (!response.ok) {
        // Try to surface detailed server error with details/suggestion
        let serverError = "Chat failed"
        try {
          const data = await response.json()
          const err = data?.error || serverError
          const details = data?.details ? ` Details: ${data.details}` : ""
          const suggestion = data?.suggestion ? ` Suggestion: ${data.suggestion}` : ""
          serverError = `${err}.${details}${suggestion}`.trim()
        } catch {
          try {
            const text = await response.text()
            if (text) serverError = `${serverError} (${text})`
          } catch {}
        }
        throw new Error(serverError)
      }

      const result = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: result.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Convert response to speech if voice was used or autoSpeak is enabled
      if (isVoiceResponse || autoSpeak) {
        await speakResponse(result.response)
      }
    } catch (error) {
      console.error("Send message error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: error instanceof Error 
          ? `Chat Error: ${error.message}` 
          : "Sorry, I encountered an unexpected error. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const performSearch = async (query: string) => {
    try {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content: query,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInputMessage("")
      setIsProcessing(true)

      // Check if we're in guest mode (no Supabase configured)
      let isGuestMode = false
      try {
        const { getSupabaseBrowser } = await import('@/lib/supabase-browser')
        const supabase = getSupabaseBrowser()
        if (!supabase) {
          isGuestMode = true
        }
      } catch {
        isGuestMode = true
      }

      if (isGuestMode) {
        // Handle guest mode search on client side
        await handleGuestModeSearch(query)
        return
      }

      // Include userId if signed in
      let userId: string | undefined
      try {
        const { getSupabaseBrowser } = await import('@/lib/supabase-browser')
        const supabase = getSupabaseBrowser()
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          userId = user?.id
        }
      } catch {}

      const response = await fetch("/api/search/semantic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, userId }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        let err: any = {}
        try { err = JSON.parse(text) } catch {}
        console.error('Search failed:', err || text)
        throw new Error(err?.error || text || "Search failed")
      }

      const data = await response.json()
      const searchResults = data.results || []

      const searchMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: searchResults.length > 0 
          ? `Found ${searchResults.length} results for "${query}":` 
          : `No results found for "${query}". Try different keywords or upload more documents.`,
        timestamp: new Date(),
        isSearchResult: true,
        searchResults: searchResults
      }

      setMessages((prev) => [...prev, searchMessage])

    } catch (error) {
      console.error("Search error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: error instanceof Error 
          ? `Search Error: ${error.message}` 
          : "Sorry, I encountered an error while searching. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGuestModeSearch = async (query: string) => {
    try {
      // Get chunks from localStorage
      const storedChunks = JSON.parse(localStorage.getItem('voiceloop_guest_chunks') || '[]')
      
      if (storedChunks.length === 0) {
        const noResultsMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: `No documents found to search. Please upload some documents first.`,
          timestamp: new Date(),
          isSearchResult: true,
          searchResults: []
        }
        setMessages((prev) => [...prev, noResultsMessage])
        return
      }

      // Simple text-based search for guest mode
      const queryLower = query.toLowerCase()
      const results: any[] = []

      for (const chunk of storedChunks) {
        const chunkText = chunk.chunkText || chunk.chunk_text || ''
        const chunkLower = chunkText.toLowerCase()
        
        // Calculate simple relevance score based on text matching
        let score = 0
        const words = queryLower.split(' ').filter(word => word.length > 2)
        
        for (const word of words) {
          if (chunkLower.includes(word)) {
            score += 1
          }
        }
        
        // Normalize score
        const relevanceScore = words.length > 0 ? score / words.length : 0
        
        if (relevanceScore >= 0.1) { // Lower threshold for guest mode
          results.push({
            id: chunk.id,
            fileName: chunk.fileName || chunk.file_name,
            title: chunk.fileName || chunk.file_name,
            snippet: chunkText.substring(0, 200) + '...',
            relevanceScore: relevanceScore,
            fileType: 'document',
            uploadedAt: chunk.createdAt || chunk.created_at,
            matchedChunks: [chunkText.substring(0, 150) + '...']
          })
        }
      }

      // Sort by relevance and limit results
      const sortedResults = results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10)

      console.log(`Guest mode search found ${sortedResults.length} results for query: "${query}"`)
      
      const searchMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: sortedResults.length > 0 
          ? `Found ${sortedResults.length} results for "${query}":` 
          : `No results found for "${query}". Try different keywords or upload more documents.`,
        timestamp: new Date(),
        isSearchResult: true,
        searchResults: sortedResults
      }

      setMessages((prev) => [...prev, searchMessage])
    } catch (error) {
      console.error("Guest mode search error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Search failed. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const speakResponse = async (text: string) => {
    try {
      // Determine TTS provider preference
      const provider = (localStorage.getItem('voiceloop_tts_provider') as 'auto' | 'elevenlabs' | 'openai' | null) || 'auto'
      const elevenlabsKey = localStorage.getItem("voiceloop_elevenlabs_key")
      const elevenlabsVoice = localStorage.getItem('voiceloop_elevenlabs_voice') || ''

      setIsSpeaking(true)

      // Helper to play blob
      const playBlob = async (blob: Blob) => {
        const audioUrl = URL.createObjectURL(blob)
        const audio = new Audio(audioUrl)
        audio.preload = "auto"
        audio.muted = false
        audio.volume = 1
        setCurrentAudio(audio)

        const tryPlay = () => {
          audio.play().catch((error) => {
            console.error("Audio playback failed:", error)
            setPendingAudioUrl(audioUrl)
            setIsSpeaking(false)
          })
        }
        audio.onloadedmetadata = tryPlay
        audio.oncanplaythrough = tryPlay
        audio.ontimeupdate = () => {
          if (audio.duration) setAudioProgress((audio.currentTime / audio.duration) * 100)
        }
        audio.onended = () => {
          setIsSpeaking(false)
          setAudioProgress(0)
          setCurrentAudio(null)
          URL.revokeObjectURL(audioUrl)
        }
        audio.onerror = (error) => {
          console.error("Audio error:", error)
          setIsSpeaking(false)
          setAudioProgress(0)
          setCurrentAudio(null)
          URL.revokeObjectURL(audioUrl)
        }
      }

      const tryElevenLabs = async (): Promise<boolean> => {
        if (!elevenlabsKey) return false
        try {
          const resp = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.slice(0, 1000), elevenlabsKey, voiceId: elevenlabsVoice || undefined })
          })
          if (!resp.ok) throw new Error(await resp.text())
          const blob = await resp.blob()
          await playBlob(blob)
          return true
        } catch (e) {
          console.warn('ElevenLabs TTS failed, falling back:', e)
          return false
        }
      }

      const tryOpenAITTS = async (): Promise<boolean> => {
        try {
          const openaiKey = localStorage.getItem('voiceloop_openai_key') || ''
          if (!openaiKey) return false
          const resp = await fetch('/api/tts/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.slice(0, 800), openaiKey, voice: 'alloy' })
          })
          if (!resp.ok) throw new Error(await resp.text())
          const blob = await resp.blob()
          await playBlob(blob)
          return true
        } catch (e) {
          console.warn('OpenAI TTS failed:', e)
          return false
        }
      }

      let ok = false
      if (provider === 'elevenlabs') ok = await tryElevenLabs()
      else if (provider === 'openai') ok = await tryOpenAITTS()
      else ok = (await tryElevenLabs()) || (await tryOpenAITTS())
      if (!ok) {
        // Final fallback: use browser Web Speech API if available
        try {
          const synth: any = (typeof window !== 'undefined' ? (window as any).speechSynthesis : undefined)
          if (synth && typeof SpeechSynthesisUtterance !== 'undefined') {
            const utter = new SpeechSynthesisUtterance(String(text).slice(0, 800))
            utter.onend = () => {
              setIsSpeaking(false)
              setAudioProgress(0)
              setCurrentAudio(null)
            }
            utter.onerror = () => {
              setIsSpeaking(false)
              setAudioProgress(0)
              setCurrentAudio(null)
            }
            synth.speak(utter)
            setIsSpeaking(true)
            return
          }
        } catch {}
        throw new Error('All TTS providers failed')
      }

    } catch (error) {
      console.error("TTS error:", error)
      setIsSpeaking(false)
      setAudioProgress(0)
      setCurrentAudio(null)
      
      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `TTS Error: ${error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Failed to generate speech')}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      setIsSpeaking(false)
      setAudioProgress(0)
      setCurrentAudio(null)
    }
  }

  const playAudio = () => {
    // Retry playing current audio or pending URL
    if (currentAudio) {
      currentAudio.play().catch((error) => {
        console.error("Manual play failed:", error)
      })
      return
    }
    if (pendingAudioUrl) {
      const audio = new Audio(pendingAudioUrl)
      audio.preload = "auto"
      audio.muted = false
      audio.volume = 1
      setCurrentAudio(audio)
      audio.play().then(() => setIsSpeaking(true)).catch((error) => {
        console.error("Manual play (pending) failed:", error)
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputMessage)
  }

  return (
    <Card className="flex flex-col h-[600px] border-thin">
      {/* Header */}
      <div className="p-4 border-b border-thin">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h3 className="font-light text-lg">Smart Chat</h3>
            {fileId && (
              <Badge variant="outline" className="font-light">
                {fileName}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isSearchMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSearchMode(!isSearchMode)}
              className="font-light"
            >
              <Search className="h-4 w-4 mr-2" />
              {isSearchMode ? "Search Mode" : "Chat Mode"}
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {message.isVoice && <Mic className="h-3 w-3" />}
                <span className="text-xs opacity-70">{message.timestamp.toLocaleTimeString()}</span>
              </div>
              <p className="text-sm font-light whitespace-pre-wrap">{message.content}</p>
              
              {/* Search Results */}
              {message.isSearchResult && message.searchResults && message.searchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.searchResults.slice(0, 3).map((result, index) => (
                    <div key={index} className="p-2 bg-background/50 rounded border text-xs">
                      <div className="font-medium text-foreground">{result.title}</div>
                      <div className="text-muted-foreground mt-1">{result.snippet}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-muted-foreground">
                          {Math.round(result.relevanceScore * 100)}% match
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => window.open(`/results/${result.id}`, '_blank')}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                  {message.searchResults.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      ... and {message.searchResults.length - 3} more results
                    </div>
                  )}
                </div>
              )}
              
              {message.type === "assistant" && !message.isSearchResult && (
                <div className="mt-1 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => {
                      speakResponse(message.content).catch((e) => console.warn('Speak failed:', e))
                    }}
                    disabled={isSpeaking}
                    title="Speak this response"
                  >
                    <Volume2 className="h-3 w-3 mr-1" /> Speak
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-thin">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isSearchMode ? "Search across all documents..." : "Type your message or use voice..."}
            className="flex-1 font-light"
            disabled={isProcessing}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`font-light ${isRecording ? "bg-red-500 text-white" : "bg-transparent"}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="h-4 w-4">
                <SophisticatedLoader size="sm" />
              </div>
            ) : isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`font-light ${autoSpeak ? 'border-primary text-primary' : 'bg-transparent'}`}
            onClick={async () => {
              const next = !autoSpeak
              setAutoSpeak(next)
              try { localStorage.setItem('voiceloop_auto_speak', String(next)) } catch {}
              // Also speak the latest assistant reply immediately for quick feedback
              if (!isSpeaking) {
                const lastAssistant = [...messages].reverse().find(m => m.type === 'assistant')
                if (lastAssistant && lastAssistant.content) {
                  try { await speakResponse(lastAssistant.content) } catch (e) { console.warn('Speak latest failed:', e) }
                }
              }
            }}
            title="Toggle auto-speak and speak latest reply"
          >
            <Volume2 className="h-4 w-4" />
          </Button>

          <Button type="submit" size="sm" className="font-light" disabled={!inputMessage.trim() || isProcessing}>
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {isSpeaking && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Volume2 className="h-4 w-4 animate-pulse" />
              <span className="font-light">Speaking response...</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={playAudio}
                className="h-6 px-2 text-xs"
              >
                Play
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={stopAudio}
                className="ml-auto h-6 px-2 text-xs"
              >
                Stop
              </Button>
            </div>
            
            {/* Audio Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-100 ease-out"
                style={{ width: `${audioProgress}%` }}
              />
            </div>
          </div>
        )}

        {pendingAudioUrl && (
          <div className="mt-3 space-y-2">
            <div className="text-sm text-muted-foreground font-light">
              Autoplay was blocked. Tap play to hear the response.
            </div>
            <audio
              src={pendingAudioUrl}
              controls
              autoPlay
              onPlay={() => {
                setIsSpeaking(true)
              }}
              onEnded={() => {
                setIsSpeaking(false)
                setAudioProgress(0)
                URL.revokeObjectURL(pendingAudioUrl)
                setPendingAudioUrl(null)
              }}
              onError={() => {
                setIsSpeaking(false)
                setPendingAudioUrl(null)
              }}
              className="w-full"
            />
          </div>
        )}
      </div>
    </Card>
  )
}
