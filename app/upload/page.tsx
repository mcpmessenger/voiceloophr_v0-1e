"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, File, Music, Video, X, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from "lucide-react"

interface UploadedFile {
  id: string
  file: File
  status: "uploading" | "processing" | "completed" | "error"
  progress: number
  error?: string
  fileId?: string
}

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "text/markdown": [".md"],
  "text/csv": [".csv"],
  "audio/wav": [".wav"],
  "video/mp4": [".mp4"],
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const router = useRouter()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: "uploading" as const,
      progress: 0,
    }))

    setFiles((prev) => [...prev, ...newFiles])

    newFiles.forEach((uploadedFile) => {
      processFile(uploadedFile.id)
    })
  }, [])

  const processFile = async (fileId: string) => {
    const uploadedFile = files.find((f) => f.id === fileId)
    if (!uploadedFile) return

    try {
      // Upload file
      const formData = new FormData()
      formData.append("file", uploadedFile.file)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Upload failed")
      }

      const uploadResult = await uploadResponse.json()

      // Update with file ID from server
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, fileId: uploadResult.fileId, progress: 100, status: "processing" } : f,
        ),
      )

      // Get OpenAI key from localStorage
      const openaiKey = localStorage.getItem("voiceloop_openai_key")
      if (!openaiKey) {
        throw new Error("OpenAI API key not configured. Please add it in Settings.")
      }

      // Process file with AI
      const processResponse = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: uploadResult.fileId,
          openaiKey,
        }),
      })

      if (!processResponse.ok) {
        throw new Error("Processing failed")
      }

      // Mark as completed
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "completed", progress: 100 } : f)))
    } catch (error) {
      console.error("File processing error:", error)
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "error",
                error: error instanceof Error ? error.message : "Processing failed",
              }
            : f,
        ),
      )
    }
  }

  const simulateProgress = (fileId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 10

      setFiles((prev) =>
        prev.map((file) => {
          if (file.id === fileId && file.status === "uploading") {
            if (progress >= 90) {
              clearInterval(interval)
              return { ...file, progress: 90 }
            }
            return { ...file, progress: Math.min(progress, 90) }
          }
          return file
        }),
      )
    }, 200)
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const viewResults = (uploadedFile: UploadedFile) => {
    if (uploadedFile.fileId) {
      router.push(`/results/${uploadedFile.fileId}`)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.includes("pdf")) return <FileText className="h-6 w-6" />
    if (file.type.includes("audio")) return <Music className="h-6 w-6" />
    if (file.type.includes("video")) return <Video className="h-6 w-6" />
    return <File className="h-6 w-6" />
  }

  const getStatusColor = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return "bg-blue-500"
      case "processing":
        return "bg-yellow-500"
      case "completed":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-thin border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <Image src="/images/voiceloop-logo.png" alt="VoiceLoop" width={40} height={40} className="rounded-lg" />
                <span className="text-xl font-light text-foreground">VoiceLoop</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
                <Link href="/settings">Settings</Link>
              </Button>
              <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-foreground mb-4 text-balance">Upload Your Documents</h1>
          <p className="text-lg text-muted-foreground font-light text-pretty">
            Drag and drop your files or click to browse. We support PDF, Markdown, CSV, audio, and video files.
          </p>
        </div>

        {/* Upload Zone */}
        <Card className="mb-8">
          <div
            {...getRootProps()}
            className={`p-12 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
              isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <Upload className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-lg font-light text-primary">Drop your files here...</p>
              ) : (
                <>
                  <p className="text-lg font-light text-foreground mb-2">
                    Drag and drop your files here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports PDF, Markdown, CSV, WAV, MP4 • Max 50MB per file
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-light text-foreground mb-4">Processing Files ({files.length})</h2>

            {files.map((uploadedFile) => (
              <Card key={uploadedFile.id} className="p-6">
                <div className="flex items-center gap-4">
                  <div className="text-muted-foreground">{getFileIcon(uploadedFile.file)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-foreground truncate">{uploadedFile.file.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {(uploadedFile.file.size / 1024 / 1024).toFixed(1)} MB
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                      <Progress value={uploadedFile.progress} className="flex-1 h-2" />
                      <div className="flex items-center gap-2 min-w-0">
                        {uploadedFile.status === "uploading" && (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            <span className="text-sm text-muted-foreground">Uploading...</span>
                          </>
                        )}
                        {uploadedFile.status === "processing" && (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                            <span className="text-sm text-muted-foreground">Processing with AI...</span>
                          </>
                        )}
                        {uploadedFile.status === "completed" && (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">Complete</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 font-light bg-transparent"
                              onClick={() => viewResults(uploadedFile)}
                            >
                              View Results
                            </Button>
                          </>
                        )}
                        {uploadedFile.status === "error" && (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-600">{uploadedFile.error || "Error"}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadedFile.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
