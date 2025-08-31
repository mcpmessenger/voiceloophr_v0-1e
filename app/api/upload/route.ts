import { type NextRequest, NextResponse } from "next/server"
import { EnhancedDocumentProcessor } from "../../../lib/enhancedDocumentProcessor"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type and size
    const maxSize = 100 * 1024 * 1024 // 100MB for audio/video files
    
    // Check if file type is supported by our enhanced processor
    if (!EnhancedDocumentProcessor.isSupported(file.type, file.name)) {
      return NextResponse.json({ 
        error: "Unsupported file type", 
        supportedTypes: EnhancedDocumentProcessor.getSupportedTypes(),
        fileName: file.name,
        mimeType: file.type
      }, { status: 400 })
    }

    if (file.size > maxSize) {
      return NextResponse.json({ error: `File too large (max ${Math.round(maxSize / (1024 * 1024))}MB)` }, { status: 400 })
    }

    // Convert file to buffer for processing
    const arrayBuffer = await file.arrayBuffer()
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "File is empty or corrupted" }, { status: 400 })
    }
    
    const buffer = Buffer.from(arrayBuffer)
    console.log(`File converted to buffer: ${buffer.length} bytes`)

    // Enhanced document processing using our robust parser
    let processedDocument
    
    try {
      console.log(`🚀 Starting enhanced processing for ${file.name}`)
      
      // Process the document with our enhanced processor
      processedDocument = await EnhancedDocumentProcessor.processDocument(
        buffer,
        file.name,
        file.type
      )
      
      console.log(`✅ Enhanced processing completed: ${processedDocument.wordCount} words extracted`)
      console.log(`📊 Processing method: ${processedDocument.metadata.processingMethod}`)
      console.log(`🎯 Confidence: ${processedDocument.metadata.confidence}`)
      
    } catch (processingError) {
      console.error("Enhanced processing error:", processingError)
      return NextResponse.json({ 
        error: "Enhanced processing failed",
        details: processingError instanceof Error ? processingError.message : "Unknown error",
        suggestion: "Try uploading a different file or check if the file is corrupted"
      }, { status: 400 })
    }

    // Generate unique file ID
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Store processed file data with enhanced information
    const fileData = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      buffer: buffer.toString("base64"),
      uploadedAt: new Date().toISOString(),
      
      // Enhanced processed content
      extractedText: processedDocument.text,
      wordCount: processedDocument.wordCount,
      pages: processedDocument.pages,
      
      // Rich metadata from enhanced processor
      metadata: {
        ...processedDocument.metadata,
        processingVersion: processedDocument.metadata.processingVersion,
        processingMethod: processedDocument.metadata.processingMethod,
        confidence: processedDocument.metadata.confidence,
        note: "Enhanced Smart Parser processing completed"
      },
      
      // Additional data from enhanced processor
      csvData: processedDocument.csvData,
      markdownData: processedDocument.markdownData,
      videoMetadata: processedDocument.videoMetadata,
      audioTranscription: processedDocument.audioTranscription,
      
      // Processing status
      processed: processedDocument.success,
      processingError: processedDocument.error || null,
      warnings: processedDocument.warnings || [],
      processingTime: processedDocument.processingTime
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
