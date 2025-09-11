"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  Search,
  MessageCircle,
  FileText,
  File,
  Music,
  Video,
  Clock,
  TrendingUp,
  Activity,
  Settings,
  MoreVertical,
  Eye,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import GuestModeIndicator from "@/components/guest-mode-indicator"
import { SophisticatedLoader } from "@/components/sophisticated-loader"
import { Navigation } from "@/components/navigation"
import { FullCalendar } from "@/components/full-calendar"
import VoiceChat from "@/components/voice-chat"

interface Document {
  id: string
  name: string
  type: string
  size: number
  status: "processing" | "completed" | "error" | "cancelled"
  uploadedAt: string
  lastAccessed?: string
  summary?: string
  processingTime?: string
}

interface ActivityItem {
  id: string
  type: "upload" | "process" | "search" | "chat"
  description: string
  timestamp: string
  documentName?: string
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [stoppingProcessing, setStoppingProcessing] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalProcessed: 0,
    totalSearches: 0,
    totalChats: 0,
  })

  const loadDocuments = async () => {
    setLoading(true)
    try {
      // Include user filter if signed in (server reads userId query param)
      let userIdParam = ''
      try {
        const { getSupabaseBrowser } = await import('@/lib/supabase-browser')
        const supabase = getSupabaseBrowser()
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.id) userIdParam = `?userId=${encodeURIComponent(user.id)}`
        }
      } catch {}

      const res = await fetch(`/api/documents${userIdParam}`)
      const data = await res.json().catch(() => ({}))
      
      let dbDocuments: Document[] = []
      if (res.ok && Array.isArray(data.documents)) {
        dbDocuments = data.documents.map((d: any) => ({
          id: d.id,
          name: d.file_name || 'Document',
          type: d.mime_type || 'text/plain',
          size: d.file_size || (d.content ? d.content.length : 0),
          status: 'completed' as const,
          uploadedAt: d.uploaded_at,
          lastAccessed: undefined,
          summary: undefined,
          processingTime: undefined,
        }))
      }

      // Also load documents from localStorage as fallback/supplement
      let localStorageDocuments: Document[] = []
      try {
        const { LocalStorageManager } = await import('@/lib/utils/storage')
        const allFiles = LocalStorageManager.getAllFiles()
        
        localStorageDocuments = Object.values(allFiles).map((file: any) => ({
          id: file.id,
          name: file.name || 'Document',
          type: file.type || 'text/plain',
          size: file.size || 0,
          status: file.processingCancelled ? 'cancelled' as const : (file.processed ? 'completed' as const : 'processing' as const),
          uploadedAt: file.uploadedAt || file.processingTime || new Date().toISOString(),
          lastAccessed: undefined,
          summary: file.extractedText ? file.extractedText.substring(0, 200) + '...' : undefined,
          processingTime: file.processingTime,
        }))
      } catch (localError) {
        console.warn('Failed to load localStorage documents:', localError)
      }

      // Combine and deduplicate documents (prioritize database over localStorage)
      const allDocuments = [...dbDocuments, ...localStorageDocuments.filter(localDoc => 
        !dbDocuments.some(dbDoc => dbDoc.id === localDoc.id)
      )]

      // Sort by upload date
      allDocuments.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

      setDocuments(allDocuments)
      setStats({
        totalDocuments: allDocuments.length,
        totalProcessed: allDocuments.filter(d => d.status === 'completed').length,
        totalSearches: 0,
        totalChats: 0,
      })
      
      // Generate recent activity from documents
      const activity: ActivityItem[] = allDocuments.slice(0, 5).map((doc) => ({
        id: `doc-${doc.id}`,
        type: 'upload' as const,
        description: `Uploaded ${doc.name}`,
        timestamp: doc.uploadedAt,
        documentName: doc.name
      }))
      setRecentActivity(activity)
    } catch (error) {
      console.error('Failed to load documents:', error)
      setDocuments([])
      setRecentActivity([])
      setStats({ totalDocuments: 0, totalProcessed: 0, totalSearches: 0, totalChats: 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDocuments, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getFileIcon = (type: string, name?: string) => {
    const fileName = name?.toLowerCase() || ''
    
    // Google Workspace files
    if (type.includes('google-apps') || fileName.includes('google')) {
      return <FileText className="h-5 w-5 text-blue-500" />
    }
    
    // Microsoft Office files
    if (type.includes('msword') || type.includes('wordprocessingml') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      return <FileText className="h-5 w-5 text-blue-600" />
    }
    if (type.includes('spreadsheetml') || type.includes('ms-excel') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return <FileText className="h-5 w-5 text-green-600" />
    }
    if (type.includes('presentationml') || type.includes('ms-powerpoint') || fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
      return <FileText className="h-5 w-5 text-orange-600" />
    }
    
    // Text and document files
    if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />
    if (type.includes("text") || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      return <FileText className="h-5 w-5 text-gray-600" />
    }
    if (fileName.endsWith('.csv')) {
      return <FileText className="h-5 w-5 text-green-500" />
    }
    
    // Media files
    if (type.includes("audio") || fileName.endsWith('.wav') || fileName.endsWith('.mp3')) {
      return <Music className="h-5 w-5 text-purple-500" />
    }
    if (type.includes("video") || fileName.endsWith('.mp4') || fileName.endsWith('.avi')) {
      return <Video className="h-5 w-5 text-orange-500" />
    }
    
    return <File className="h-5 w-5 text-blue-500" />
  }

  const getStatusColor = (status: Document["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "processing":
        return "text-yellow-600"
      case "error":
        return "text-red-600"
      case "cancelled":
        return "text-gray-600"
      default:
        return "text-gray-600"
    }
  }

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "upload":
        return <Upload className="h-4 w-4 text-blue-500" />
      case "search":
        return <Search className="h-4 w-4 text-green-500" />
      case "chat":
        return <MessageCircle className="h-4 w-4 text-purple-500" />
      case "process":
        return <Activity className="h-4 w-4 text-orange-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const stopProcessing = async (docId: string, options?: { silent?: boolean }): Promise<{ ok: boolean, message?: string }> => {
    setStoppingProcessing(docId)
    try {
      const response = await fetch('/api/process/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: docId
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Processing stopped successfully:', result)
        
        // Update document status in UI
        setDocuments(prev => prev.map(doc => 
          doc.id === docId ? { ...doc, status: 'cancelled' as const } : doc
        ))
        
        // Update localStorage
        try {
          const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
          if (existing[docId]) {
            existing[docId].status = 'cancelled'
            existing[docId].processingCancelled = true
            existing[docId].cancelledAt = new Date().toISOString()
            localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
          }
        } catch (localError) {
          console.warn('Failed to update localStorage:', localError)
        }
        
        if (!options?.silent) alert('Processing stopped successfully')
        return { ok: true }
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || 'Failed to stop processing'
        console.error('❌ Failed to stop processing:', errorMessage)
        // Graceful handling if server lost in-memory file (404)
        if (String(errorMessage).toLowerCase().includes('file not found')) {
          setDocuments(prev => prev.map(doc => 
            doc.id === docId ? { ...doc, status: 'cancelled' as const } : doc
          ))
          try {
            const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
            if (existing[docId]) {
              existing[docId].status = 'cancelled'
              existing[docId].processingCancelled = true
              existing[docId].cancelledAt = new Date().toISOString()
              localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
            }
          } catch {}
          if (!options?.silent) alert('Processing marked as cancelled (file not found on server)')
          return { ok: true, message: 'File not found on server; marked cancelled' }
        } else {
          if (!options?.silent) alert(`Failed to stop processing: ${errorMessage}`)
          return { ok: false, message: errorMessage }
        }
      }
    } catch (error) {
      console.error("Error stopping processing:", error)
      if (!options?.silent) alert('Failed to stop processing')
      return { ok: false, message: 'Unexpected error' }
    } finally {
      setStoppingProcessing(null)
    }
  }

  const toggleSelect = (docId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId); else next.add(docId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)))
    }
  }

  const bulkStop = async () => {
    const ids = Array.from(selectedIds)
    const successes: string[] = []
    const failures: { id: string, reason: string }[] = []
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      const res = await stopProcessing(id, { silent: true })
      if (res.ok) successes.push(id); else failures.push({ id, reason: res.message || 'Unknown error' })
    }
    setSelectedIds(new Set())
    const failureLines = failures.map(f => `- ${documents.find(d => d.id === f.id)?.name || f.id}: ${f.reason}`)
    alert(`Stopped ${successes.length}/${ids.length} items.${failureLines.length ? `\nFailures:\n${failureLines.join('\n')}` : ''}`)
  }

  const bulkDelete = async () => {
    setDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const successes: string[] = []
      const failures: { id: string, reason: string }[] = []
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        const res = await deleteDocument(id, { silent: true })
        if (res.ok) successes.push(id); else failures.push({ id, reason: res.message || 'Unknown error' })
      }
      const successNames = successes.map(id => documents.find(d => d.id === id)?.name || id)
      const failureLines = failures.map(f => `- ${documents.find(d => d.id === f.id)?.name || f.id}: ${f.reason}`)
      alert(`Deleted ${successes.length}/${ids.length} items:\n${successNames.map(n=>`- ${n}`).join('\n')}${failureLines.length ? `\nFailures:\n${failureLines.join('\n')}` : ''}`)
    } finally {
      setDeleting(false)
      setSelectedIds(new Set())
    }
  }

  const deleteDocument = async (docId: string, options?: { silent?: boolean }): Promise<{ ok: boolean, message?: string }> => {
    setDeleting(true)
    try {
      // Clean up RAG data (document chunks and embeddings)
      try {
        const cleanupResponse = await fetch('/api/rag/cleanup', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: docId
          })
        })
        if (cleanupResponse.ok) {
          console.log('RAG data cleaned up successfully')
        } else {
          console.warn('Failed to clean up RAG data:', await cleanupResponse.text())
        }
      } catch (ragError) {
        console.warn('RAG cleanup failed (continuing with document removal):', ragError)
      }

      // Remove from database if it exists there
      try {
        const deleteResponse = await fetch(`/api/documents/${docId}`, {
          method: 'DELETE'
        })
        if (deleteResponse.ok) {
          console.log('Document removed from database successfully')
        } else {
          console.warn('Failed to remove document from database:', await deleteResponse.text())
        }
      } catch (dbError) {
        console.warn('Database removal failed (continuing with file removal):', dbError)
      }

      // Remove from localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('voiceloop_uploaded_files') || '{}')
        delete existing[docId]
        localStorage.setItem('voiceloop_uploaded_files', JSON.stringify(existing))
      } catch (localError) {
        console.warn('localStorage cleanup failed:', localError)
      }

      // Remove from UI
      setDocuments(prev => prev.filter(doc => doc.id !== docId))
      setDeleteConfirmDoc(null)
      if (!options?.silent) alert('Document deleted successfully')
      return { ok: true }
      
    } catch (error) {
      console.error("Error deleting document:", error)
      if (!options?.silent) alert('Failed to delete document')
      return { ok: false, message: 'Delete failed' }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navigation showDashboardButton={false} />

      {/* Guest Mode Indicator */}
      <div className="container mx-auto px-6 py-4">
        <GuestModeIndicator />
      </div>



      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-montserrat-light text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground font-montserrat-light">
            Manage your documents and track your AI processing activity
          </p>
        </div>

        {/* Voice Chat (open by default) */}
        <div className="mb-8">
          <Card className="p-4 border-thin">
            <VoiceChat />
          </Card>
        </div>

        {/* Full Calendar */}
        <div className="mb-8">
          <FullCalendar />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Button size="lg" className="h-16 font-light text-lg" asChild>
            <Link href="/upload">
              <Upload className="mr-3 h-6 w-6" />
              Upload Documents
            </Link>
          </Button>

          <Button variant="outline" size="lg" className="h-16 font-light text-lg bg-transparent" asChild>
            <Link href="/search">
              <Search className="mr-3 h-6 w-6" />
              Search All Documents
            </Link>
          </Button>

          <Button variant="outline" size="lg" className="h-16 font-light text-lg bg-transparent" asChild>
            <Link href="/chat">
              <MessageCircle className="mr-3 h-6 w-6" />
              Voice Chat
            </Link>
          </Button>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Documents List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-light text-foreground">Recent Documents</h2>
              <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
                <Link href="/upload">Upload New</Link>
              </Button>
            </div>

            {documents.length > 0 && (
              <div className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedIds.size === documents.length} onChange={toggleSelectAll} />
                  <span className="text-sm text-muted-foreground">Select all</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="font-light bg-transparent" onClick={bulkStop} disabled={selectedIds.size === 0 || deleting}>
                    Stop Selected
                  </Button>
                  <Button variant="destructive" size="sm" className="font-light" onClick={bulkDelete} disabled={selectedIds.size === 0 || deleting}>
                    {deleting ? 'Deleting...' : 'Delete Selected'}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {loading && documents.length === 0 ? (
                <div className="text-center py-8">
                  <SophisticatedLoader size="md" text="Loading documents..." />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-light mb-4">No documents uploaded yet</p>
                  <Button asChild>
                    <Link href="/upload">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Your First Document
                    </Link>
                  </Button>
                </div>
              ) : (
                documents.map((doc) => (
                <Card key={doc.id} className="p-6 border-thin hover:border-accent/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="pt-1"><input type="checkbox" checked={selectedIds.has(doc.id)} onChange={() => toggleSelect(doc.id)} /></div>
                    <div className="flex-shrink-0">{getFileIcon(doc.type, doc.name)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-foreground truncate">{doc.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground font-light">
                            <span>{formatFileSize(doc.size)}</span>
                            <span>•</span>
                            <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                            {doc.lastAccessed && (
                              <>
                                <span>•</span>
                                <span>Last accessed {formatDate(doc.lastAccessed)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className={`font-light ${getStatusColor(doc.status)}`}>
                            {doc.status}
                          </Badge>
                        </div>
                      </div>

                      {doc.summary && (
                        <p className="text-sm text-muted-foreground font-light mb-3 line-clamp-2">{doc.summary}</p>
                      )}

                      {doc.status === "processing" ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-light">Processing...</span>
                            <span className="text-muted-foreground font-light">75%</span>
                          </div>
                          <Progress value={75} className="h-2" />
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-light bg-transparent border-2 border-red-300 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200"
                              onClick={() => stopProcessing(doc.id)}
                              disabled={stoppingProcessing === doc.id}
                            >
                              {stoppingProcessing === doc.id ? "Stopping..." : "Stop Processing"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="font-light">Uploaded {formatDate(doc.uploadedAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
                              <Link href={`/results/${doc.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Document
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="font-light bg-transparent text-primary border-primary/30 hover:border-primary hover:bg-primary/5" asChild>
                              <Link href="/search">
                                <Search className="mr-2 h-4 w-4" />
                                Search All Docs
                              </Link>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteConfirmDoc(doc.id)}
                              disabled={deleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                                      </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div>
              <h2 className="text-xl font-light text-foreground mb-4">Recent Activity</h2>

              <Card className="p-6 border-thin">
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-light text-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground font-light">{formatDate(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border/50 py-8 mt-12">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <div className="block dark:hidden">
                <Image
                  src="https://automationalien.s3.us-east-1.amazonaws.com/voiceloop+white+bkg.png"
                  alt="VoiceLoopHR"
                  width={80}
                  height={80}
                  className="rounded-lg"
                />
              </div>
              <div className="hidden dark:block">
                <Image
                  src="https://automationalien.s3.us-east-1.amazonaws.com/transparent+bkgd.png"
                  alt="VoiceLoopHR"
                  width={80}
                  height={80}
                  className="rounded-lg"
                />
              </div>
            </Link>
            <p className="text-sm text-muted-foreground font-montserrat-light">
              <a 
                href="https://voiceloophr.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                voiceloophr.com
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Delete Confirmation Modal */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background border-2 border-red-200 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Delete Document?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                This will permanently delete the document and all associated data including:
                <br />• Document content and metadata
                <br />• RAG embeddings and search chunks
                <br />• Database records
                <br />• Local storage data
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmDoc(null)}
                  className="font-light"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteDocument(deleteConfirmDoc)}
                  className="font-light"
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Permanently"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
