// Test setup file for VoiceLoop HR Platform
import { performance } from 'perf_hooks';

// Global test utilities
global.performance = performance;

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Suppress console output during tests unless explicitly needed
beforeEach(() => {
  // Uncomment the lines below if you want to suppress console output during tests
  // console.log = jest.fn();
  // console.error = jest.fn();
  // console.warn = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test timeout
jest.setTimeout(30000); // 30 seconds for PDF processing tests

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-api-key';

// Global test helpers
global.testHelpers = {
  // Create a mock PDF buffer for testing
  createMockPDFBuffer: (size: number = 1024): Buffer => {
    const buffer = Buffer.alloc(size);
    // Add PDF header magic bytes
    buffer.write('%PDF-1.4', 0);
    return buffer;
  },

  // Create a mock document for testing
  createMockDocument: (text: string = 'Test document content') => {
    return {
      text,
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      pages: 1,
      metadata: {
        title: 'Test Document',
        author: 'Test Author',
        creationDate: new Date().toISOString(),
      },
    };
  },

  // Wait for a specified time (useful for testing async operations)
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock performance.now for consistent testing
  mockPerformanceNow: () => {
    let time = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => {
      time += 100; // Increment by 100ms each call
      return time;
    });
  },

  // Reset performance.now mock
  resetPerformanceNow: () => {
    jest.restoreAllMocks();
  },
};

// Type declarations for global test helpers
declare global {
  namespace NodeJS {
    interface Global {
      testHelpers: {
        createMockPDFBuffer: (size?: number) => Buffer;
        createMockDocument: (text?: string) => any;
        wait: (ms: number) => Promise<void>;
        mockPerformanceNow: () => void;
        resetPerformanceNow: () => void;
      };
    }
  }
}

export {};
