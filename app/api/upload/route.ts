import { type NextRequest, NextResponse } from "next/server"
import { DocumentProcessor } from "@/lib/documentProcessor"

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

    // Process document to extract text content
    let processedDocument
    try {
      console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`)
      processedDocument = await DocumentProcessor.processDocument(
        buffer, 
        file.type, 
        file.name
      )
      console.log(`Document processed successfully: ${processedDocument.wordCount} words`)
    } catch (processingError) {
      console.error("Document processing error:", processingError)
      console.error("Error stack:", processingError instanceof Error ? processingError.stack : "No stack trace")
      return NextResponse.json({ 
        error: "Document processing failed", 
        details: processingError instanceof Error ? processingError.message : "Unknown error"
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
      extractedText: processedDocument.text,
      wordCount: processedDocument.wordCount,
      metadata: processedDocument.metadata,
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
      wordCount: processedDocument.wordCount,
      extractedText: processedDocument.text.substring(0, 200) + (processedDocument.text.length > 200 ? "..." : ""),
      metadata: processedDocument.metadata
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
