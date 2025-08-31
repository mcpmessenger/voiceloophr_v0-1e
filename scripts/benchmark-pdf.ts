#!/usr/bin/env ts-node

import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

// Import Smart Parser (adjust path as needed)
// import { SmartParser } from '../lib/smartParser';

interface BenchmarkResult {
  fileName: string;
  fileSize: number;
  success: boolean;
  processingTime: number;
  error?: string;
  pages?: number;
  wordCount?: number;
  memoryUsage?: number;
}

interface BenchmarkSummary {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  averageProcessingTime: number;
  totalProcessingTime: number;
  successRate: number;
}

class PDFBenchmarker {
  private results: BenchmarkResult[] = [];
  private startMemory: number = 0;

  constructor(private testFilesDir: string = './test-files') {}

  /**
   * Run comprehensive PDF benchmarking
   */
  async runBenchmarks(): Promise<BenchmarkSummary> {
    console.log('🚀 Starting PDF Library Benchmarking...\n');
    
    this.startMemory = process.memoryUsage().heapUsed;
    
    // Check if test directory exists
    if (!fs.existsSync(this.testFilesDir)) {
      console.log(`📁 Creating test directory: ${this.testFilesDir}`);
      fs.mkdirSync(this.testFilesDir, { recursive: true });
      console.log('⚠️  No test PDFs found. Please add PDF files to test-files/ directory.');
      return this.generateSummary();
    }

    const testFiles = this.getTestFiles();
    
    if (testFiles.length === 0) {
      console.log('⚠️  No PDF files found in test directory.');
      return this.generateSummary();
    }

    console.log(`📊 Found ${testFiles.length} test files\n`);

    // Benchmark each file
    for (const file of testFiles) {
      await this.benchmarkFile(file);
    }

    return this.generateSummary();
  }

  /**
   * Benchmark a single PDF file
   */
  private async benchmarkFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    
    console.log(`🔍 Testing: ${fileName} (${this.formatFileSize(fileSize)})`);
    
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      // TODO: Replace with actual Smart Parser call
      // const result = await SmartParser.parseDocument(buffer, fileName, 'application/pdf');
      
      // Mock processing for now
      await this.mockPDFProcessing(filePath);
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      const processingTime = endTime - startTime;
      const memoryUsage = endMemory - startMemory;
      
      const benchmarkResult: BenchmarkResult = {
        fileName,
        fileSize,
        success: true,
        processingTime,
        pages: 1, // Mock value
        wordCount: 100, // Mock value
        memoryUsage
      };
      
      this.results.push(benchmarkResult);
      
      console.log(`✅ Success: ${processingTime.toFixed(2)}ms | Memory: ${this.formatBytes(memoryUsage)}`);
      
    } catch (error) {
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      const benchmarkResult: BenchmarkResult = {
        fileName,
        fileSize,
        success: false,
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.results.push(benchmarkResult);
      
      console.log(`❌ Failed: ${processingTime.toFixed(2)}ms | Error: ${benchmarkResult.error}`);
    }
    
    console.log(''); // Empty line for readability
  }

  /**
   * Mock PDF processing for testing
   */
  private async mockPDFProcessing(filePath: string): Promise<void> {
    // Simulate processing time based on file size
    const fileSize = fs.statSync(filePath).size;
    const processingTime = Math.min(fileSize / 10000, 1000); // Max 1 second
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error('Mock processing failure for testing');
    }
  }

  /**
   * Get list of test PDF files
   */
  private getTestFiles(): string[] {
    if (!fs.existsSync(this.testFilesDir)) {
      return [];
    }
    
    const files = fs.readdirSync(this.testFilesDir);
    return files
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => path.join(this.testFilesDir, file))
      .sort((a, b) => fs.statSync(a).size - fs.statSync(b).size); // Sort by size
  }

  /**
   * Generate benchmark summary
   */
  private generateSummary(): BenchmarkSummary {
    const totalFiles = this.results.length;
    const successfulFiles = this.results.filter(r => r.success).length;
    const failedFiles = totalFiles - successfulFiles;
    
    const successfulResults = this.results.filter(r => r.success);
    const totalProcessingTime = successfulResults.reduce((sum, r) => sum + r.processingTime, 0);
    const averageProcessingTime = successfulResults.length > 0 ? totalProcessingTime / successfulResults.length : 0;
    
    const successRate = totalFiles > 0 ? (successfulFiles / totalFiles) * 100 : 0;
    
    return {
      totalFiles,
      successfulFiles,
      failedFiles,
      averageProcessingTime,
      totalProcessingTime,
      successRate
    };
  }

  /**
   * Print benchmark summary
   */
  printSummary(summary: BenchmarkSummary): void {
    console.log('📊 Benchmark Summary');
    console.log('==================');
    console.log(`Total Files: ${summary.totalFiles}`);
    console.log(`Successful: ${summary.successfulFiles}`);
    console.log(`Failed: ${summary.failedFiles}`);
    console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
    console.log(`Average Processing Time: ${summary.averageProcessingTime.toFixed(2)}ms`);
    console.log(`Total Processing Time: ${summary.totalProcessingTime.toFixed(2)}ms`);
    
    if (summary.successfulFiles > 0) {
      const fastest = this.results
        .filter(r => r.success)
        .reduce((min, r) => r.processingTime < min.processingTime ? r : min);
      
      const slowest = this.results
        .filter(r => r.success)
        .reduce((max, r) => r.processingTime > max.processingTime ? r : max);
      
      console.log(`\n🏆 Fastest: ${fastest.fileName} (${fastest.processingTime.toFixed(2)}ms)`);
      console.log(`🐌 Slowest: ${slowest.fileName} (${slowest.processingTime.toFixed(2)}ms)`);
    }
    
    // Memory usage summary
    const endMemory = process.memoryUsage().heapUsed;
    const totalMemoryUsed = endMemory - this.startMemory;
    console.log(`\n💾 Total Memory Used: ${this.formatBytes(totalMemoryUsed)}`);
  }

  /**
   * Export results to JSON file
   */
  exportResults(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-results-${timestamp}.json`;
    
    const exportData = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(),
      results: this.results,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage()
      }
    };
    
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`\n💾 Results exported to: ${filename}`);
  }

  /**
   * Utility: Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Utility: Format bytes
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const benchmarker = new PDFBenchmarker();
    const summary = await benchmarker.runBenchmarks();
    
    benchmarker.printSummary(summary);
    benchmarker.exportResults();
    
    console.log('\n🎉 Benchmarking completed!');
    
  } catch (error) {
    console.error('❌ Benchmarking failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { PDFBenchmarker, BenchmarkResult, BenchmarkSummary };
