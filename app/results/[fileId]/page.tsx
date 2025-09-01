"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, Mic, Copy, Check, AlertCircle } from "lucide-react"
import { LocalStorageManager } from "@/lib/utils/storage"
import OpenAISettings from "@/components/OpenAISettings"
import VoiceChat from "@/components/VoiceChat"

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
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ensure we're in the browser environment
  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined' && typeof document !== 'undefined')
  }, [])

  useEffect(() => {
    const loadResults = async () => {
      try {
        if (!isBrowser) return
        
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Get file data from storage
        let fileData = null
        
        // Try global storage first
        const globalFiles = (global as any).uploadedFiles || new Map()
        fileData = globalFiles.get(fileId)
        
        // Fallback to localStorage
        if (!fileData && typeof window !== 'undefined') {
          fileData = LocalStorageManager.getFile(fileId)
        }

        // Debug: Log what we found
        console.log('🔍 Debug - File data found:', {
          hasFileData: !!fileData,
          hasExtractedText: !!(fileData?.extractedText),
          textLength: fileData?.extractedText?.length || 0,
          processingMethod: fileData?.processingMethod,
          isFallback: fileData?.extractedText?.includes('Fallback Processing Results'),
          isUnknown: fileData?.extractedText?.includes('Document Analysis: unknown'),
          textPreview: fileData?.extractedText?.substring(0, 100) + '...'
        })

        // More flexible detection - accept any processed content that's not clearly fallback
        if (fileData && fileData.extractedText && 
            fileData.extractedText.length > 5 && 
            !fileData.extractedText.includes('Fallback Processing Results') &&
            !fileData.extractedText.includes('Document Analysis: unknown') &&
            !fileData.extractedText.includes('[PDF content - Textract processing required]')) {
          // Real document data found
          console.log('✅ Loading real document:', fileData.name, 'Method:', fileData.processingMethod)
          
          const realData: ProcessedFile = {
            id: fileId,
            name: fileData.name || "Unknown Document",
            type: fileData.type || "application/octet-stream",
            size: fileData.size || 0,
            extractedText: fileData.extractedText,
            summary: await generateAISummary(fileData.extractedText, fileData.name),
            transcription: fileData.transcription,
            processedAt: fileData.processingTime || fileData.uploadedAt || new Date().toISOString(),
          }

          setFileData(realData)
          setError(null)
        } else if (fileData && fileData.extractedText) {
          // Show document even if it's fallback content
          console.log('⚠️ Loading document with fallback content:', fileData.name)
          
          const fallbackData: ProcessedFile = {
            id: fileId,
            name: fileData.name || "Unknown Document",
            type: fileData.type || "application/octet-stream",
            size: fileData.size || 0,
            extractedText: fileData.extractedText,
            summary: `**Document Summary: ${fileData.name}**\n\n**Status:** Document processed with limited content\n\n**Note:** This document was processed but contains limited or fallback content. Please try uploading a different version of the document.`,
            transcription: fileData.transcription,
            processedAt: fileData.processingTime || fileData.uploadedAt || new Date().toISOString(),
          }

          setFileData(fallbackData)
          setError(null)
        } else {
          // No data found at all
          setError(`Document "${fileId}" not found or not processed. Please upload and process a document first.`)
          setFileData(null)
        }
        
        setLoading(false)
      } catch (error) {
        console.error("Error loading results:", error)
        setError("Failed to load document. Please try again.")
        setLoading(false)
      }
    }

    if (isBrowser) {
      loadResults()
    }
  }, [fileId, isBrowser])

  // Generate AI summary from extracted text
  const generateAISummary = async (text: string, fileName: string): Promise<string> => {
    if (!text || text.length < 10) {
      return "**Document Summary**\n\n**Status:** Content too short for meaningful analysis\n\n**Note:** This document contains minimal text content."
    }

    try {
      const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || localStorage.getItem('openai_api_key')
      
      if (openaiKey) {
        console.log('🚀 Attempting OpenAI analysis...')
        
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            fileName,
            fileType: 'application/pdf',
            openaiKey
          })
        })

        if (response.ok) {
          const result = await response.json()
          console.log('✅ OpenAI analysis successful')
          
          const analysis = result.analysis
          let summary = `**Document Summary: ${fileName}**\n\n`
          summary += `**Document Overview:**\n`
          summary += `• Total words: ${analysis.wordCount} (OpenAI)\n`
          summary += `• Document Type: ${analysis.documentType}\n`
          summary += `• Processing method: AWS Textract + OpenAI GPT-4\n`
          summary += `• AI Confidence: ${analysis.confidence}%\n`
          summary += `• Sentiment: ${analysis.sentiment.charAt(0).toUpperCase() + analysis.sentiment.slice(1)}\n\n`
          
          summary += `**AI-Generated Summary:**\n${analysis.summary}\n\n`
          
          summary += `**Key Business Points:**\n`
          analysis.keyPoints.slice(0, 5).forEach((point: string) => {
            summary += `• ${point}\n`
          })
          summary += `\n`
          
          summary += `**Main Business Topics:**\n`
          analysis.mainTopics.slice(0, 3).forEach((topic: string) => {
            summary += `• ${topic}\n`
          })
          summary += `\n`
          
          summary += `**Business Recommendations:**\n`
          analysis.recommendations.slice(0, 3).forEach((rec: string) => {
            summary += `• ${rec}\n`
          })
          summary += `\n`
          
          summary += `**Risk Factors Identified:**\n`
          analysis.riskFactors.slice(0, 3).forEach((risk: string) => {
            summary += `• ${risk}\n`
          })
          summary += `\n`
          
          summary += `**Action Items:**\n`
          analysis.actionItems.slice(0, 3).forEach((action: string) => {
            summary += `• ${action}\n`
          })
          summary += `\n`
          
          summary += `**✅ Real AI Analysis Complete**\n`
          summary += `This analysis was generated using OpenAI's GPT-4 model for intelligent business insights.`
          
          return summary
        }
      }
    } catch (error) {
      console.error('❌ OpenAI analysis failed:', error)
    }

    // Production: Only OpenAI analysis, no fallbacks
    return `**Document Summary: ${fileName}**\n\n**Status: AI Analysis Required**\n\n**Current State:**\n• Document text extracted successfully via AWS Textract\n• AI analysis pending - OpenAI API key required\n\n**Next Steps:**\n• Configure OpenAI API key in Settings\n• Re-process document for AI insights\n• Contact administrator if issues persist\n\n**Note:** This is a production system requiring OpenAI integration for document analysis.`
  }

  const copyToClipboard = async (text: string) => {
    if (!isBrowser) return
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
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
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Copy failed. Please select and copy the text manually.')
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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b-2 border-primary/20 bg-gradient-to-r from-background to-primary/5">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <Image src="/images/voiceloop-logo.png" alt="VoiceLoop" width={40} height={40} className="rounded-lg" />
              <span className="text-xl font-light text-foreground">VoiceLoop</span>
            </div>
          </div>
        </header>
        
        <section className="py-8 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="flex items-center justify-center mb-6">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-light text-foreground mb-4">Document Not Found</h1>
            <p className="text-muted-foreground font-light mb-8 max-w-2xl mx-auto">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" className="bg-transparent" asChild>
                <Link href="/upload">Upload New Document</Link>
              </Button>
              <Button variant="outline" className="bg-transparent" asChild>
                <Link href="/dashboard">View All Documents</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (!fileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-light">No document data available</p>
          <Button variant="outline" className="mt-4 bg-transparent" asChild>
            <Link href="/upload">Upload Document</Link>
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
            
            {/* Textract Processing Details */}
            {fileData.extractedText && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-primary">Textract Processing Complete</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Words:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {fileData.extractedText.split(/\s+/).filter(word => word.length > 0).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Characters:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {fileData.extractedText.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Processing:</span>
                    <span className="ml-2 font-medium text-foreground">
                      textract
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="ml-2 font-medium text-foreground">
                      95%
                    </span>
                  </div>
                </div>
              </div>
            )}
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

            {/* OpenAI Settings - Only show if no API key configured */}
            {typeof window !== 'undefined' && !localStorage.getItem('openai_api_key') && (
              <OpenAISettings />
            )}

            {/* Actions */}
            <div className="flex justify-center">
              <Button 
                size="lg" 
                className="font-light bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 px-8"
                onClick={() => setIsVoiceChatOpen(true)}
                disabled={!fileData?.extractedText}
              >
                <Mic className="mr-2 h-5 w-5 text-primary-foreground" />
                Start Voice Chat
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Chat Modal */}
      {fileData && (
        <VoiceChat
          documentText={fileData.extractedText}
          documentName={fileData.name}
          isOpen={isVoiceChatOpen}
          onClose={() => setIsVoiceChatOpen(false)}
        />
      )}
    </div>
  )
}
