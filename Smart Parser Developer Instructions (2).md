# Smart Parser Developer Instructions

## Introduction
This document provides detailed instructions for developers to build out the Smart Parser component of the VoiceLoop HR platform. The Smart Parser is crucial for intelligent document processing, enabling AI-powered insights and summarization.

## Project Setup
Before you begin, ensure your development environment is set up as per the main repository's `README.md`.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/peercodeai/voiceloophr_v0-1e.git
    cd voiceloophr_v0-1e
    ```
2.  **Install dependencies**:
    ```bash
    pnpm install
    ```
3.  **Set up environment variables**:
    Create a `.env.local` file in the root directory and add your OpenAI API key:
    ```
    OPENAI_API_KEY=your_openai_api_key_here
    ```
4.  **Start development server**:
    ```bash
    pnpm dev
    ```
    Navigate to `http://localhost:3000` in your browser.

## Smart Parser Architecture

The Smart Parser logic will primarily reside within the `lib/smartParser/` directory. This modular approach ensures maintainability and scalability.

**Proposed Structure:**
```
lib/
├── documentProcessor.ts    # Main processing logic (will be enhanced)
├── smartParser/           # New smart parsing modules
│   ├── pdfProcessor.ts    # Advanced PDF handling
│   ├── contentAnalyzer.ts # Intelligent content analysis
│   ├── entityExtractor.ts # Named entity recognition
│   └── securityScanner.ts # Sensitive content detection
├── aiService.ts           # AI integration (will be enhanced)
└── types/                 # Extended type definitions
```

## Development Phases

### Phase 1: Enhanced PDF Processing (High Priority)

**Goal**: Implement robust server-side PDF text and metadata extraction, replacing the current placeholder.

**Tasks:**

1.  **Research and Select PDF Library**: Evaluate Node.js-compatible PDF parsing libraries. Consider `pdf-parse` (if a stable v2.0+ is available), `pdf2pic` (for OCR on scanned documents), and `pdf-lib` (for metadata). Prioritize libraries that offer good performance and comprehensive features for both digital and scanned PDFs.
    *   **Action**: Create a `research_notes.md` file in `lib/smartParser/` to document your findings and recommendation for the PDF library.

2.  **Implement `pdfProcessor.ts`**: Create a new file `lib/smartParser/pdfProcessor.ts`. This module will encapsulate all PDF processing logic.

3.  **Robust Text Extraction**: Implement functionality to extract text from various PDF types. For scanned PDFs, integrate an OCR solution (e.g., using `pdf2pic` to convert pages to images and then applying an OCR engine).

4.  **Metadata Extraction**: Extract key metadata such as title, author, number of pages, and creation date.

5.  **Page-by-Page Processing**: Design the `pdfProcessor` to handle large documents by processing them page by page, optimizing memory usage.

6.  **Error Handling**: Implement comprehensive error handling for corrupted, password-protected, or malformed PDF files. Ensure graceful degradation and informative error messages.

7.  **Integrate with `documentProcessor.ts`**: Update `lib/documentProcessor.ts` to utilize the new `pdfProcessor.ts` for PDF handling. Ensure the `processPDF` method in `documentProcessor.ts` correctly calls the new module and handles its output.

**Code Snippet Example (`lib/smartParser/pdfProcessor.ts`):**

```typescript
import { ProcessedDocument } from '../types'; // Assuming types are defined

export class PdfProcessor {
  static async process(buffer: Buffer): Promise<ProcessedDocument> {
    try {
      // 1. Validate PDF structure (e.g., check magic bytes)
      // 2. Extract metadata using a chosen library (e.g., pdf-lib)
      const metadata = await this.extractMetadata(buffer);

      // 3. Process text content (digital and scanned)
      const textContent = await this.extractText(buffer);

      // 4. Combine and return processed document
      return {
        content: textContent,
        metadata: metadata,
        // ... other relevant fields
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  private static async extractMetadata(buffer: Buffer): Promise<any> {
    // Implementation using pdf-lib or similar
    return {};
  }

  private static async extractText(buffer: Buffer): Promise<string> {
    // Implementation using pdf-parse or pdf2pic + OCR
    return '';
  }
}
```

### Phase 2: Intelligent Content Analysis (Medium Priority)

**Goal**: Enhance the parser with smart content understanding capabilities.

**Tasks:**

