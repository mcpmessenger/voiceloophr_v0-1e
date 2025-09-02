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
} from "lucide-react"

interface Document {
  id: string
  name: string
  type: string
  size: number
  status: "processing" | "completed" | "error"
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
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalProcessed: 0,
    totalSearches: 0,
    totalChats: 0,
  })

  useEffect(() => {
    const load = async () => {
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
        if (res.ok && Array.isArray(data.documents)) {
          const mapped: Document[] = data.documents.map((d: any) => ({
            id: d.id,
            name: d.file_name || 'Document',
            type: d.mime_type || 'text/plain',
            size: d.file_size || (d.content ? d.content.length : 0),
            status: 'completed',
            uploadedAt: d.uploaded_at,
            lastAccessed: undefined,
            summary: undefined,
            processingTime: undefined,
          }))
          setDocuments(mapped)
          setStats({
            totalDocuments: mapped.length,
            totalProcessed: mapped.length,
            totalSearches: 0,
            totalChats: 0,
          })
          setRecentActivity([])
        } else {
          setDocuments([])
          setRecentActivity([])
          setStats({ totalDocuments: 0, totalProcessed: 0, totalSearches: 0, totalChats: 0 })
        }
      } catch {
        setDocuments([])
        setRecentActivity([])
        setStats({ totalDocuments: 0, totalProcessed: 0, totalSearches: 0, totalChats: 0 })
      }
    }
    load()
  }, [])

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />
    if (type.includes("audio")) return <Music className="h-5 w-5 text-purple-500" />
    if (type.includes("video")) return <Video className="h-5 w-5 text-orange-500" />
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground font-light">
            Manage your documents and track your AI processing activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border-thin">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-light text-foreground">{stats.totalDocuments}</p>
                <p className="text-sm text-muted-foreground font-light">Total Documents</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-thin">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-light text-foreground">{stats.totalProcessed}</p>
                <p className="text-sm text-muted-foreground font-light">Processed</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-thin">
            <div className="flex items-center gap-3">
              <Search className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-light text-foreground">{stats.totalSearches}</p>
                <p className="text-sm text-muted-foreground font-light">Searches</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-thin">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-light text-foreground">{stats.totalChats}</p>
                <p className="text-sm text-muted-foreground font-light">Voice Chats</p>
              </div>
            </div>
          </Card>
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
              Semantic Search
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

            <div className="space-y-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-6 border-thin hover:border-accent/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">{getFileIcon(doc.type)}</div>

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
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
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
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="font-light">Processed in {doc.processingTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
                              <Link href={`/results/${doc.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-6">
            <h2 className="text-xl font-light text-foreground">Recent Activity</h2>

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

            {/* Usage Insights */}
            <Card className="p-6 border-thin">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-5 w-5 text-accent" />
                <h3 className="font-light text-lg">Usage Insights</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-light text-muted-foreground">Documents this week</span>
                  <span className="text-sm font-medium text-foreground">4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-light text-muted-foreground">Average processing time</span>
                  <span className="text-sm font-medium text-foreground">2.8s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-light text-muted-foreground">Most used feature</span>
                  <span className="text-sm font-medium text-foreground">Voice Chat</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
