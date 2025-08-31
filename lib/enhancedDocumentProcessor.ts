const fs = require('fs')
const path = require('path')
const os = require('os')
const { exec } = require('child_process')
const { promisify } = require('util')
const { createWorker } = require('tesseract.js')
const mammoth = require('mammoth')
const csv = require('csv-parser')
const { Readable } = require('stream')
const { PDFDocument } = require('pdf-lib')
// @ts-ignore
const pdfParse = require('pdf-parse')

const execAsync = promisify(exec)

interface ProcessedDocument {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  
  // Content
  text: string
  wordCount: number
  pages?: number
  
  // Metadata
  metadata: DocumentMetadata
  processingTime: number
  
  // Status
  success: boolean
  error?: string
  warnings: string[]
  
  // Additional data
  audioTranscription?: string
  videoMetadata?: VideoMetadata
  csvData?: CSVData
  markdownData?: MarkdownData
}

interface DocumentMetadata {
  title?: string
  author?: string
  creationDate?: string
  modificationDate?: string
  encoding?: string
  language?: string
  confidence: number
  processingVersion: string
  processingMethod: string
}

interface VideoMetadata {
  duration: number
  resolution: string
  frameRate: number
  audioCodec: string
  videoCodec: string
}

interface CSVData {
  rows: number
  columns: string[]
  headers: string[]
  sampleData: any[]
  hasHeaders: boolean
}

interface MarkdownData {
  lines: number
  hasHeaders: boolean
  hasCodeBlocks: boolean
  hasLinks: boolean
  hasImages: boolean
  toc: string[]
}

interface AudioTranscription {
  text: string
  confidence: number
  language: string
  segments: TranscriptionSegment[]
}

interface TranscriptionSegment {
  start: number
  end: number
  text: string
  confidence: number
}

class EnhancedDocumentProcessor {
  private static readonly SUPPORTED_AUDIO_TYPES = [
    'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/wave',
    'audio/x-wav', 'audio/x-pn-wav'
  ]
  
  private static readonly SUPPORTED_VIDEO_TYPES = [
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
    'video/flv', 'video/webm'
  ]
  