1.  **Document Classification**: Implement logic to classify documents (e.g., resume, contract, report) with a confidence score. This might involve training a simple machine learning model or using keyword-based classification combined with AI service calls.
    *   **Action**: Create `lib/smartParser/contentAnalyzer.ts`.

2.  **Key Information Extraction (Named Entity Recognition - NER)**: Develop `lib/smartParser/entityExtractor.ts` to identify and extract entities like dates, names, amounts, and organizations from the document text. This will likely involve leveraging OpenAI's capabilities or other NLP libraries.

3.  **Content Structure Analysis**: Analyze the document's structure to identify headings, sections, and tables. Estimate reading time. This can be done by parsing Markdown or HTML representations of the document or by analyzing text patterns.

4.  **Language Detection**: Integrate a language detection mechanism to support multi-language documents.

5.  **Sensitive Content Detection (PII)**: Implement `lib/smartParser/securityScanner.ts` to detect Personally Identifiable Information (PII) and confidential data. Provide options for redaction or flagging. This is critical for data protection and GDPR compliance.

6.  **Recommendations Generation**: Based on the analysis, generate actionable recommendations or insights.

7.  **Update `documentProcessor.ts` and `aiService.ts`**: Integrate these new smart analysis modules into the main `documentProcessor.ts` and potentially enhance `aiService.ts` to handle more complex AI queries for classification and entity extraction.

**Code Snippet Example (`lib/smartParser/contentAnalyzer.ts`):**

```typescript
import { ProcessedDocument } from '../types';

export class ContentAnalyzer {
  static async analyze(document: ProcessedDocument): Promise<any> {
    // Implement document classification logic
    const documentType = await this.classifyDocument(document.content);

    // Implement content structure analysis
    const contentStructure = this.analyzeStructure(document.content);

    // Integrate entity extraction
    const extractedEntities = await EntityExtractor.extract(document.content);

    // Integrate security scanning
    const sensitivity = await SecurityScanner.scan(document.content);

    return {
      documentType,
      confidence: 0.85, // Example confidence
      extractedEntities,
      contentStructure,
      sensitivityLevel: sensitivity.level,
      recommendations: [],
    };
  }

  private static async classifyDocument(text: string): Promise<string> {
    // Use AI service (OpenAI) or local model for classification
    return 'report'; // Example
  }

  private static analyzeStructure(text: string): any {
    // Parse headings, sections, estimate reading time
    return {};
  }
}
```

### Phase 3: Advanced Processing Features (Low Priority)

**Goal**: Implement enterprise-grade features for document processing.

**Tasks:**

1.  **Batch Processing**: Develop a mechanism for processing multiple documents concurrently or in a queue. This will likely involve using a message queue system (e.g., Redis Queue, RabbitMQ) and worker threads.

2.  **Version Control and History**: Implement a system to track document versions and maintain a history of changes and processing results.

3.  **Collaborative Annotation**: Explore options for adding collaborative annotation and commenting features to processed documents.

4.  **Export Capabilities**: Add functionality to export processed documents or their extracted content into various formats (e.g., PDF, Word, HTML).

5.  **Integration APIs**: Design and implement APIs to allow external systems to interact with the Smart Parser for document submission and retrieval of processed results.

## Performance Considerations

*   **Memory Management**: For large files (>10MB), implement streaming processing. Utilize buffer pooling to prevent memory leaks and progressive loading for multi-page documents.
*   **Processing Speed**: Leverage Node.js worker threads for CPU-intensive tasks like PDF parsing and OCR. Implement caching mechanisms for frequently accessed processed results. Consider background processing for very large documents to avoid blocking the main thread.
*   **Scalability**: Design the system with a queue for batch processing and consider database storage solutions optimized for large volumes of processed data.

## Security & Privacy

*   **Data Protection**: Ensure PII detection and provide options for redaction. Implement encryption for stored documents and robust access control mechanisms. Maintain audit logs for all document interactions. Ensure compliance with relevant data protection regulations like GDPR.
*   **Content Scanning**: Implement malware detection for uploaded files. Validate and sanitize content to prevent injection attacks. Apply rate limiting to file uploads to prevent abuse.

## Testing Strategy

