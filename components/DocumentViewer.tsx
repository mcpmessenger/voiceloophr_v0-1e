"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Download, ZoomIn, ZoomOut, RotateCw, FileText, Image as ImageIcon } from 'lucide-react'

interface DocumentViewerProps {
  file: File | null
  fileData?: any
  isOpen: boolean
  onClose: () => void
}

export default function DocumentViewer({ file, fileData, isOpen, onClose }: DocumentViewerProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && file) {
      setLoading(true)
      setError(null)
      
      if (file.type.includes('pdf')) {
        const url = URL.createObjectURL(file)
        setPdfUrl(url)
        setImageUrl(null)
      } else if (file.type.includes('image')) {
        const url = URL.createObjectURL(file)
        setImageUrl(url)
        setPdfUrl(null)
      } else {
        setError('Unsupported file type for preview')
      }
      
      setLoading(false)
    }
  }, [isOpen, file])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [pdfUrl, imageUrl])

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)
  const handleReset = () => {
    setScale(1)
    setRotation(0)
  }

  const handleDownload = () => {
    if (file) {
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl h-[90vh] flex flex-col bg-background border-2 border-primary/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary/20">
          <div className="flex items-center gap-3">
            {file?.type.includes('pdf') ? (
              <FileText className="h-6 w-6 text-red-500" />
            ) : (
              <ImageIcon className="h-6 w-6 text-blue-500" />
            )}
            <div>
              <h2 className="text-xl font-light">Document Viewer</h2>
              <p className="text-sm text-muted-foreground">{file?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* File Info */}
            {fileData && (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-xs">
                  {fileData.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                </Badge>
                <span className="text-muted-foreground">
                  {(file?.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}
            
            {/* Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                className="h-8 w-8 p-0"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 w-8 p-0"
              >
                Reset
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-red-600 font-medium mb-2">Preview Error</p>
                <p className="text-muted-foreground text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* PDF Viewer */}
          {pdfUrl && (
            <div className="w-full h-full overflow-auto bg-gray-100">
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
              >
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              </div>
            </div>
          )}

          {/* Image Viewer */}
          {imageUrl && (
            <div className="w-full h-full overflow-auto bg-gray-100">
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
              >
                <img
                  src={imageUrl}
                  alt="Document Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        {fileData && (
          <div className="p-4 border-t border-primary/20 bg-muted/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">File Type:</span>
                <span className="ml-2 font-medium">{fileData.type}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Size:</span>
                <span className="ml-2 font-medium">
                  {(file?.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-2 font-medium">
                  {fileData.processed ? 'Processed' : 'Pending'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Method:</span>
                <span className="ml-2 font-medium">
                  {fileData.processingMethod || 'Upload'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
