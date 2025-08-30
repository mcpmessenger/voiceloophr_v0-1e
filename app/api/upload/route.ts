import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type and size
    const allowedTypes = [
      "application/pdf", 
      "text/markdown", 
      "text/csv", 
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "audio/wav", 
      "video/mp4"
    ]
    const maxSize = 50 * 1024 * 1024 // 50MB

    if (!allowedTypes.includes(file.type) && 
        !file.name.toLowerCase().endsWith(".md") && 
        !file.name.toLowerCase().endsWith(".txt") &&
        !file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 })
    }

    // Convert file to buffer for processing
    const arrayBuffer = await file.arrayBuffer()
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "File is empty or corrupted" }, { status: 400 })
    }
    
    const buffer = Buffer.from(arrayBuffer)
    console.log(`File converted to buffer: ${buffer.length} bytes`)

    // Basic text extraction (temporarily simplified)
    let extractedText = ""
    let wordCount = 0
    
    try {
      if (file.type === "text/plain" || file.type === "text/markdown" || file.type === "text/csv") {
        extractedText = buffer.toString('utf-8')
        wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length
      } else if (file.type === "application/pdf") {
        // For PDFs, just store the buffer for now
        extractedText = `PDF document uploaded successfully (${buffer.length} bytes). Smart Parser integration temporarily disabled.`
        wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length
      } else {
        extractedText = `File uploaded successfully (${buffer.length} bytes). Type: ${file.type}`
        wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length
      }
      
      console.log(`Basic processing completed: ${wordCount} words extracted`)
      
    } catch (processingError) {
      console.error("Basic processing error:", processingError)
      return NextResponse.json({ 
        error: "Basic processing failed",
        details: processingError instanceof Error ? processingError.message : "Unknown error",
        suggestion: "Try uploading a different file or check if the file is corrupted"
      }, { status: 400 })
    }

    // Generate unique file ID
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Store processed file data
    const fileData = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      buffer: buffer.toString("base64"),
      uploadedAt: new Date().toISOString(),
      // Store processed content
      extractedText: extractedText,
      wordCount: wordCount,
      metadata: {
        processingVersion: "1.0.0 (basic)",
        note: "Smart Parser temporarily disabled for debugging"
      },
      // Processing status
      processed: true,
      processingError: null
    }

    // Store in memory (in real app, would use database)
    global.uploadedFiles = global.uploadedFiles || new Map()
    global.uploadedFiles.set(fileId, fileData)

    return NextResponse.json({
      success: true,
      fileId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      wordCount: wordCount,
      extractedText: extractedText.substring(0, 200) + (extractedText.length > 200 ? "..." : ""),
      metadata: fileData.metadata
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ 
      error: "Upload failed", 
      details: error instanceof Error ? error.message : "Unknown error",
      suggestion: "Check server logs for more details"
    }, { status: 500 })
  }
}
