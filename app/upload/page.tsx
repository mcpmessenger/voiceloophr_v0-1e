"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Upload, FileText, File, Music, Video, X, CheckCircle, AlertCircle, ArrowLeft, Loader2, Eye } from "lucide-react"
import DocumentViewer from "@/components/DocumentViewer"

interface UploadedFile {
  id: string
  file: File
  status: "uploading" | "processing" | "completed" | "error"
  progress: number
  error?: string
  warning?: string
  fileId?: string
  showTextractButton?: boolean
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
  const [progressIntervals, setProgressIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map())
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFileData, setSelectedFileData] = useState<any>(null)
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
      // Start progress simulation
      const progressInterval = simulateProgress(uploadedFile.id)
      if (progressInterval) {
        setProgressIntervals(prev => new Map(prev).set(uploadedFile.id, progressInterval))
      }
      // Process file after a short delay to show progress
      setTimeout(() => {
        processFile(uploadedFile.id, uploadedFile)
      }, 1000)
    })
  }, [])

  const processFile = async (fileId: string, uploadedFile: UploadedFile) => {
    if (!uploadedFile) return

    try {
      // Check API key availability first
      const openaiKey = localStorage.getItem("voiceloop_openai_key")
      if (!openaiKey) {
        console.warn("OpenAI API key not found - file will be uploaded but not processed with AI")
        // Continue with upload but mark for manual processing
      }

      // Upload file
      const formData = new FormData()
      formData.append("file", uploadedFile.file)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || `Upload failed with status ${uploadResponse.status}`
        throw new Error(errorMessage)
      }

      const uploadResult = await uploadResponse.json()

      // Save to localStorage for persistence (client-side)
      try {
        const fileData = {
          id: uploadResult.fileId,
          name: uploadedFile.file.name,
          type: uploadedFile.file.type,
          size: uploadedFile.file.size,
          buffer: "", // We don't need to store the full buffer in localStorage
          uploadedAt: new Date().toISOString(),
          processed: false,
          processingError: null,
          warnings: [],
          extractedText: uploadResult.extractedText || "",
          wordCount: uploadResult.wordCount || 0,
          pages: 1,
          metadata: {
            processingVersion: "1.0.0",
            processingMethod: "upload",
            confidence: 0.8,
            note: "File uploaded successfully"
          }
        }
        
        // Save to localStorage
        const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
        existing[uploadResult.fileId] = fileData
        localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
        console.log(`✅ File ${uploadResult.fileId} saved to localStorage`)
      } catch (error) {
        console.warn('Failed to save to localStorage:', error)
      }

      // Update with file ID from server
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, fileId: uploadResult.fileId, progress: 100, status: "processing" } : f,
        ),
      )

      // Add a small delay to show processing status
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if we have the OpenAI key for AI processing
      if (!openaiKey) {
        // Mark as completed without AI processing if no key
        setFiles((prev) => prev.map((f) => f.id === fileId ? { 
          ...f, 
          status: "completed", 
          progress: 100,
          warning: "File uploaded successfully but AI processing skipped - OpenAI API key not configured"
        } : f))
        
        // Show user-friendly message
        toast("File was uploaded and processed, but AI analysis was skipped because OpenAI API key is not configured. You can configure it in Settings.")
        return
      }

             // For PDFs and images, we need to extract text first before AI processing
       if (uploadedFile.file.type.includes('pdf') || uploadedFile.file.type.includes('image')) {
         setFiles((prev) => prev.map((f) => f.id === fileId ? { 
           ...f, 
           status: "completed", 
           progress: 100,
           warning: "File uploaded successfully. Click 'Process with Textract' to extract text content.",
           showTextractButton: true
         } : f))
         
         toast("PDF/image uploaded. Click 'Process with Textract' to extract text content.")
         return
       }

      // Process file with AI with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const processResponse = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: uploadResult.fileId,
          openaiKey,
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!processResponse.ok) {
        throw new Error("Processing failed")
      }

      // Mark as completed
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "completed", progress: 100 } : f)))
      
      // Automatically redirect to results page after successful processing
      toast.success("Document processed successfully! Redirecting to results...")
      setTimeout(() => {
        router.push(`/results/${uploadResult.fileId}`)
      }, 1500)
    } catch (error) {
      console.error("File processing error:", error)
      let errorMessage = "Processing failed"
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Processing timed out. Please try again."
        } else {
          errorMessage = error.message
        }
      }
      
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "error",
                error: errorMessage,
              }
            : f,
        ),
      )
    }
  }

  const simulateProgress = (fileId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15

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
    }, 150)

    // Store interval reference for cleanup
    return interval
  }

  const removeFile = (fileId: string) => {
    // Clear progress interval if it exists
    const interval = progressIntervals.get(fileId)
    if (interval) {
      clearInterval(interval)
      setProgressIntervals(prev => {
        const newMap = new Map(prev)
        newMap.delete(fileId)
        return newMap
      })
    }
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const retryFile = (fileId: string) => {
    const fileToRetry = files.find(f => f.id === fileId)
    if (fileToRetry) {
      // Reset status and retry
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "uploading", progress: 0, error: undefined } : f
        )
      )
      processFile(fileId, fileToRetry)
    }
  }

  const processWithPdfParse = async (fileId: string) => {
    const fileToProcess = files.find((f) => f.id === fileId)
    if (!fileToProcess || !fileToProcess.fileId) return

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: "processing", progress: 50 } : f
      )
    )

    try {
      console.log(`🚀 Processing with PDF-Parse: ${fileToProcess.file.name}`)

      // Use the Textract API with pdf-parse method
      const response = await fetch('/api/textract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileToProcess.fileId,
          processingMethod: 'pdf-parse'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.details || errorData.error || "PDF-Parse processing failed"
        throw new Error(errorMessage)
      }

      const result = await response.json()

      // Save to localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
        if (fileToProcess.fileId && existing[fileToProcess.fileId]) {
          existing[fileToProcess.fileId] = {
            ...existing[fileToProcess.fileId],
            extractedText: result.extractedText,
            wordCount: result.wordCount,
            processed: true,
            processingMethod: "pdf-parse",
            processingTime: new Date().toISOString(),
            metadata: {
              ...(existing[fileToProcess.fileId]?.metadata || {}),
              processingMethod: "pdf-parse",
              confidence: result.confidence,
              note: "Text extracted using pdf-parse"
            }
          }
          localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
          console.log(`✅ Updated file ${fileToProcess.fileId} in localStorage with pdf-parse results`)
        }
      } catch (error) {
        console.warn('Failed to update localStorage:', error)
      }

      // Update file with extracted content
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { 
            ...f, 
            status: "completed", 
            progress: 100,
            warning: "Text extracted successfully using pdf-parse",
            showTextractButton: false
          } : f
        )
      )

      toast.success(`Successfully extracted ${result.wordCount} words using pdf-parse! Redirecting to results...`)
      
      // Automatically redirect to results page after successful processing
      setTimeout(() => {
        router.push(`/results/${fileToProcess.fileId}`)
      }, 1500)

    } catch (error) {
      console.error("PDF-Parse processing error:", error)
      
      const errorMessage = error instanceof Error ? error.message : "PDF-Parse processing failed. Please try again."
      
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { 
            ...f, 
            status: "error", 
            error: errorMessage,
            showTextractButton: true
          } : f
        )
      )

      toast(`Failed to extract text: ${errorMessage}`)
    }
  }

  const processWithTextract = async (fileId: string) => {
    const fileToProcess = files.find(f => f.id === fileId)
    if (!fileToProcess || !fileToProcess.fileId) return

    try {
      // Update status to processing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "processing", progress: 50 } : f
        )
      )

      // Call Textract API
      const response = await fetch("/api/textract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: fileToProcess.fileId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.details || errorData.error || "Textract processing failed"
        throw new Error(`Textract processing failed: ${errorMessage}`)
      }

      const result = await response.json()

             // Save updated file data to localStorage
       try {
         const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
         if (existing[fileToProcess.fileId]) {
           existing[fileToProcess.fileId] = {
             ...existing[fileToProcess.fileId],
             extractedText: result.extractedText,
             wordCount: result.wordCount,
             processed: true,
             processingMethod: result.processingMethod || "textract",
             processingTime: new Date().toISOString(),
             metadata: {
               ...existing[fileToProcess.fileId].metadata,
               processingMethod: result.processingMethod || "textract",
               confidence: result.confidence || 0.95,
               note: result.processingMethod === "textract" ? "Text extracted using AWS Textract" : 
                     result.processingMethod === "pdf-parse" ? "Text extracted using pdf-parse" :
                     "Text extracted using fallback method"
             }
           }
           localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
           console.log(`✅ Updated file ${fileToProcess.fileId} in localStorage with ${result.processingMethod || "textract"} results`)
         }
       } catch (error) {
         console.warn('Failed to update localStorage:', error)
       }

      // Update file with extracted content
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { 
            ...f, 
            status: "completed", 
            progress: 100,
            warning: "Text extracted successfully using AWS Textract",
            showTextractButton: false
          } : f
        )
      )

      toast.success(`Successfully extracted ${result.wordCount} words using AWS Textract! Redirecting to results...`)
      
      // Automatically redirect to results page after successful Textract processing
      setTimeout(() => {
        router.push(`/results/${fileToProcess.fileId}`)
      }, 1500)

    } catch (error) {
      console.error("Textract processing error:", error)
      
      const errorMessage = error instanceof Error ? error.message : "Textract processing failed. Please try again."
      
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { 
            ...f, 
            status: "error", 
            error: errorMessage,
            showTextractButton: true
          } : f
        )
      )

      toast(`Failed to extract text: ${errorMessage}`)
    }
  }

  const viewResults = (uploadedFile: UploadedFile) => {
    if (uploadedFile.fileId) {
      router.push(`/results/${uploadedFile.fileId}`)
    }
  }

  const openDocumentViewer = (uploadedFile: UploadedFile) => {
    setSelectedFile(uploadedFile.file)
    setSelectedFileData({
      type: uploadedFile.file.type,
      processed: uploadedFile.status === "completed",
      processingMethod: uploadedFile.showTextractButton ? "pending" : "upload"
    })
    setDocumentViewerOpen(true)
  }

  const getFileIcon = (file: File) => {
    if (file.type.includes("pdf")) return <FileText className="h-6 w-6 text-red-500 drop-shadow-sm" />
    if (file.type.includes("audio")) return <Music className="h-6 w-6 text-blue-500 drop-shadow-sm" />
    if (file.type.includes("video")) return <Video className="h-6 w-6 text-purple-500 drop-shadow-sm" />
    return <File className="h-6 w-6 text-primary drop-shadow-sm" />
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

  // Cleanup progress intervals when component unmounts
  useEffect(() => {
    return () => {
      progressIntervals.forEach(interval => clearInterval(interval))
    }
  }, [progressIntervals])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-primary/20 bg-gradient-to-r from-background to-primary/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <Image src="/images/voiceloop-logo.png" alt="VoiceLoop" width={40} height={40} className="rounded-lg" />
                <span className="text-xl font-light text-foreground">VoiceLoop</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md" asChild>
                <Link href="/settings">Settings</Link>
              </Button>
              <Button variant="outline" size="sm" className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4 text-primary" />
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
            className={`p-12 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
              isDragActive ? "border-primary bg-primary/5 shadow-lg" : "border-primary/30 hover:border-primary/50 bg-gradient-to-br from-background to-primary/5"
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <Upload className="h-16 w-16 text-primary mx-auto mb-4 drop-shadow-lg" />
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
            
            {/* API Key Status */}
            {!localStorage.getItem("voiceloop_openai_key") && (
              <Card className="p-4 border-2 border-yellow-200 bg-yellow-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      OpenAI API Key Not Configured
                    </p>
                    <p className="text-xs text-yellow-700">
                      Files will be uploaded and processed, but AI analysis will be skipped. 
                      <Link href="/settings" className="text-yellow-800 underline ml-1 hover:text-yellow-900">
                        Configure API key in Settings
                      </Link>
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {files.map((uploadedFile) => (
                             <Card key={uploadedFile.id} className="p-6 border-2 border-primary/20 hover:border-primary/30 transition-colors duration-200 shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="text-muted-foreground">{getFileIcon(uploadedFile.file)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-foreground truncate">{uploadedFile.file.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {(uploadedFile.file.size / 1024 / 1024).toFixed(1)} MB
                      </Badge>
                      {uploadedFile.fileId && (
                        <Badge variant="outline" className="text-xs">
                          {uploadedFile.file.type.split("/")[1]?.toUpperCase() || "FILE"}
                        </Badge>
                      )}
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
                            <span className="text-sm text-muted-foreground">
                              {uploadedFile.fileId ? "Processing with AI..." : "Uploading..."}
                            </span>
                          </>
                        )}
                        {uploadedFile.status === "completed" && (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">Complete</span>
                            {uploadedFile.warning && (
                              <span className="text-sm text-yellow-600 ml-2">⚠️ {uploadedFile.warning}</span>
                            )}
                          </>
                        )}
                        
                        {/* Document Viewer Button - Available for all file states */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2 font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                          onClick={() => openDocumentViewer(uploadedFile)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Document
                        </Button>
                        
                        {/* Textract Button - Only for completed files that need processing */}
                        {uploadedFile.status === "completed" && uploadedFile.showTextractButton && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                              onClick={() => processWithTextract(uploadedFile.id)}
                            >
                              Process with Textract
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                              onClick={() => processWithPdfParse(uploadedFile.id)}
                            >
                              Process with PDF-Parse
                            </Button>
                          </>
                        )}
                        
                        {/* View Results Button - Only for completed files */}
                        {uploadedFile.status === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-2 font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                            onClick={() => viewResults(uploadedFile)}
                          >
                            View Results
                          </Button>
                        )}
                        {uploadedFile.status === "error" && (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-600">{uploadedFile.error || "Error"}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2 font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                              onClick={() => retryFile(uploadedFile.id)}
                            >
                              Retry
                            </Button>
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

       {/* Document Viewer Modal */}
       <DocumentViewer
         file={selectedFile}
         fileData={selectedFileData}
         isOpen={documentViewerOpen}
         onClose={() => setDocumentViewerOpen(false)}
       />
     </div>
   )
 }
