import mammoth from 'mammoth'
import csv from 'csv-parser'
import { Readable } from 'stream'

export interface ProcessedDocument {
  text: string
  wordCount: number
  pages?: number
  metadata?: Record<string, any>
}

export class DocumentProcessor {
  /**
   * Process PDF documents and extract text content
   */
  static async processPDF(buffer: Buffer): Promise<ProcessedDocument> {
    try {
      console.log(`Processing PDF with buffer size: ${buffer.length} bytes`)
      
      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        throw new Error("Invalid buffer: empty or null")
      }
      
      // For now, provide a placeholder text that acknowledges the PDF upload
      // This will be enhanced later with proper PDF parsing
      const placeholderText = `PDF document uploaded successfully (${buffer.length} bytes).
      
This is a PDF document that has been uploaded and stored in the system. The file contains ${buffer.length} bytes of data.

Note: PDF text extraction is currently being enhanced. For now, the document has been uploaded and can be processed with AI services once the full text extraction is implemented.

File Information:
- Size: ${(buffer.length / 1024).toFixed(2)} KB
- Type: PDF Document
- Status: Uploaded and stored successfully`
      
      console.log(`PDF processed with placeholder text: ${placeholderText.length} characters`)
      
      return {
        text: placeholderText,
        wordCount: placeholderText.split(/\s+/).filter(word => word.length > 0).length,
        pages: 1, // We'll get actual page count later
        metadata: {
          title: 'PDF Document',
          author: 'Unknown',
          subject: 'PDF file uploaded',
          creator: 'VoiceLoop HR System',
          producer: 'PDF Upload Service',
          creationDate: new Date().toISOString(),
          modificationDate: new Date().toISOString(),
          note: 'PDF text extraction enhancement in progress',
          bufferSize: buffer.length
        }
      }
    } catch (error) {
      console.error("PDF processing error details:", error)
      if (error instanceof Error) {
        console.error("Error name:", error.name)
        console.error("Error message:", error.message)
        console.error("Error stack:", error.stack)
      }
      
      // Fallback: provide basic information about the PDF
      console.log("Attempting PDF fallback processing...")
      
      const fallbackText = `PDF document uploaded successfully (${buffer.length} bytes). 
      
Note: This PDF could not be automatically processed. The file has been uploaded and stored, but text extraction encountered an error.

Error details: ${error instanceof Error ? error.message : 'Unknown error'}`
      
      return {
        text: fallbackText,
        wordCount: fallbackText.split(/\s+/).length,
        pages: 1,
        metadata: {
          error: "PDF processing failed, using fallback",
          originalError: error instanceof Error ? error.message : "Unknown error",
          bufferSize: buffer.length,
          uploaded: true
        }
      }
    }
  }

  /**
   * Process DOCX documents and extract text content
   */
  static async processDOCX(buffer: Buffer): Promise<ProcessedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      
      return {
        text: result.value,
        wordCount: result.value.split(/\s+/).length,
        metadata: {
          messages: result.messages
        }
      }
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process CSV documents and extract structured data
   */
  static async processCSV(buffer: Buffer): Promise<ProcessedDocument> {
    try {
      return new Promise((resolve, reject) => {
        const results: any[] = []
        const stream = Readable.from(buffer)
        
        stream
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            const text = results.map(row => 
              Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ')
            ).join('\n')
            
            resolve({
              text,
              wordCount: text.split(/\s+/).length,
              metadata: {
                rows: results.length,
                columns: results.length > 0 ? Object.keys(results[0]) : [],
                sampleData: results.slice(0, 5) // First 5 rows for context
              }
            })
          })
          .on('error', (error) => reject(error))
      })
    } catch (error) {
      throw new Error(`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process Markdown documents
   */
  static async processMarkdown(buffer: Buffer): Promise<ProcessedDocument> {
    try {
      const text = buffer.toString('utf-8')
      
      return {
        text,
        wordCount: text.split(/\s+/).length,
        metadata: {
          lines: text.split('\n').length,
          hasHeaders: /^#\s/.test(text),
          hasCodeBlocks: /```[\s\S]*```/.test(text)
        }
      }
    } catch (error) {
      throw new Error(`Markdown processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Process text files
   */
  static async processText(buffer: Buffer): Promise<ProcessedDocument> {
    try {
      const text = buffer.toString('utf-8')
      
      return {
        text,
        wordCount: text.split(/\s+/).length,
        metadata: {
          lines: text.split('\n').length,
          encoding: 'utf-8'
        }
      }
    } catch (error) {
      throw new Error(`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Main processing function that routes to appropriate processor
   */
  static async processDocument(buffer: Buffer, mimeType: string, fileName: string): Promise<ProcessedDocument> {
    try {
      console.log(`DocumentProcessor: Processing ${fileName} (${mimeType}) with buffer size ${buffer.length} bytes`)
      
      // Determine file type and process accordingly
      if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        console.log(`Routing to PDF processor for: ${fileName} (enhanced parsing coming soon)`)
        return await this.processPDF(buffer)
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 fileName.toLowerCase().endsWith('.docx')) {
        console.log(`Routing to DOCX processor for: ${fileName}`)
        return await this.processDOCX(buffer)
      } else if (mimeType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
        console.log(`Routing to CSV processor for: ${fileName}`)
        return await this.processCSV(buffer)
      } else if (mimeType === 'text/markdown' || fileName.toLowerCase().endsWith('.md')) {
        console.log(`Routing to Markdown processor for: ${fileName}`)
        return await this.processMarkdown(buffer)
      } else if (mimeType.startsWith('text/') || 
                 fileName.toLowerCase().endsWith('.txt')) {
        console.log(`Routing to Text processor for: ${fileName}`)
        return await this.processText(buffer)
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`)
      }
    } catch (error) {
      console.error(`DocumentProcessor error for ${fileName}:`, error)
      throw new Error(`Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
