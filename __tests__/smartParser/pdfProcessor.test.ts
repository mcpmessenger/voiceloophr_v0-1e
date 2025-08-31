import { PDFBenchmarker, BenchmarkResult, BenchmarkSummary } from '../../../scripts/benchmark-pdf';

describe('PDF Processor Benchmarking', () => {
  let benchmarker: PDFBenchmarker;

  beforeEach(() => {
    benchmarker = new PDFBenchmarker('./test-files');
  });

  describe('Benchmark Results', () => {
    it('should handle empty test directory gracefully', async () => {
      const summary = await benchmarker.runBenchmarks();
      
      expect(summary.totalFiles).toBe(0);
      expect(summary.successfulFiles).toBe(0);
      expect(summary.failedFiles).toBe(0);
      expect(summary.successRate).toBe(0);
    });

    it('should generate correct summary statistics', () => {
      const mockResults: BenchmarkResult[] = [
        {
          fileName: 'test1.pdf',
          fileSize: 1024,
          success: true,
          processingTime: 100,
          pages: 1,
          wordCount: 50,
          memoryUsage: 1024
        },
        {
          fileName: 'test2.pdf',
          fileSize: 2048,
          success: true,
          processingTime: 200,
          pages: 2,
          wordCount: 100,
          memoryUsage: 2048
        },
        {
          fileName: 'test3.pdf',
          fileSize: 512,
          success: false,
          processingTime: 50,
          error: 'Processing failed'
        }
      ];

      // Mock the results array
      (benchmarker as any).results = mockResults;
      
      const summary = benchmarker['generateSummary']();
      
      expect(summary.totalFiles).toBe(3);
      expect(summary.successfulFiles).toBe(2);
      expect(summary.failedFiles).toBe(1);
      expect(summary.successRate).toBe(66.7);
      expect(summary.averageProcessingTime).toBe(150);
      expect(summary.totalProcessingTime).toBe(300);
    });
  });

  describe('File Processing', () => {
    it('should format file sizes correctly', () => {
      const benchmarker = new PDFBenchmarker();
      
      expect(benchmarker['formatFileSize'](0)).toBe('0 Bytes');
      expect(benchmarker['formatFileSize'](1024)).toBe('1 KB');
      expect(benchmarker['formatFileSize'](1048576)).toBe('1 MB');
      expect(benchmarker['formatFileSize'](1073741824)).toBe('1 GB');
    });

    it('should format bytes correctly', () => {
      const benchmarker = new PDFBenchmarker();
      
      expect(benchmarker['formatBytes'](0)).toBe('0 B');
      expect(benchmarker['formatBytes'](1024)).toBe('1 KB');
      expect(benchmarker['formatBytes'](1048576)).toBe('1 MB');
    });
  });

  describe('Mock Processing', () => {
    it('should simulate processing time based on file size', async () => {
      const benchmarker = new PDFBenchmarker();
      const tempFile = './temp-test.pdf';
      
      // Create a temporary file for testing
      const fs = require('fs');
      fs.writeFileSync(tempFile, 'test content');
      
      const startTime = Date.now();
      await benchmarker['mockPDFProcessing'](tempFile);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      
      // Should take some time (not immediate)
      expect(processingTime).toBeGreaterThan(0);
      
      // Clean up
      fs.unlinkSync(tempFile);
    });

    it('should occasionally simulate failures', async () => {
      const benchmarker = new PDFBenchmarker();
      const tempFile = './temp-test.pdf';
      
      // Create a temporary file for testing
      const fs = require('fs');
      fs.writeFileSync(tempFile, 'test content');
      
      let failureCount = 0;
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        try {
          await benchmarker['mockPDFProcessing'](tempFile);
        } catch (error) {
          failureCount++;
        }
      }
      
      // Should have some failures (around 10% based on the mock)
      expect(failureCount).toBeGreaterThan(0);
      expect(failureCount).toBeLessThan(iterations * 0.2); // Less than 20%
      
      // Clean up
      fs.unlinkSync(tempFile);
    });
  });

  describe('Integration with Smart Parser', () => {
    it('should be ready for Smart Parser integration', () => {
      // This test ensures the benchmarker is ready for real Smart Parser integration
      const benchmarker = new PDFBenchmarker();
      
      // The benchmarker should have the structure needed for Smart Parser
      expect(typeof benchmarker.runBenchmarks).toBe('function');
      expect(typeof benchmarker['benchmarkFile']).toBe('function');
      expect(typeof benchmarker['generateSummary']).toBe('function');
    });
  });
});

describe('PDF Processing Performance', () => {
  it('should meet performance targets', async () => {
    const benchmarker = new PDFBenchmarker();
    
    // Test with a mock file to ensure performance targets are met
    const mockFile = './mock-test.pdf';
    const fs = require('fs');
    fs.writeFileSync(mockFile, 'mock content');
    
    const startTime = performance.now();
    await benchmarker['mockPDFProcessing'](mockFile);
    const endTime = performance.now();
    
    const processingTime = endTime - startTime;
    
    // Performance target: <30 seconds for 10MB files
    // For this small mock file, should be much faster
    expect(processingTime).toBeLessThan(1000); // Less than 1 second
    
    // Clean up
    fs.unlinkSync(mockFile);
  });
});

describe('Memory Usage Monitoring', () => {
  it('should track memory usage', async () => {
    const benchmarker = new PDFBenchmarker();
    
    // Run benchmarks to trigger memory tracking
    const summary = await benchmarker.runBenchmarks();
    
    // Should have memory tracking initialized
    expect((benchmarker as any).startMemory).toBeGreaterThan(0);
    
    // Should generate summary even with no files
    expect(summary).toBeDefined();
    expect(summary.totalFiles).toBe(0);
  });
});
