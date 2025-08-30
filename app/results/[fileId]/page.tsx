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

  useEffect(() => {
    // In a real app, this would fetch from API
    // For now, simulate loading processed data
    const loadResults = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Simulate processed file data
      const mockData: ProcessedFile = {
        id: fileId,
        name: "sample-document.pdf",
        type: "application/pdf",
        size: 2048576,
        extractedText:
          "This is the full extracted text from the document. It contains detailed information about the topic at hand, including various sections, subsections, and important details that have been successfully extracted from the original file format.",
        summary: `**Document Summary**

**Key Points:**
• Document successfully processed and analyzed
• Contains important business information and insights
• Multiple sections covering different aspects of the topic
• Actionable recommendations provided throughout

**Action Items:**
• Review the extracted content for accuracy
• Share findings with relevant stakeholders
• Implement suggested recommendations
• Schedule follow-up discussions

**Insights:**
This document provides valuable information that can help inform decision-making processes and strategic planning initiatives.`,
        transcription: fileId.includes("audio")
          ? "This is the transcribed text from the audio file. The speaker discussed various topics including project updates, team coordination, and future planning initiatives."
          : undefined,
        processedAt: new Date().toISOString(),
      }

      setFileData(mockData)
      setLoading(false)
    }

    loadResults()
  }, [fileId])

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-light">Loading results...</p>
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
      <header className="border-b border-thin border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/images/voiceloop-logo.png" alt="VoiceLoop" width={40} height={40} className="rounded-lg" />
              <span className="text-xl font-light text-foreground">VoiceLoop</span>
            </div>
            <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
              <Link href="/upload">
                <ArrowLeft className="mr-2 h-4 w-4" />
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
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-light text-foreground">{fileData.name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-light">
                  <span>{formatFileSize(fileData.size)}</span>
                  <Badge variant="outline" className="font-light">
                    {fileData.type.split("/")[1]?.toUpperCase() || "FILE"}
                  </Badge>
                  <span>Processed {new Date(fileData.processedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8">
            {/* Summary */}
            <Card className="p-6 border-thin">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light">AI Summary</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent"
                  onClick={() => copyToClipboard(fileData.summary)}
                >
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm font-light leading-relaxed">{fileData.summary}</div>
              </div>
            </Card>

            {/* Transcription (if audio/video) */}
            {fileData.transcription && (
              <Card className="p-6 border-thin">
                <div className="flex items-center gap-3 mb-4">
                  <Mic className="h-5 w-5 text-secondary" />
                  <h2 className="text-xl font-light">Transcription</h2>
                </div>
                <div className="text-sm font-light leading-relaxed text-muted-foreground">{fileData.transcription}</div>
              </Card>
            )}

            {/* Extracted Text */}
            <Card className="p-6 border-thin">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light">Extracted Content</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent"
                  onClick={() => copyToClipboard(fileData.extractedText)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Text
                </Button>
              </div>
              <div className="text-sm font-light leading-relaxed text-muted-foreground max-h-96 overflow-y-auto">
                {fileData.extractedText}
              </div>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="font-light flex-1">
                <Mic className="mr-2 h-5 w-5" />
                Start Voice Chat
              </Button>
              <Button variant="outline" size="lg" className="font-light flex-1 bg-transparent">
                <Download className="mr-2 h-5 w-5" />
                Download Report
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
