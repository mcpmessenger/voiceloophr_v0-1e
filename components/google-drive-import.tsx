"use client"

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size?: string
}

interface GoogleDriveImportProps {
  open: boolean
  onClose: () => void
  onPicked: (file: File) => void
}

export default function GoogleDriveImport({ open, onClose, onPicked }: GoogleDriveImportProps) {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const supabase = getSupabaseBrowser()
        const { data: { session } } = await supabase!.auth.getSession()
        const token = (session as any)?.provider_token
        if (!token) {
          setError('No Google access token. Sign in with Google first.')
          return
        }
        const params = new URLSearchParams({
          q: "trashed=false and (mimeType contains 'application/pdf' or mimeType contains 'text/' )",
          fields: 'files(id,name,mimeType,modifiedTime,size)',
          pageSize: '25',
        })
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || 'Failed to list Drive files')
        }
        const data = await res.json()
        setFiles(data.files || [])
      } catch (e: any) {
        setError(e?.message || 'Failed to load Google Drive files')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open])

  const pickFile = async (driveFile: DriveFile) => {
    try {
      const supabase = getSupabaseBrowser()
      const { data: { session } } = await supabase!.auth.getSession()
      const token = (session as any)?.provider_token
      if (!token) return
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const file = new File([blob], driveFile.name, { type: driveFile.mimeType })
      onPicked(file)
      onClose()
    } catch (e) {
      console.error(e)
      alert('Failed to import file from Google Drive')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-light">Import from Google Drive</h3>
          <Button variant="ghost" onClick={onClose} className="font-light">Close</Button>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading files...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="max-h-80 overflow-auto divide-y">
            {files.map((f) => (
              <div key={f.id} className="py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.mimeType}</div>
                </div>
                <Button size="sm" className="font-light" onClick={() => pickFile(f)}>Import</Button>
              </div>
            ))}
            {files.length === 0 && (
              <div className="text-sm text-muted-foreground">No files found. Make sure Drive API is enabled and you consented to Drive access.</div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}