*   **Unit Tests**: Write comprehensive unit tests for each individual component within `lib/smartParser/` (e.g., `pdfProcessor.ts`, `contentAnalyzer.ts`, `entityExtractor.ts`, `securityScanner.ts`). Focus on testing error handling scenarios and edge cases.
*   **Integration Tests**: Develop end-to-end integration tests to verify the entire document processing pipeline, including AI service integration and compatibility with various file formats.
*   **Performance Tests**: Conduct performance tests with large files and concurrent uploads to identify bottlenecks and ensure the system meets the defined success metrics for processing speed and memory usage.

## Success Metrics

**Technical:**
*   Processing success rate: >95%
*   Text extraction accuracy: >90%
*   Processing speed: <30 seconds for 10MB files
*   Memory usage: <100MB per document

**User Experience:**
*   Upload success rate: >98%
*   Processing time perception: <2 minutes
*   Error message clarity: User satisfaction >4/5

## Development Timeline (Approximate)

*   **Week 1-2**: Enhanced PDF Processing (Research, library selection, initial implementation).
*   **Week 3-4**: Content Analysis (Classification, NER, structure analysis, language detection, PII).
*   **Week 5-6**: Testing & Optimization (Comprehensive testing, performance tuning, user feedback).

## Resources & Dependencies

*   **Skills**: Strong proficiency in Node.js/TypeScript, experience with PDF processing, AI/ML integration, and performance optimization.
*   **External**: Selected PDF processing library, OCR service (if needed), OpenAI API, testing frameworks (Jest, Playwright).

## Questions for Development Team (to be addressed before starting)

1.  **PDF Library Selection**: Which specific library provides the best balance of features, stability, and performance for our needs?
2.  **Performance Requirements**: What are the absolute maximum acceptable processing times for different file sizes (e.g., 1MB, 10MB, 50MB)?
3.  **AI Integration**: What is the strategy for handling OpenAI API rate limits and managing costs effectively?
4.  **Security Requirements**: What specific level of content scanning and PII detection is required (e.g., full redaction, flagging only, specific PII types)?
5.  **User Experience**: How should processing progress and errors be communicated to the user in the UI (e.g., progress bars, notifications, detailed error logs)?

_This document should be treated as a living document and updated as development progresses and new insights emerge._



## Development Plan

### Phase 1: Enhanced PDF Processing

**Goal**: Implement robust server-side PDF text and metadata extraction, replacing the current placeholder.

**Tasks:**

1.  **Research and Select PDF Library**: Research available Node.js PDF parsing libraries (e.g., `pdf-parse`, `pdf-lib`) to identify the most suitable one for robust text and metadata extraction from various PDF types (digital, scanned). Document the findings and the chosen library in `research_notes.md`.

2.  **Implement `lib/smartParser/pdfProcessor.ts`**: Create this file and implement the `process` method, which will encapsulate all PDF processing logic, including text and metadata extraction, and handling of different PDF types. This module should also incorporate error handling for corrupted or password-protected files.

3.  **Integrate with `lib/documentProcessor.ts`**: Update `lib/documentProcessor.ts` to utilize the new `pdfProcessor.ts` for all PDF handling, ensuring seamless integration and efficient processing.

4.  **Testing**: Write comprehensive unit tests for `pdfProcessor.ts` to ensure its reliability and performance.

### Phase 2: Intelligent Content Analysis

**Goal**: Add smart content understanding capabilities beyond basic text extraction.

**Tasks:**

1.  **Implement `lib/smartParser/contentAnalyzer.ts`**: Develop this module to classify documents and extract key information, such as document type, entities, and structural elements.

2.  **Implement `lib/security_scanner.ts`**: Create this module to detect and handle sensitive information (e.g., PII) within documents, ensuring data privacy and compliance.

3.  **Update Core Logic**: Integrate the new content analysis and security scanning modules into `lib/documentProcessor.ts` and other relevant parts of the application.

### Phase 3: Advanced Processing Features

**Goal**: Implement and integrate enterprise-grade features for document processing.

**Tasks:**

1.  **Implement Batch Processing**: Develop a mechanism for efficient processing of multiple documents concurrently.

2.  **Implement Version Control**: Integrate a system for tracking and managing document versions.

3.  **Implement Collaborative Annotation**: Add features for users to annotate and collaborate on documents.

4.  **Develop Export Capabilities**: Enable the export of processed documents in various formats.

5.  **API Integration**: Define and implement APIs for seamless interaction with external systems.

## Next Steps:

1.  Begin with **Phase 1: Enhanced PDF Processing**.
2.  Start by researching and selecting the most suitable PDF library. Document your findings in `research_notes.md`.

