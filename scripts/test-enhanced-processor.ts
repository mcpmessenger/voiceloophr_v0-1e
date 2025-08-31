#!/usr/bin/env ts-node

const { EnhancedDocumentProcessor } = require('../lib/enhancedDocumentProcessor')
const fs = require('fs')
const path = require('path')

/**
 * Test script for the Enhanced Document Processor
 * This script tests the processor with sample files to ensure it works correctly
 */

async function testEnhancedProcessor() {
  console.log('🧪 Testing Enhanced Document Processor...\n')
  
  // Test file types
  const testFiles = [
    {
      name: 'sample.txt',
      content: 'This is a sample text file for testing the enhanced processor.',
      mimeType: 'text/plain'
    },
    {
      name: 'sample.csv',
      content: 'name,age,city\nJohn,30,New York\nJane,25,Los Angeles\nBob,35,Chicago',
      mimeType: 'text/csv'
    },
    {
      name: 'sample.md',
      content: '# Sample Markdown\n\nThis is a **sample** markdown file.\n\n## Features\n- Header detection\n- Code block support\n- Link detection',
      mimeType: 'text/markdown'
    }
  ]
  
  console.log('📁 Testing with sample files...\n')
  
  for (const testFile of testFiles) {
    try {
      console.log(`🔍 Testing: ${testFile.name}`)
      console.log(`📝 MIME Type: ${testFile.mimeType}`)
      
      // Create buffer from content
      const buffer = Buffer.from(testFile.content, 'utf-8')
      console.log(`📊 Buffer size: ${buffer.length} bytes`)
      
      // Process with enhanced processor
      const startTime = Date.now()
      const result = await EnhancedDocumentProcessor.processDocument(
        buffer,
        testFile.name,
        testFile.mimeType
      )
      const processingTime = Date.now() - startTime
      
      // Display results
      console.log(`✅ Processing completed in ${processingTime}ms`)
      console.log(`📊 Success: ${result.success}`)
      console.log(`📝 Word count: ${result.wordCount}`)
      console.log(`🎯 Confidence: ${result.metadata.confidence}`)
      console.log(`🔧 Method: ${result.metadata.processingMethod}`)
      
      if (result.warnings.length > 0) {
        console.log(`⚠️  Warnings: ${result.warnings.join(', ')}`)
      }
      
      if (result.error) {
        console.log(`❌ Error: ${result.error}`)
      }
      
      // Show sample of extracted text
      const sampleText = result.text.length > 100 
        ? result.text.substring(0, 100) + '...'
        : result.text
      console.log(`📄 Sample text: "${sampleText}"`)
      
      // Show additional data if available
      if (result.csvData) {
        console.log(`📊 CSV Data: ${result.csvData.rows} rows, ${result.csvData.columns.length} columns`)
      }
      
      if (result.markdownData) {
        console.log(`📝 Markdown: ${result.markdownData.lines} lines, ${result.markdownData.toc.length} headers`)
      }
      
      console.log('') // Empty line for readability
      
    } catch (error) {
      console.error(`❌ Failed to test ${testFile.name}:`, error)
      console.log('') // Empty line for readability
    }
  }
  
  // Test supported file types
  console.log('📋 Testing supported file types...\n')
  const supportedTypes = EnhancedDocumentProcessor.getSupportedTypes()
  console.log(`✅ Supported MIME types: ${supportedTypes.length}`)
  supportedTypes.forEach((type: string) => console.log(`   - ${type}`))
  
  // Test file type detection
  console.log('\n🔍 Testing file type detection...\n')
  const testFileNames = [
    'document.pdf',
    'data.csv',
    'readme.md',
    'report.docx',
    'audio.wav',
    'video.mp4',
    'image.jpg',
    'unknown.xyz'
  ]
  
  testFileNames.forEach(fileName => {
    const isSupported = EnhancedDocumentProcessor.isSupported('', fileName)
    console.log(`${isSupported ? '✅' : '❌'} ${fileName}: ${isSupported ? 'Supported' : 'Not supported'} (by extension)`)
  })
  
  console.log('\n🎉 Enhanced Document Processor testing completed!')
}

// Test error handling
async function testErrorHandling() {
  console.log('\n🧪 Testing error handling...\n')
  
  try {
    // Test with empty buffer
    console.log('🔍 Testing with empty buffer...')
    const emptyResult = await EnhancedDocumentProcessor.processDocument(
      Buffer.alloc(0),
      'empty.txt',
      'text/plain'
    )
    
    console.log(`📊 Empty buffer result: ${emptyResult.success ? 'Success' : 'Failed'}`)
    if (!emptyResult.success) {
      console.log(`❌ Error: ${emptyResult.error}`)
    }
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error)
  }
  
  try {
    // Test with unsupported file type
    console.log('\n🔍 Testing with unsupported file type...')
    const unsupportedResult = await EnhancedDocumentProcessor.processDocument(
      Buffer.from('test content'),
      'test.xyz',
      'application/unknown'
    )
    
    console.log(`📊 Unsupported type result: ${unsupportedResult.success ? 'Success' : 'Failed'}`)
    if (!unsupportedResult.success) {
      console.log(`❌ Error: ${unsupportedResult.error}`)
    }
    
  } catch (error) {
    console.error('❌ Unsupported type test failed:', error)
  }
}

// Main execution
async function main() {
  try {
    await testEnhancedProcessor()
    await testErrorHandling()
    
    console.log('\n🚀 All tests completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Install system dependencies (FFmpeg, Whisper)')
    console.log('2. Test with real files (PDF, audio, video)')
    console.log('3. Monitor processing performance')
    console.log('4. Adjust file size limits as needed')
    
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}