  private static readonly SUPPORTED_DOCUMENT_TYPES = [
    'application/pdf', 'text/plain', 'text/csv', 'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]

  /**
   * Main entry point for processing any supported file type
   */
  static async processDocument(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<ProcessedDocument> {
    const startTime = Date.now()
    const fileId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      console.log(`🔄 Processing ${fileName} (${mimeType}) - ${buffer.length} bytes`)
      
      // Validate input
      if (!buffer || buffer.length === 0) {
        throw new Error("Empty or invalid file buffer")
      }
      
      let result: ProcessedDocument
      
      // Route to appropriate processor based on file type
      if (this.SUPPORTED_AUDIO_TYPES.includes(mimeType) || fileName.match(/\.(wav|mp3|m4a|flac)$/i)) {
        result = await this.processAudioFile(buffer, fileName, mimeType, fileId)
      } else if (this.SUPPORTED_VIDEO_TYPES.includes(mimeType) || fileName.match(/\.(mp4|avi|mov|wmv|flv)$/i)) {
        result = await this.processVideoFile(buffer, fileName, mimeType, fileId)
      } else if (this.SUPPORTED_DOCUMENT_TYPES.includes(mimeType) || 
                 fileName.match(/\.(pdf|txt|csv|md|docx)$/i)) {
        result = await this.processDocumentFile(buffer, fileName, mimeType, fileId)
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`)
      }
      
      result.processingTime = Date.now() - startTime
      result.success = true
      
      console.log(`✅ Successfully processed ${fileName} in ${result.processingTime}ms`)
      return result
      
    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error(`❌ Failed to process ${fileName}:`, error)
      
      return {
        id: fileId,
        fileName,
        fileType: mimeType,
        fileSize: buffer.length,
        text: '',
        wordCount: 0,
        metadata: {
          confidence: 0,
          processingVersion: '1.0.0',
          processingMethod: 'failed'
        },
        processingTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: ['Processing failed']
      }
    }
  }

  /**
   * Process audio files with Whisper transcription
   */
  private static async processAudioFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    fileId: string
  ): Promise<ProcessedDocument> {
    console.log(`🎵 Processing audio file: ${fileName}`)
    
    try {
      // Save buffer to temporary file for Whisper processing
      const tempDir = os.tmpdir()
      const tempFile = path.join(tempDir, `${fileId}_${fileName}`)
      fs.writeFileSync(tempFile, buffer)
      
      // Use Whisper CLI for transcription (requires whisper-ai to be installed)
      const transcription = await this.transcribeWithWhisper(tempFile)
      
      // Clean up temp file
      fs.unlinkSync(tempFile)
      
      return {
        id: fileId,
        fileName,
        fileType: mimeType,
        fileSize: buffer.length,
        text: transcription.text,
        wordCount: transcription.text.split(/\s+/).filter((word: string) => word.length > 0).length,
        metadata: {
          confidence: transcription.confidence,
          processingVersion: '1.0.0',
          processingMethod: 'whisper-transcription',
          language: transcription.language
        },
        processingTime: 0, // Will be set by caller
        success: true,
        warnings: [],
        audioTranscription: transcription.text
      }
      
    } catch (error) {
      console.error(`Audio processing failed for ${fileName}:`, error)
      
      // Fallback: return basic file info
      return {
        id: fileId,
        fileName,
        fileType: mimeType,
        fileSize: buffer.length,
        text: `Audio file: ${fileName}\n\nTranscription failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThis appears to be an audio file that could not be transcribed.`,
        wordCount: 0,
        metadata: {
          confidence: 0,
          processingVersion: '1.0.0',
          processingMethod: 'fallback'
        },
        processingTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: ['Audio transcription failed', 'Check if Whisper is properly installed']
      }
    }
  }

  /**
   * Process video files with audio extraction and transcription
   */
  private static async processVideoFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    fileId: string
  ): Promise<ProcessedDocument> {
    console.log(`🎬 Processing video file: ${fileName}`)
    
    try {
      // Save buffer to temporary file
      const tempDir = os.tmpdir()
      const tempFile = path.join(tempDir, `${fileId}_${fileName}`)
      fs.writeFileSync(tempFile, buffer)
      
      // Extract video metadata using ffprobe
      const videoMetadata = await this.extractVideoMetadata(tempFile)
      
      // Extract audio track for transcription
      const audioFile = path.join(tempDir, `${fileId}_audio.wav`)
      await this.extractAudioFromVideo(tempFile, audioFile)
      
      // Transcribe audio
      const transcription = await this.transcribeWithWhisper(audioFile)
      
      // Clean up temp files
      fs.unlinkSync(tempFile)
      fs.unlinkSync(audioFile)
      
      return {
        id: fileId,
        fileName,
        fileType: mimeType,
        fileSize: buffer.length,
        text: transcription.text,
        wordCount: transcription.text.split(/\s+/).filter((word: string) => word.length > 0).length,
        metadata: {
          confidence: transcription.confidence,
          processingVersion: '1.0.0',
          processingMethod: 'video-audio-extraction+whisper',
          language: transcription.language
        },
        processingTime: 0,
        success: true,
        warnings: [],
        videoMetadata,
        audioTranscription: transcription.text
      }
      
    } catch (error) {
      console.error(`Video processing failed for ${fileName}:`, error)
      
      return {
        id: fileId,
        fileName,
        fileType: mimeType,
        fileSize: buffer.length,
        text: `Video file: ${fileName}\n\nProcessing failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThis appears to be a video file that could not be processed.`,
        wordCount: 0,
        metadata: {
          confidence: 0,
          processingVersion: '1.0.0',
          processingMethod: 'fallback'
        },
        processingTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: ['Video processing failed', 'Check if ffmpeg and Whisper are installed']
      }
    }
  }

  /**
   * Process document files (PDF, CSV, Markdown, etc.)
   */
  private static async processDocumentFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    fileId: string
  ): Promise<ProcessedDocument> {
    console.log(`📄 Processing document: ${fileName}`)
    
    try {
      if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        return await this.processPDF(buffer, fileName, fileId)
      } else if (mimeType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
        return await this.processCSV(buffer, fileName, fileId)
      } else if (mimeType === 'text/markdown' || fileName.toLowerCase().endsWith('.md')) {
        return await this.processMarkdown(buffer, fileName, fileId)
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 fileName.toLowerCase().endsWith('.docx')) {
        return await this.processDOCX(buffer, fileName, fileId)
      } else if (mimeType.startsWith('text/') || fileName.toLowerCase().endsWith('.txt')) {
        return await this.processText(buffer, fileName, fileId)
      } else {
        throw new Error(`Unsupported document type: ${mimeType}`)
      }
    } catch (error) {
      console.error(`Document processing failed for ${fileName}:`, error)
      throw error
    }
  }

  /**
   * Enhanced PDF processing with OCR fallback
   */
  private static async processPDF(
    buffer: Buffer,
    fileName: string,
    fileId: string
  ): Promise<ProcessedDocument> {
    try {
      // Try standard PDF parsing first
      const pdfData = await pdfParse(buffer)
      let text = pdfData.text
      let confidence = 0.95
      let processingMethod = 'pdf-parse'
      
      // If standard parsing returns minimal text, try OCR
      if (!text || text.trim().length < 100) {
        console.log(`📄 Standard PDF parsing returned minimal text, attempting OCR...`)
        text = await this.performOCR(buffer)
        confidence = 0.8
        processingMethod = 'pdf-parse+ocr'
      }
      
      // Extract metadata
      const metadata = await this.extractPDFMetadata(buffer)
      
      return {
        id: fileId,
        fileName,
        fileType: 'application/pdf',
        fileSize: buffer.length,
        text: text.trim(),
        wordCount: text.split(/\s+/).filter((word: string) => word.length > 0).length,
        pages: metadata.pageCount,
        metadata: {
          title: metadata.title,
          author: metadata.author,
          creationDate: metadata.creationDate,
          confidence,
          processingVersion: '1.0.0',
          processingMethod
        },
        processingTime: 0,
        success: true,
        warnings: confidence < 0.9 ? ['OCR was used - accuracy may be lower'] : []
      }
      
    } catch (error) {
      console.error(`PDF processing failed for ${fileName}:`, error)
      
      // Final fallback: return basic info
      return {
        id: fileId,
        fileName,
        fileType: 'application/pdf',
        fileSize: buffer.length,
        text: `PDF file: ${fileName}\n\nProcessing failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThis appears to be a PDF file that could not be processed.`,
        wordCount: 0,
        metadata: {
          confidence: 0,
          processingVersion: '1.0.0',
          processingMethod: 'fallback'
        },
        processingTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: ['PDF processing failed', 'File may be corrupted or encrypted']
      }
    }
  }

  /**
   * Enhanced CSV processing with structured data
   */
  private static async processCSV(
    buffer: Buffer,
    fileName: string,
    fileId: string
  ): Promise<ProcessedDocument> {
    try {
      return new Promise((resolve, reject) => {
        const results: any[] = []
        const stream = Readable.from(buffer)
        
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            if (results.length === 0) {
              reject(new Error('CSV file is empty or has no valid data'))
              return
            }
            
            const headers = Object.keys(results[0])
            const text = results.map(row => 
              Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')
            ).join('\n')
            
            const csvData: CSVData = {
              rows: results.length,
              columns: headers,
              headers,
              sampleData: results.slice(0, 5),
              hasHeaders: true
            }
            
            resolve({
              id: fileId,
              fileName,
              fileType: 'text/csv',
              fileSize: buffer.length,
              text,
              wordCount: text.split(/\s+/).filter((word: string) => word.length > 0).length,
              metadata: {
                confidence: 0.95,
                processingVersion: '1.0.0',
                processingMethod: 'csv-parser'
              },
              processingTime: 0,
              success: true,
              warnings: [],
              csvData
            })
          })
          .on('error', (error) => reject(error))
      })
    } catch (error) {
      throw new Error(`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhanced Markdown processing
   */
  private static async processMarkdown(
    buffer: Buffer,
    fileName: string,
    fileId: string
  ): Promise<ProcessedDocument> {
    try {
      const text = buffer.toString('utf-8')
      
      // Analyze markdown structure
      const lines = text.split('\n')
      const hasHeaders = /^#\s/.test(text)
      const hasCodeBlocks = /```[\s\S]*```/.test(text)
      const hasLinks = /\[.*?\]\(.*?\)/.test(text)
      const hasImages = /!\[.*?\]\(.*?\)/.test(text)
      
      // Extract table of contents
      const toc = lines
        .filter(line => line.match(/^#{1,6}\s/))
        .map(line => line.replace(/^#{1,6}\s/, '').trim())
      
      const markdownData: MarkdownData = {
        lines: lines.length,
        hasHeaders,
        hasCodeBlocks,
        hasLinks,
        hasImages,
        toc
      }
      
      return {
        id: fileId,
        fileName,
        fileType: 'text/markdown',
        fileSize: buffer.length,
        text,
        wordCount: text.split(/\s+/).filter((word: string) => word.length > 0).length,
        metadata: {
          confidence: 0.98,
          processingVersion: '1.0.0',
          processingMethod: 'markdown-parser'
        },
        processingTime: 0,
        success: true,
        warnings: [],
        markdownData
      }
      
    } catch (error) {
      throw new Error(`Markdown processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhanced DOCX processing
   */
  private static async processDOCX(
    buffer: Buffer,
    fileName: string,
    fileId: string
  ): Promise<ProcessedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      
      return {
        id: fileId,
        fileName,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: buffer.length,
        text: result.value,
        wordCount: result.value.split(/\s+/).filter((word: string) => word.length > 0).length,
        metadata: {
          confidence: 0.95,
          processingVersion: '1.0.0',
          processingMethod: 'mammoth-docx'
        },
        processingTime: 0,
        success: true,
        warnings: result.messages.length > 0 ? result.messages.map(m => m.message) : []
      }
      
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhanced text processing
   */
  private static async processText(
    buffer: Buffer,
    fileName: string,
    fileId: string
  ): Promise<ProcessedDocument> {
    try {
      const text = buffer.toString('utf-8')
      
      return {
        id: fileId,
        fileName,
        fileType: 'text/plain',
        fileSize: buffer.length,
        text,
        wordCount: text.split(/\s+/).filter((word: string) => word.length > 0).length,
        metadata: {
          confidence: 0.99,
          processingVersion: '1.0.0',
          processingMethod: 'text-parser',
          encoding: 'utf-8'
        },
        processingTime: 0,
        success: true,
        warnings: []
      }
      
    } catch (error) {
      throw new Error(`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Perform OCR on PDF/image using Tesseract.js
   */
  private static async performOCR(buffer: Buffer): Promise<string> {
    try {
      console.log('🔍 Starting OCR processing...')
      
      const worker = await createWorker('eng')
      const { data: { text } } = await worker.recognize(buffer)
      await worker.terminate()
      
      console.log(`✅ OCR completed: ${text.length} characters extracted`)
      return text
      
    } catch (error) {
      console.error('OCR failed:', error)
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract PDF metadata using pdf-lib
   */
  private static async extractPDFMetadata(buffer: Buffer): Promise<any> {
    try {
      const pdfDoc = await PDFDocument.load(buffer)
      const pages = pdfDoc.getPages()
      
      return {
        pageCount: pages.length,
        title: 'PDF Document',
        author: 'Unknown',
        creationDate: new Date().toISOString()
      }
    } catch (error) {
      console.warn('PDF metadata extraction failed:', error)
      return {
        pageCount: 1,
        title: 'PDF Document',
        author: 'Unknown',
        creationDate: new Date().toISOString()
      }
    }
  }

  /**
   * Transcribe audio using Whisper CLI
   */
  private static async transcribeWithWhisper(audioFile: string): Promise<AudioTranscription> {
    try {
      // Check if whisper is installed
      try {
        await execAsync('whisper --version')
      } catch {
        throw new Error('Whisper CLI not found. Please install: pip install openai-whisper')
      }
      
      // Transcribe with Whisper
      const { stdout } = await execAsync(`whisper "${audioFile}" --output_format txt --output_dir "${path.dirname(audioFile)}"`)
      
      // Read the generated transcript
      const transcriptFile = audioFile.replace(/\.[^/.]+$/, '.txt')
      const text = fs.readFileSync(transcriptFile, 'utf-8')
      
      // Clean up transcript file
      fs.unlinkSync(transcriptFile)
      
      return {
        text: text.trim(),
        confidence: 0.9,
        language: 'en',
        segments: []
      }
      
    } catch (error) {
      throw new Error(`Whisper transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract video metadata using ffprobe
   */
  private static async extractVideoMetadata(videoFile: string): Promise<VideoMetadata> {
    try {
      // Check if ffprobe is installed
      try {
        await execAsync('ffprobe -version')
      } catch {
        throw new Error('ffprobe not found. Please install ffmpeg')
      }
      
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${videoFile}"`)
      const metadata = JSON.parse(stdout)
      
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video')
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio')
      
      return {
        duration: parseFloat(metadata.format.duration) || 0,
        resolution: `${videoStream?.width || 0}x${videoStream?.height || 0}`,
        frameRate: parseFloat(videoStream?.r_frame_rate?.split('/')[0] || '0') / parseFloat(videoStream?.r_frame_rate?.split('/')[1] || '1'),
        audioCodec: audioStream?.codec_name || 'unknown',
        videoCodec: videoStream?.codec_name || 'unknown'
      }
      
    } catch (error) {
      console.warn('Video metadata extraction failed:', error)
      return {
        duration: 0,
        resolution: 'unknown',
        frameRate: 0,
        audioCodec: 'unknown',
        videoCodec: 'unknown'
      }
    }
  }

  /**
   * Extract audio from video using ffmpeg
   */
  private static async extractAudioFromVideo(videoFile: string, audioFile: string): Promise<void> {
    try {
      // Check if ffmpeg is installed
      try {
        await execAsync('ffmpeg -version')
      } catch {
        throw new Error('ffmpeg not found. Please install ffmpeg')
      }
      
      await execAsync(`ffmpeg -i "${videoFile}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioFile}" -y`)
      
    } catch (error) {
      throw new Error(`Audio extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get supported file types
   */
  static getSupportedTypes(): string[] {
    return [
      ...this.SUPPORTED_AUDIO_TYPES,
      ...this.SUPPORTED_VIDEO_TYPES,
      ...this.SUPPORTED_DOCUMENT_TYPES
    ]
  }

  /**
   * Check if file type is supported
   */
  static isSupported(mimeType: string, fileName: string): boolean {
    const supportedTypes = this.getSupportedTypes()
    const hasSupportedMimeType = supportedTypes.includes(mimeType)
    const hasSupportedExtension = fileName.match(/\.(pdf|txt|csv|md|docx|wav|mp3|mp4|avi|mov|wmv|flv)$/i)
    
    return hasSupportedMimeType || !!hasSupportedExtension
  }
}

module.exports = { EnhancedDocumentProcessor }
