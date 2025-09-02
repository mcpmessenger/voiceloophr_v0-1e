"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  Copy, 
  Check, 
  Download, 
  Eye, 
  Search,
  MessageCircle,
  Share2,
  Bookmark,
  Calendar,
  User,
  Hash
} from "lucide-react"

interface DocumentViewerProps {
  document: {
    id: string
    name: string
    type: string
    size: number
    extractedText: string
    summary: string
    transcription?: string
    processedAt: string
    processingMethod?: string
    userId?: string
  }
  onViewInDashboard?: () => void
  onStartVoiceChat?: () => void
}

export function DocumentViewer({ 
  document, 
  onViewInDashboard, 
  onStartVoiceChat 
}: DocumentViewerProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("summary")

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getFileTypeIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />
    if (type.includes("audio")) return <MessageCircle className="h-5 w-5 text-purple-500" />
    if (type.includes("video")) return <Eye className="h-5 w-5 text-orange-500" />
    return <FileText className="h-5 w-5 text-blue-500" />
  }

  const getProcessingMethodLabel = (method?: string) => {
    switch (method) {
      case 'fixed-pdf-parser': return 'Free PDF Parser'
      case 'textract': return 'AWS Textract'
      case 'whisper': return 'OpenAI Whisper'
      default: return method || 'Unknown'
    }
  }

  return (
    <div className="space-y-6">
      {/* Document Header */}
      <Card className="p-6 border-2 border-primary/20 bg-gradient-to-r from-background to-primary/5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {getFileTypeIcon(document.type)}
            </div>
            <div>
              <h1 className="text-2xl font-light text-foreground mb-2">{document.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-light">
                <span className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  {document.id.slice(0, 8)}...
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {formatFileSize(document.size)}
                </span>
                <Badge variant="outline" className="font-light border-2 border-primary/30 bg-primary/5 text-primary">
                  {document.type.split("/")[1]?.toUpperCase() || "FILE"}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
              onClick={onStartVoiceChat}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Voice Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
              onClick={onViewInDashboard}
            >
              <Eye className="mr-2 h-4 w-4" />
              View in Dashboard
            </Button>
          </div>
        </div>

        {/* Processing Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-medium text-primary">
              {document.extractedText.split(/\s+/).filter(word => word.length > 0).length}
            </div>
            <div className="text-xs text-muted-foreground">Words</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-primary">
              {document.extractedText.length}
            </div>
            <div className="text-xs text-muted-foreground">Characters</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-primary">
              {getProcessingMethodLabel(document.processingMethod)}
            </div>
            <div className="text-xs text-muted-foreground">Method</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-primary">
              {formatDate(document.processedAt)}
            </div>
            <div className="text-xs text-muted-foreground">Processed</div>
          </div>
        </div>
      </Card>

      {/* Document Content Tabs */}
      <Card className="border-2 border-primary/20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-primary/5 border-b border-primary/20">
            <TabsTrigger value="summary" className="font-light data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="mr-2 h-4 w-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="content" className="font-light data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Eye className="mr-2 h-4 w-4" />
              Content
            </TabsTrigger>
            {document.transcription && (
              <TabsTrigger value="transcription" className="font-light data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <MessageCircle className="mr-2 h-4 w-4" />
                Audio
              </TabsTrigger>
            )}
            <TabsTrigger value="metadata" className="font-light data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Search className="mr-2 h-4 w-4" />
              Details
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light text-foreground">AI-Generated Summary</h2>
              <Button
                variant="outline"
                size="sm"
                className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                onClick={() => copyToClipboard(document.summary, 'summary')}
              >
                {copied === 'summary' ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied === 'summary' ? "Copied!" : "Copy"}
              </Button>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm font-light leading-relaxed text-foreground">
                {document.summary}
              </div>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light text-foreground">Extracted Content</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                  onClick={() => copyToClipboard(document.extractedText, 'content')}
                >
                  {copied === 'content' ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied === 'content' ? "Copied!" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
            <div className="bg-muted/20 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="text-sm font-light leading-relaxed text-foreground whitespace-pre-wrap">
                {document.extractedText}
              </div>
            </div>
          </TabsContent>

          {/* Transcription Tab (if available) */}
          {document.transcription && (
            <TabsContent value="transcription" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light text-foreground">Audio Transcription</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-light bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                  onClick={() => copyToClipboard(document.transcription!, 'transcription')}
                >
                  {copied === 'transcription' ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied === 'transcription' ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="bg-muted/20 rounded-lg p-4">
                <div className="text-sm font-light leading-relaxed text-foreground">
                  {document.transcription}
                </div>
              </div>
            </TabsContent>
          )}

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="p-6">
            <h2 className="text-xl font-light text-foreground mb-4">Document Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">File Name:</span>
                  <span className="font-medium text-foreground">{document.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Document ID:</span>
                  <span className="font-medium text-foreground font-mono">{document.id}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">File Type:</span>
                  <span className="font-medium text-foreground">{document.type}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">File Size:</span>
                  <span className="font-medium text-foreground">{formatFileSize(document.size)}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Processed:</span>
                  <span className="font-medium text-foreground">{formatDate(document.processedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Method:</span>
                  <span className="font-medium text-foreground">{getProcessingMethodLabel(document.processingMethod)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Words:</span>
                  <span className="font-medium text-foreground">
                    {document.extractedText.split(/\s+/).filter(word => word.length > 0).length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Characters:</span>
                  <span className="font-medium text-foreground">{document.extractedText.length}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button 
          size="lg" 
          className="font-light bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 px-8"
          onClick={onStartVoiceChat}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Start Voice Chat
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          className="font-light border-2 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary px-8"
          onClick={onViewInDashboard}
        >
          <Eye className="mr-2 h-5 w-5" />
          View in Dashboard
        </Button>
      </div>
    </div>
  )
}
