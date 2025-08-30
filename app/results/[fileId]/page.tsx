"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Mic, Download, Copy, Check } from "lucide-react"

interface ProcessedFile {
  id: string
  name: string
  type: string
  size: number
  extractedText: string
  summary: string
  transcription?: string
  processedAt: string
}

export default function ResultsPage() {
  const params = useParams()
  const fileId = params.fileId as string
  const [fileData, setFileData] = useState<ProcessedFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isBrowser, setIsBrowser] = useState(false)

  // Ensure we're in the browser environment
  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined' && typeof document !== 'undefined')
  }, [])

  useEffect(() => {
    // Load real processed data from global storage
    const loadResults = async () => {
      try {
        // Wait for browser to be ready
        if (!isBrowser) return
        
        // In a real app, this would fetch from API
        // For now, get from global storage
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Get file data from global storage (simulating API call)
        const globalFiles = (global as any).uploadedFiles || new Map()
        const fileData = globalFiles.get(fileId)

        if (fileData) {
          // Use real processed data
          const realData: ProcessedFile = {
            id: fileId,
            name: fileData.name || "Unknown Document",
            type: fileData.type || "application/octet-stream",
            size: fileData.size || 0,
            extractedText: fileData.extractedText || "No content extracted",
            summary: fileData.summary || "Document processing in progress...",
            transcription: fileData.transcription,
            processedAt: fileData.processedAt || new Date().toISOString(),
          }

          setFileData(realData)
        } else {
          // Fallback to mock data if file not found
          const mockData: ProcessedFile = {
            id: fileId,
            name: "sample-document.pdf",
            type: "application/pdf",
            size: 2048576,
            extractedText: "This is sample extracted text. In a real implementation, this would contain the actual content from your uploaded document.",
            summary: `**Document Summary**

**Key Points:**
• Document processing completed
• AI analysis generated
• Ready for review and action

**Action Items:**
• Review the extracted content
• Use AI insights for decision making
• Share findings with team

**Note:** This is sample data. Upload a real document to see actual AI analysis.`,
            transcription: fileId.includes("audio") ? "Sample transcription text would appear here for audio/video files." : undefined,
            processedAt: new Date().toISOString(),
          }

          setFileData(mockData)
        }
        
        setLoading(false)
      } catch (error) {
        console.error("Error loading results:", error)
        setLoading(false)
      }
    }

    if (isBrowser) {
      loadResults()
    }
  }, [fileId, isBrowser])

  const copyToClipboard = async (text: string) => {
    if (!isBrowser) return // Don't run on server side
    
    try {
      // Check if clipboard API is available (browser environment)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback: show a message that the user should copy manually
      try {
        // Try to use a more user-friendly notification method
        if (typeof window !== 'undefined' && window.alert) {
          window.alert('Copy failed. Please select and copy the text manually.')
        }
      } catch (fallbackError) {
        console.error('Fallback error handling failed:', fallbackError)
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  if (loading || !isBrowser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-light">
            {loading ? "Loading results..." : "Initializing..."}
          </p>
        </div>
      </div>
    )
  }

  if (!fileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-light">File not found</p>
          <Button variant="outline" className="mt-4 bg-transparent" asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-primary/20 bg-gradient-to-r from-background to-primary/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/images/voiceloop-logo.png" alt="VoiceLoop" width={40} height={40} className="rounded-lg" />
              <span className="text-xl font-light text-foreground">VoiceLoop</span>
            </div>
            <Button variant="outline" size="sm" className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md" asChild>
              <Link href="/upload">
                <ArrowLeft className="mr-2 h-4 w-4 text-primary" />
                Upload Another
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Results Content */}
      <section className="py-8 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* File Info */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <FileText className="h-8 w-8 text-primary drop-shadow-lg" />
              <div>
                <h1 className="text-2xl font-light text-foreground">{fileData.name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-light">
                  <span>{formatFileSize(fileData.size)}</span>
                  <Badge variant="outline" className="font-light border-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors duration-200">
                    {fileData.type.split("/")[1]?.toUpperCase() || "FILE"}
                  </Badge>
                  <span>Processed {new Date(fileData.processedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8">
            {/* Summary */}
            <Card className="p-6 border-2 border-primary/20 hover:border-primary/30 transition-colors duration-200 shadow-sm hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light">AI Summary</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                  onClick={() => copyToClipboard(fileData.summary)}
                  disabled={!isBrowser}
                >
                  {copied ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4 text-primary" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm font-light leading-relaxed">{fileData.summary}</div>
              </div>
            </Card>

            {/* Transcription (if audio/video) */}
            {fileData.transcription && (
              <Card className="p-6 border-2 border-primary/20 hover:border-primary/30 transition-colors duration-200 shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <Mic className="h-5 w-5 text-primary drop-shadow-sm" />
                  <h2 className="text-xl font-light">Transcription</h2>
                </div>
                <div className="text-sm font-light leading-relaxed text-muted-foreground">{fileData.transcription}</div>
              </Card>
            )}

            {/* Extracted Text */}
            <Card className="p-6 border-2 border-primary/20 hover:border-primary/30 transition-colors duration-200 shadow-sm hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light">Extracted Content</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md"
                  onClick={() => copyToClipboard(fileData.extractedText)}
                  disabled={!isBrowser}
                >
                  <Copy className="mr-2 h-4 w-4 text-primary" />
                  Copy Text
                </Button>
              </div>
              <div className="text-sm font-light leading-relaxed text-muted-foreground max-h-96 overflow-y-auto">
                {fileData.extractedText}
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="font-light flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200">
                <Mic className="mr-2 h-5 w-5 text-primary-foreground" />
                Start Voice Chat
              </Button>
              <Button variant="outline" size="lg" className="font-light flex-1 bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md">
                <Download className="mr-2 h-5 w-5 text-primary" />
                Download Report
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
