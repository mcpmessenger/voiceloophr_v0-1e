"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Volume2, Send, Loader2, MessageCircle } from "lucide-react"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  isVoice?: boolean
}

interface VoiceChatProps {
  fileId?: string
  fileName?: string
}

export default function VoiceChat({ fileId, fileName }: VoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
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
        content: fileId
          ? `Hello! I'm ready to discuss "${fileName}" with you. You can ask me questions about the document using text or voice.`
          : "Hello! I'm your AI assistant. How can I help you today?",
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
    }
  }, [fileId, fileName, messages.length])

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
        throw new Error("OpenAI API key not configured")
      }

      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.wav")
      formData.append("openaiKey", openaiKey)

      const response = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Speech-to-text failed")
      }

      const result = await response.json()

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          fileId,
          openaiKey,
        }),
      })

      if (!response.ok) {
        throw new Error("Chat failed")
      }

      const result = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: result.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Convert response to speech if voice was used
      if (isVoiceResponse) {
        await speakResponse(result.response)
      }
    } catch (error) {
      console.error("Send message error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Sorry, I encountered an error. Please check your API keys in Settings.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const speakResponse = async (text: string) => {
    try {
      const elevenlabsKey = localStorage.getItem("voiceloop_elevenlabs_key")
      if (!elevenlabsKey) {
        console.log("ElevenLabs key not configured, skipping TTS")
        return
      }

      setIsSpeaking(true)

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          elevenlabsKey,
        }),
      })

      if (!response.ok) {
        throw new Error("TTS failed")
      }

      // Simulate audio playback
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (error) {
      console.error("TTS error:", error)
    } finally {
      setIsSpeaking(false)
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
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-light text-lg">Voice Chat</h3>
          {fileId && (
            <Badge variant="outline" className="font-light">
              {fileName}
            </Badge>
          )}
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
            placeholder="Type your message or use voice..."
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
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          <Button type="submit" size="sm" className="font-light" disabled={!inputMessage.trim() || isProcessing}>
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {isSpeaking && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Volume2 className="h-4 w-4 animate-pulse" />
            <span className="font-light">Speaking response...</span>
          </div>
        )}
      </div>
    </Card>
  )
}
