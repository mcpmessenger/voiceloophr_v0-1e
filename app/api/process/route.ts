import { type NextRequest, NextResponse } from "next/server"
import { AIService } from "@/lib/aiService"

export async function POST(request: NextRequest) {
  try {
    const { fileId, openaiKey } = await request.json()

    if (!fileId) {
      return NextResponse.json({ 
        error: "Missing fileId", 
        details: "File ID is required for processing",
        suggestion: "Please provide a valid file ID"
      }, { status: 400 })
    }

    if (!openaiKey) {
      return NextResponse.json({ 
        error: "Missing OpenAI API key", 
        details: "OpenAI API key is required for AI processing",
        suggestion: "Please configure your OpenAI API key in the application settings"
      }, { status: 400 })
    }

    // Validate OpenAI key format (basic check)
    if (!openaiKey.startsWith('sk-') || openaiKey.length < 20) {
      return NextResponse.json({ 
        error: "Invalid OpenAI API key format", 
        details: "API key should start with 'sk-' and be at least 20 characters long",
        suggestion: "Please check your OpenAI API key format"
      }, { status: 400 })
    }

    // Get file from memory storage
    global.uploadedFiles = global.uploadedFiles || new Map()
    const fileData = global.uploadedFiles.get(fileId)

    if (!fileData) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check if file has already been processed
    if (!fileData.extractedText) {
      return NextResponse.json({ error: "File has not been processed yet" }, { status: 400 })
    }

    let transcription = ""
    let summary = ""

    // Handle audio/video transcription if needed
    if (fileData.type === "audio/wav" || fileData.type === "audio/mpeg" || fileData.type === "audio/mp3" || fileData.name?.toLowerCase().endsWith('.wav') || fileData.name?.toLowerCase().endsWith('.mp3') || fileData.type === "video/mp4") {
      try {
        const buffer = Buffer.from(fileData.buffer, "base64")
        const transcriptionResult = await AIService.transcribeAudio(buffer, openaiKey, fileData.name)
        transcription = transcriptionResult.content
        
        // Update file data with transcription
        fileData.transcription = transcription
        fileData.extractedText = transcription // Use transcription as extracted text for audio/video
      } catch (transcriptionError) {
        console.error("Transcription error:", transcriptionError)
        return NextResponse.json({ 
          error: "Audio transcription failed", 
          details: transcriptionError instanceof Error ? transcriptionError.message : "Unknown error"
        }, { status: 500 })
      }
    }

    // Generate AI summary using real OpenAI API
    // For Markdown files, skip AI analysis if it fails and use a simple summary
    const isMarkdownFile = fileData.name.toLowerCase().endsWith('.md') || fileData.type.includes('markdown')
    
    try {
      const summaryResult = await AIService.analyzeDocument(
        fileData.extractedText, 
        openaiKey, 
        'summarize'
      )
      summary = summaryResult.content
    } catch (summaryError) {
      console.error("Summary generation error:", summaryError)
      
      if (isMarkdownFile) {
        // For Markdown files, create a simple summary without AI
        const wordCount = fileData.extractedText.split(/\s+/).length
        const charCount = fileData.extractedText.length
        summary = `Markdown document processed successfully. Contains ${wordCount} words and ${charCount} characters. Ready for analysis and search.`
        console.log("Using Markdown-specific fallback summary")
      } else {
        // For other files, use generic fallback
        summary = `Document processed successfully. Content: ${fileData.extractedText.substring(0, 200)}...`
        console.log("Using generic fallback summary due to AI analysis failure")
      }
    }

    // Store processed results
    const processedData = {
      ...fileData,
      transcription,
      summary,
      processedAt: new Date().toISOString(),
      aiProcessed: true,
      aiProcessingError: null
    }

    global.uploadedFiles.set(fileId, processedData)

    return NextResponse.json({
      success: true,
      fileId,
      extractedText: fileData.extractedText.substring(0, 500) + (fileData.extractedText.length > 500 ? "..." : ""),
      summary,
      transcription: transcription ? transcription.substring(0, 200) + (transcription.length > 200 ? "..." : "") : null,
      wordCount: fileData.wordCount,
      metadata: fileData.metadata
    })
  } catch (error) {
    console.error("Processing error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
