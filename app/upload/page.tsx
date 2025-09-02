"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Upload, FileText, File, Music, Video, X, CheckCircle, AlertCircle, ArrowLeft, Loader2, Eye } from "lucide-react"
import GoogleDriveImport from '@/components/google-drive-import'
import FileTypeInfo from '@/components/file-type-info'

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
  // Google Workspace
  "application/vnd.google-apps.document": [".gdoc"],
  "application/vnd.google-apps.spreadsheet": [".gsheet"],
  "application/vnd.google-apps.presentation": [".gslides"],
  // Microsoft Office
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  // Legacy Office
  "application/msword": [".doc"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.ms-powerpoint": [".ppt"],
  // Text formats
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "text/csv": [".csv"],
  // PDF
  "application/pdf": [".pdf"],
  // Audio/Video
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
  const [saveToDatabase, setSaveToDatabase] = useState(false)
  const router = useRouter()
  const [driveOpen, setDriveOpen] = useState(false)

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
      formData.append("saveToDatabase", String(saveToDatabase))
      // Include userId if signed in
      try {
        const supabase = getSupabaseBrowser()
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.id) formData.append('userId', user.id)
        }
      } catch {}

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

                     // For PDFs, automatically process with our fixed PDF parser
        if (uploadedFile.file.type.includes('pdf')) {
          try {
            console.log(`🚀 Auto-processing PDF with Fixed PDF Parser: ${uploadedFile.file.name}`)
            
            // Add a small delay to ensure server has processed the upload
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Try auto-processing with retry mechanism
            let processingSuccess = false
            let retryCount = 0
            const maxRetries = 2
            
            while (!processingSuccess && retryCount < maxRetries) {
              try {
                console.log(`🔄 Attempt ${retryCount + 1} of ${maxRetries + 1} for auto-processing`)
                
                // Process PDF automatically
                const response = await fetch('/api/textract', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    fileId: uploadResult.fileId,
                    processingMethod: 'fixed-pdf-parser'
                  })
                })

                if (response.ok) {
                  const result = await response.json()
                  
                  // Update localStorage
                  try {
                    const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
                    if (existing[uploadResult.fileId]) {
                      existing[uploadResult.fileId] = {
                        ...existing[uploadResult.fileId],
                        extractedText: result.extractedText,
                        wordCount: result.wordCount,
                        processed: true,
                        processingMethod: "fixed-pdf-parser",
                        processingTime: new Date().toISOString(),
                        metadata: {
                          ...existing[uploadResult.fileId].metadata,
                          processingMethod: "fixed-pdf-parser",
                          confidence: result.confidence,
                          note: "Text extracted using fixed PDF parser (free)"
                        }
                      }
                      localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
                    }
                  } catch (error) {
                    console.warn('Failed to update localStorage:', error)
                  }
                  
                  setFiles((prev) => prev.map((f) => f.id === fileId ? { 
                    ...f, 
                    status: "completed", 
                    progress: 100,
                    warning: `Text extracted successfully using fixed PDF parser (free) - ${result.wordCount} words`,
                    showTextractButton: false
                  } : f))
                  
                  toast.success(`PDF processed successfully! Extracted ${result.wordCount} words using fixed PDF parser (free).`)
                  
                  // Automatically redirect to results
                  setTimeout(() => {
                    router.push(`/results/${uploadResult.fileId}`)
                  }, 1500)
                  
                  processingSuccess = true
                  
                } else {
                  const errorData = await response.json().catch(() => ({}))
                  const errorMessage = errorData.details || errorData.error || "Processing failed"
                  
                  // If it's a "File not found" error, try re-uploading
                  if (errorMessage.includes('File not found') || errorMessage.includes('server restart')) {
                    console.log(`📤 File not found, attempting re-upload on attempt ${retryCount + 1}`)
                    
                    // Re-upload the file
                    const reUploadFormData = new FormData()
                    reUploadFormData.append('file', uploadedFile.file)
                    
                    const reUploadResponse = await fetch('/api/upload', {
                      method: 'POST',
                      body: reUploadFormData
                    })
                    
                    if (reUploadResponse.ok) {
                      const reUploadResult = await reUploadResponse.json()
                      uploadResult.fileId = reUploadResult.fileId // Update the fileId
                      
                      // Wait a bit before trying to process again
                      await new Promise(resolve => setTimeout(resolve, 2000))
                      retryCount++
                      continue
                    }
                  }
                  
                  // If it's not a file not found error, break the retry loop
                  break
                }
                
              } catch (retryError) {
                console.error(`Retry ${retryCount + 1} failed:`, retryError)
                retryCount++
                
                if (retryCount < maxRetries) {
                  // Wait before next retry
                  await new Promise(resolve => setTimeout(resolve, 2000))
                }
              }
            }
            
            // If all retries failed, fallback to manual processing
            if (!processingSuccess) {
              console.log('🔄 All auto-processing attempts failed, falling back to manual processing')
              setFiles((prev) => prev.map((f) => f.id === fileId ? { 
                ...f, 
                status: "completed", 
                progress: 100,
                warning: "Auto-processing failed. Choose your preferred method below.",
                showTextractButton: true
              } : f))
              
              toast("PDF uploaded. Auto-processing failed - please choose your preferred method below.")
            }
            
          } catch (error) {
            console.error("Auto PDF processing failed:", error)
            // Fallback to manual processing with both options
            setFiles((prev) => prev.map((f) => f.id === fileId ? { 
              ...f, 
              status: "completed", 
              progress: 100,
              warning: "Auto-processing failed. Choose your preferred method below.",
              showTextractButton: true
            } : f))
            
            toast("PDF uploaded. Auto-processing failed - please choose your preferred method below.")
          }
          return
        }
        
                 // For images, we need to extract text first before AI processing
         if (uploadedFile.file.type.includes('image')) {
           setFiles((prev) => prev.map((f) => f.id === fileId ? { 
             ...f, 
             status: "completed", 
             progress: 100,
             warning: "File uploaded successfully. Click 'Process with Textract' to extract text content.",
             showTextractButton: true
           } : f))
           
           toast("Image uploaded. Click 'Process with Textract' to extract text content.")
           return
         }
         
         // For CSV files, process directly with our file processor
         if (uploadedFile.file.type.includes('csv') || uploadedFile.file.name.toLowerCase().includes('.csv')) {
           // CSV files will be processed by our FileProcessor
           // Continue to the processing section below
         }
         // For audio/video files, we need to extract text first before AI processing
         else if (uploadedFile.file.type.includes('audio') || uploadedFile.file.type.includes('video')) {
           setFiles((prev) => prev.map((f) => f.id === fileId ? { 
             ...f, 
             status: "completed", 
             progress: 100,
             warning: "File uploaded successfully. Click 'Process with Textract' to extract text content.",
             showTextractButton: true
           } : f))
           
           toast("Audio/Video uploaded. Click 'Process with Textract' to extract text content.")
           return
         }

             // Process file with our new file processor
       const processFormData = new FormData()
       processFormData.append('file', uploadedFile.file)
       
       const processResponse = await fetch("/api/process-file", {
         method: "POST",
         body: processFormData,
       })
       
       if (!processResponse.ok) {
         const errorData = await processResponse.json().catch(() => ({}))
         const errorMessage = errorData.details || errorData.error || "Processing failed"
         throw new Error(errorMessage)
       }
       
       const processResult = await processResponse.json()
       
       // Update localStorage with processed content
       try {
         const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
         if (existing[uploadResult.fileId]) {
           existing[uploadResult.fileId] = {
             ...existing[uploadResult.fileId],
             extractedText: processResult.content,
             wordCount: processResult.metadata.wordCount,
             processed: true,
             processingMethod: processResult.metadata.processingMethod,
             processingTime: new Date().toISOString(),
             metadata: {
               ...existing[uploadResult.fileId].metadata,
               processingMethod: processResult.metadata.processingMethod,
               confidence: processResult.metadata.confidence,
               note: `Text extracted using ${processResult.metadata.processingMethod}`
             }
           }
           localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
         }
       } catch (error) {
         console.warn('Failed to update localStorage:', error)
       }

       // Save to database if available
       try {
         const { getSupabaseBrowser } = await import('@/lib/supabase-browser')
         const supabase = getSupabaseBrowser()
         let userId = null
         
         if (supabase) {
           const { data: { user } } = await supabase.auth.getUser()
           userId = user?.id
         }

         const saveResponse = await fetch('/api/documents/save', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             id: uploadResult.fileId,
             name: uploadedFile.file.name,
             type: uploadedFile.file.type,
             size: uploadedFile.file.size,
             extractedText: processResult.content,
             summary: '', // Will be generated later
             processingMethod: processResult.metadata.processingMethod,
             userId: userId
           })
         })

         if (saveResponse.ok) {
           console.log('Document saved to database successfully')
         } else {
           console.warn('Failed to save document to database:', await saveResponse.text())
         }
       } catch (dbError) {
         console.warn('Database save failed (continuing with localStorage):', dbError)
       }

             // Mark as completed
       setFiles((prev) => prev.map((f) => (f.id === fileId ? { 
         ...f, 
         status: "completed", 
         progress: 100,
         warning: `Text extracted successfully using ${processResult.metadata.processingMethod} - ${processResult.metadata.wordCount} words`
       } : f)))
       
       // Automatically redirect to results page after successful processing
       toast.success(`Document processed successfully! Extracted ${processResult.metadata.wordCount} words using ${processResult.metadata.processingMethod}. Redirecting to results...`)
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
      console.log(`🚀 Processing with Fixed PDF Parser: ${fileToProcess.file.name}`)

      // Use the Textract API with fixed PDF parser method
      const response = await fetch('/api/textract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileToProcess.fileId,
          processingMethod: 'fixed-pdf-parser'
        })
      })

             if (!response.ok) {
         const errorData = await response.json().catch(() => ({}))
         const errorMessage = errorData.details || errorData.error || "Fixed PDF Parser processing failed"
         
         // If file not found, it might be due to server restart - try uploading again
         if (errorMessage.includes("File not found") || errorMessage.includes("server restart")) {
           console.log("🔄 File not found - likely server restart. Retrying with re-upload...")
           
           // Try to re-upload the file first
           const reUploadFormData = new FormData()
           reUploadFormData.append("file", fileToProcess.file)
           
           const reUploadResponse = await fetch("/api/upload", {
             method: "POST",
             body: reUploadFormData,
           })
           
           if (reUploadResponse.ok) {
             const reUploadResult = await reUploadResponse.json()
             
             // Update the file ID and try processing again
             fileToProcess.fileId = reUploadResult.fileId
             
             // Try processing again with new file ID
             const retryResponse = await fetch('/api/textract', {
               method: 'POST',
               headers: {
                 'Content-Type': 'application/json',
               },
               body: JSON.stringify({
                 fileId: reUploadResult.fileId,
                 processingMethod: 'fixed-pdf-parser'
               })
             })
             
             if (retryResponse.ok) {
               const retryResult = await retryResponse.json()
               
               // Update localStorage with new file ID
               try {
                 const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
                 existing[reUploadResult.fileId] = {
                   ...existing[fileToProcess.fileId || ''],
                   id: reUploadResult.fileId,
                   extractedText: retryResult.extractedText,
                   wordCount: retryResult.wordCount,
                   processed: true,
                   processingMethod: "fixed-pdf-parser",
                   processingTime: new Date().toISOString(),
                   metadata: {
                     processingMethod: "fixed-pdf-parser",
                     confidence: retryResult.confidence,
                     note: "Text extracted using fixed PDF parser (free) - retry successful"
                   }
                 }
                 localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
               } catch (error) {
                 console.warn('Failed to update localStorage:', error)
               }
               
               // Update file with extracted content
               setFiles((prev) =>
                 prev.map((f) =>
                   f.id === fileId ? { 
                     ...f, 
                     fileId: reUploadResult.fileId,
                     status: "completed", 
                     progress: 100,
                     warning: `Text extracted successfully using fixed PDF parser (free) - ${retryResult.wordCount} words`,
                     showTextractButton: false
                   } : f
                 )
               )
               
               toast.success(`PDF processed successfully! Extracted ${retryResult.wordCount} words using fixed PDF parser (free).`)
               
               // Automatically redirect to results
               setTimeout(() => {
                 router.push(`/results/${reUploadResult.fileId}`)
               }, 1500)
               
               return // Success - exit early
             }
           }
         }
         
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
            processingMethod: "fixed-pdf-parser",
            processingTime: new Date().toISOString(),
            metadata: {
              ...(existing[fileToProcess.fileId]?.metadata || {}),
              processingMethod: "fixed-pdf-parser",
              confidence: result.confidence,
              note: "Text extracted using fixed PDF parser (free)"
            }
          }
          localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
          console.log(`✅ Updated file ${fileToProcess.fileId} in localStorage with fixed PDF parser results`)
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
            warning: "Text extracted successfully using fixed PDF parser (free)",
            showTextractButton: false
          } : f
        )
      )

      toast.success(`Successfully extracted ${result.wordCount} words using fixed PDF parser (free)! Redirecting to results...`)
      
      // Automatically redirect to results page after successful processing
      setTimeout(() => {
        router.push(`/results/${fileToProcess.fileId}`)
      }, 1500)

    } catch (error) {
      console.error("Fixed PDF Parser processing error:", error)
      
      const errorMessage = error instanceof Error ? error.message : "Fixed PDF Parser processing failed. Please try again."
      
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
                     result.processingMethod === "fixed-pdf-parser" ? "Text extracted using fixed PDF parser (free)" :
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
    const fileName = file.name.toLowerCase()
    const fileType = file.type.toLowerCase()
    
    // Google Workspace
    if (fileName.includes('.gdoc')) return <FileText className="h-6 w-6 text-blue-600 drop-shadow-sm" />
    if (fileName.includes('.gsheet')) return <FileText className="h-6 w-6 text-green-600 drop-shadow-sm" />
    if (fileName.includes('.gslides')) return <FileText className="h-6 w-6 text-orange-600 drop-shadow-sm" />
    
    // Microsoft Office
    if (fileName.includes('.docx') || fileType.includes('wordprocessingml')) return <FileText className="h-6 w-6 text-blue-700 drop-shadow-sm" />
    if (fileName.includes('.xlsx') || fileType.includes('spreadsheetml')) return <FileText className="h-6 w-6 text-green-700 drop-shadow-sm" />
    if (fileName.includes('.pptx') || fileType.includes('presentationml')) return <FileText className="h-6 w-6 text-orange-700 drop-shadow-sm" />
    
    // Legacy Office
    if (fileName.includes('.doc') || fileType.includes('msword')) return <FileText className="h-6 w-6 text-blue-500 drop-shadow-sm" />
    if (fileName.includes('.xls') || fileType.includes('ms-excel')) return <FileText className="h-6 w-6 text-green-500 drop-shadow-sm" />
    if (fileName.includes('.ppt') || fileType.includes('ms-powerpoint')) return <FileText className="h-6 w-6 text-orange-500 drop-shadow-sm" />
    
    // Text formats
    if (fileName.includes('.txt') || fileType.includes('text/')) return <FileText className="h-6 w-6 text-gray-600 drop-shadow-sm" />
    if (fileName.includes('.md') || fileType.includes('markdown')) return <FileText className="h-6 w-6 text-purple-600 drop-shadow-sm" />
    if (fileName.includes('.csv') || fileType.includes('csv')) return <FileText className="h-6 w-6 text-green-600 drop-shadow-sm" />
    
    // PDF
    if (fileName.includes('.pdf') || fileType.includes('pdf')) return <FileText className="h-6 w-6 text-red-500 drop-shadow-sm" />
    
    // Audio/Video
    if (fileType.includes("audio")) return <Music className="h-6 w-6 text-blue-500 drop-shadow-sm" />
    if (fileType.includes("video")) return <Video className="h-6 w-6 text-purple-500 drop-shadow-sm" />
    
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
            Drag and drop your files or click to browse. We support Google Workspace, Microsoft Office, PDF, Markdown, CSV, audio, and video files.
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
                    Supports Google Workspace, Microsoft Office, PDF, Markdown, CSV, WAV, MP4 • Max 50MB per file
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                    <input
                      id="save-db"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={saveToDatabase}
                      onChange={(e) => setSaveToDatabase(e.target.checked)}
                    />
                    <label htmlFor="save-db" className="text-muted-foreground">Save to database for semantic search</label>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="p-4 flex justify-center">
            <Button variant="outline" className="font-light" onClick={() => setDriveOpen(true)}>Import from Google Drive</Button>
          </div>
        </Card>

        {/* File Type Information */}
        <div className="mb-8">
          <FileTypeInfo />
        </div>

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
                        
                                                 {/* Processing Options - Only for completed files that need processing */}
                         {uploadedFile.status === "completed" && uploadedFile.showTextractButton && (
                           <>
                             <Button
                               size="sm"
                               variant="outline"
                               className="ml-2 font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                               onClick={() => processWithPdfParse(uploadedFile.id)}
                             >
                               🆓 Free PDF Parser
                             </Button>
                             <Button
                               size="sm"
                               variant="outline"
                               className="ml-2 font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                               onClick={() => processWithTextract(uploadedFile.id)}
                             >
                               💰 AWS Textract (Paid)
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

       {/* File Preview Modal */}
       {documentViewerOpen && selectedFile && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
           <div className="bg-background border-2 border-primary/20 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-light text-foreground">File Preview</h2>
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => setDocumentViewerOpen(false)}
                 className="text-muted-foreground hover:text-foreground"
               >
                 <X className="h-4 w-4" />
               </Button>
             </div>
             
             <div className="space-y-4">
               <div className="flex items-center gap-3">
                 {getFileIcon(selectedFile)}
                 <div>
                   <h3 className="font-medium text-foreground">{selectedFile.name}</h3>
                   <p className="text-sm text-muted-foreground">
                     {selectedFile.type} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                   </p>
                 </div>
               </div>
               
               {selectedFileData?.processed && (
                 <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                   <p className="text-sm text-green-800">
                     ✅ File processed successfully
                   </p>
                 </div>
               )}
               
               <div className="text-sm text-muted-foreground">
                 <p>File uploaded and ready for processing.</p>
                 <p>Use the processing options below to extract text and generate insights.</p>
               </div>
             </div>
           </div>
         </div>
       )}
       <GoogleDriveImport
         open={driveOpen}
         onClose={() => setDriveOpen(false)}
         onPicked={(file) => {
           const id = Math.random().toString(36).slice(2)
           const uploadedFile = { id, file, status: 'uploading' as const, progress: 0 }
           setFiles(prev => ([...prev, uploadedFile]))
           const progressInterval = simulateProgress(id)
           if (progressInterval) {
             setProgressIntervals(prev => new Map(prev).set(id, progressInterval))
           }
           setTimeout(() => processFile(id, uploadedFile as any), 500)
         }}
       />
     </div>
   )
 }
