import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type and size
    const allowedTypes = ["application/pdf", "text/markdown", "text/csv", "audio/wav", "video/mp4"]
    const maxSize = 50 * 1024 * 1024 // 50MB

    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".md")) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 })
    }

    // Convert file to buffer for processing
    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate unique file ID
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Simulate file storage (in real app, would save to disk/cloud)
    const fileData = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      buffer: buffer.toString("base64"),
      uploadedAt: new Date().toISOString(),
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
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
