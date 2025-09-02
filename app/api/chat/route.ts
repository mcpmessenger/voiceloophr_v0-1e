import { type NextRequest, NextResponse } from "next/server"
import { AIService } from "@/lib/aiService"

export async function POST(request: NextRequest) {
  try {
    const { message, fileId, openaiKey, contextText } = await request.json()

    // Validate inputs
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ 
        error: "Missing or invalid message",
        details: "A non-empty user message is required",
        suggestion: "Please provide a question or instruction for the assistant"
      }, { status: 400 })
    }

    if (!openaiKey || typeof openaiKey !== "string") {
      return NextResponse.json({ 
        error: "Missing OpenAI API key",
        details: "An OpenAI API key is required to use chat",
        suggestion: "Add your API key in Settings and try again"
      }, { status: 400 })
    }

    // Basic key format check
    if (!openaiKey.startsWith("sk-") || openaiKey.length < 20) {
      return NextResponse.json({ 
        error: "Invalid OpenAI API key format",
        details: "Key should start with 'sk-' and be at least 20 characters",
        suggestion: "Double-check your API key in Settings"
      }, { status: 400 })
    }

    // Get file context if provided, or fall back to explicit contextText
    let context = ""
    if (typeof contextText === 'string' && contextText.trim().length > 0) {
      context = contextText
    } else if (fileId) {
      global.uploadedFiles = global.uploadedFiles || new Map()
      const fileData = global.uploadedFiles.get(fileId)
      if (fileData && fileData.extractedText) {
        context = fileData.extractedText
      }
    }

    // Clamp inputs to safe lengths
    const MAX_MESSAGE_CHARS = 1000
    const MAX_CONTEXT_CHARS = 12000
    const safeMessage = message.slice(0, MAX_MESSAGE_CHARS)
    const safeContext = context ? String(context).slice(0, MAX_CONTEXT_CHARS) : ""

    // Use a timeout to avoid hanging requests
    const withTimeout = <T>(promise: Promise<T>, ms: number) => {
      return Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms)) as Promise<T>,
      ])
    }

    const answerPromise = AIService.answerQuestion(
      safeContext || "",
      safeMessage,
      openaiKey
    )

    const result = await withTimeout(answerPromise, 30000)

    return NextResponse.json({
      success: true,
      response: result.content,
      hasContext: !!safeContext,
      metadata: result.metadata || {}
    })
  } catch (error) {
    console.error("Chat error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    const isTimeout = message.toLowerCase().includes("timeout")
    return NextResponse.json({ 
      error: "Chat failed",
      details: message,
      suggestion: isTimeout 
        ? "The request took too long. Please try again or simplify your question."
        : "Please check your API key and try again."
    }, { status: isTimeout ? 504 : 500 })
  }
}
