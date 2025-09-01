import { type NextRequest, NextResponse } from "next/server"

// Use global storage to match the process API route
declare global {
  var uploadedFiles: Map<string, any>
}

if (!global.uploadedFiles) {
  global.uploadedFiles = new Map()
  console.log('🔧 Global storage initialized')
}

// Textract client removed - using fixed PDF parser instead

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large (max ${Math.round(maxSize / (1024 * 1024))}MB)` 
      }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'text/plain', 'text/markdown', 'text/csv',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff',
      'audio/wav', 'audio/mp3', 'audio/mpeg',
      'video/mp4', 'video/avi', 'video/mov'
    ]

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|csv|pdf|doc|docx|jpg|jpeg|png|gif|bmp|tiff|wav|mp3|mp4|avi|mov)$/i)) {
      return NextResponse.json({ 
        error: "Unsupported file type",
        supportedTypes: allowedTypes,
        fileName: file.name,
        mimeType: file.type
      }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "File is empty or corrupted" }, { status: 400 })
    }
    
    const buffer = Buffer.from(arrayBuffer)
    console.log(`File uploaded: ${file.name}, ${buffer.length} bytes, type: ${file.type}`)

    // Text extraction for different file types
    let extractedText = ""
    let wordCount = 0
    let processingMethod = "basic"
    
    if (file.type.startsWith('text/') || file.name.match(/\.(txt|md|csv)$/i)) {
      // Direct text extraction for text files (FREE)
      try {
        extractedText = buffer.toString('utf-8')
        wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length
        processingMethod = "direct"
        console.log(`Text extracted directly: ${wordCount} words`)
      } catch (textError) {
        console.warn(`Text extraction failed for ${file.name}:`, textError)
        extractedText = ""
        wordCount = 0
      }
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Use our fixed PDF parser (FREE)
      try {
        console.log(`Processing PDF with Fixed PDF Parser: ${file.name}`)
        
        // Import and use our minimal PDF parser
        const { MinimalPDFParser } = require('../../../lib/pdf-parser-minimal.js')
        const pdfResult = await MinimalPDFParser.parsePDF(buffer)
        
        if (pdfResult.hasErrors) {
          throw new Error(`PDF parsing failed: ${pdfResult.errors?.join(', ')}`)
        }
        
        extractedText = pdfResult.text
        wordCount = pdfResult.wordCount
        processingMethod = "pdf-parse-fixed"
        console.log(`PDF processed successfully: ${wordCount} words, confidence: ${(pdfResult.confidence * 100).toFixed(1)}%`)
      } catch (pdfError) {
        console.warn(`Fixed PDF parsing failed for ${file.name}:`, pdfError)
        extractedText = ""
        wordCount = 0
        processingMethod = "basic"
      }
    } else if (file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/i)) {
      // Use Textract for image files ($0.0015 per page)
      try {
        console.log(`Processing image with Textract: ${file.name}`)
        extractedText = "[Image content - Textract processing required]"
        wordCount = 0
        processingMethod = "textract"
        console.log(`Image marked for Textract processing`)
      } catch (textractError) {
        console.warn(`Textract processing failed for ${file.name}:`, textractError)
        extractedText = ""
        wordCount = 0
        processingMethod = "basic"
      }
    }

    // Generate unique file ID
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Store file data
    const fileData = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      buffer: buffer.toString("base64"),
      uploadedAt: new Date().toISOString(),
      
      // Basic processing info
      processed: false,
      processingError: null,
      warnings: [],
      
      // Content (filled during upload for text files)
      extractedText: extractedText,
      wordCount: wordCount,
      pages: 1,
      
      // Metadata
      metadata: {
        processingVersion: "2.0.0",
        processingMethod: processingMethod,
        confidence: processingMethod === "direct" ? 1.0 : 
                   processingMethod === "pdf-parse-fixed" ? 1.0 : 0.5,
        note: processingMethod === "direct" ? "Text extracted during upload" : 
              processingMethod === "pdf-parse-fixed" ? "PDF processed with fixed parser" :
              processingMethod === "textract" ? "File uploaded, Textract processing required" :
              "File uploaded successfully, ready for processing"
      }
    }

    // Store in global memory
    global.uploadedFiles.set(fileId, fileData)
    console.log(`✅ File stored in global memory: ${fileId} (${file.name})`)
    console.log(`📊 Total files in global storage: ${global.uploadedFiles.size}`)
    
    // Note: localStorage will be handled client-side after successful upload
    
    // Return success response
    return NextResponse.json({
      success: true,
      fileId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      wordCount: wordCount,
      extractedText: extractedText ? extractedText.substring(0, 200) + (extractedText.length > 200 ? "..." : "") : "",
      message: processingMethod === "direct" ? "File uploaded and text extracted successfully" : 
               processingMethod === "textract" ? "File uploaded successfully. Text extraction requires AWS Textract processing." :
               "File uploaded successfully and ready for processing"
    })

  } catch (error) {
    console.error("Upload error:", error)
    
    // Provide more specific error messages
    let errorMessage = "Upload failed"
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes("File too large")) {
        errorMessage = "File size exceeds limit"
        statusCode = 400
      } else if (error.message.includes("Unsupported file type")) {
        errorMessage = "File type not supported"
        statusCode = 400
      } else if (error.message.includes("No file provided")) {
        errorMessage = "No file was provided"
        statusCode = 400
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      suggestion: "Please check the file size and type, then try again"
    }, { status: statusCode })
  }
}

// GET endpoint to retrieve uploaded files (for debugging)
export async function GET() {
  try {
    const files = Array.from(global.uploadedFiles.values()).map(file => ({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: file.uploadedAt,
      processed: file.processed
    }))
    
    return NextResponse.json({
      success: true,
      files,
      count: files.length
    })
  } catch (error) {
    console.error("GET files error:", error)
    return NextResponse.json({ 
      error: "Failed to retrieve files" 
    }, { status: 500 })
  }
}
