import { NextRequest, NextResponse } from 'next/server'
import { initializeGlobalStorage, getFileFromGlobalStorage } from '@/lib/global-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    // Initialize global storage and get file data
    const storage = initializeGlobalStorage()
    const fileData = getFileFromGlobalStorage(fileId)
    
    console.log(`🔍 Looking for fileId: ${fileId}`)
    console.log(`📊 Global storage has ${storage.size} files`)
    console.log(`🔑 Available fileIds: ${Array.from(storage.keys()).join(', ')}`)
    
    if (!fileData) {
      // Try to retrieve from client-side localStorage via a signed echo response
      // Not possible server-side; return detailed 404 to allow client fallback
      console.log(`❌ File not found: ${fileId}`)
      console.log(`📊 Available files in storage:`, Array.from(storage.keys()))
      return NextResponse.json(
        { 
          error: 'File not found',
          requestedFileId: fileId,
          availableFiles: Array.from(storage.keys()),
          storageSize: storage.size
        },
        { status: 404 }
      )
    }

    console.log(`✅ Found file: ${fileData.name} (${fileData.type})`)

    // Return file data with buffer for viewing
    return NextResponse.json({
      success: true,
      file: {
        id: fileData.id,
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
        buffer: fileData.buffer, // Base64 encoded file data
        extractedText: fileData.extractedText,
        uploadedAt: fileData.uploadedAt,
        processed: fileData.processed,
        processingMethod: fileData.metadata?.processingMethod,
        wordCount: fileData.wordCount
      }
    })

  } catch (error) {
    console.error('Get file error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
