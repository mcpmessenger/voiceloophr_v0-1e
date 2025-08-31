# VoiceLoop HR Platform

*AI-Powered Document Processing & Analysis for HR Professionals*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/peercodeai-7933s-projects/v0-voice-loop-hr-platform)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/ftTpqsXikOm)
[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

## Overview

VoiceLoop HR is an intelligent document processing platform that leverages AI to extract, analyze, and summarize HR documents. Built with Next.js 15 and TypeScript, it provides a modern, scalable solution for document management and AI-powered insights.

## Features

### 🚀 **Core Capabilities**
- **Multi-format Support**: PDF, DOCX, CSV, Markdown, and text files
- **AI-Powered Analysis**: OpenAI GPT-4 integration for intelligent summarization
- **Smart Document Processing**: Intelligent text extraction and content analysis
- **Voice Integration**: Audio transcription and voice chat capabilities
- **Modern UI**: Beautiful, responsive interface with Radix UI components

### 📄 **Document Processing**
- **PDF Processing**: Text extraction with metadata parsing (enhancement in progress)
- **DOCX Support**: Full Word document text extraction
- **CSV Analysis**: Structured data processing and insights
- **Markdown Rendering**: Rich text formatting and analysis
- **Text Files**: Plain text processing and analysis

### 🤖 **AI Services**
- **Document Summarization**: Intelligent content summarization with GPT-4
- **Question Answering**: AI-powered document Q&A
- **Content Analysis**: Key insights and actionable recommendations
- **Audio Transcription**: Whisper API integration for voice content
- **Embedding Generation**: Vector embeddings for semantic search

### 🎨 **User Experience**
- **Drag & Drop Uploads**: Intuitive file handling
- **Real-time Progress**: Live upload and processing status
- **Responsive Design**: Mobile and desktop optimized
- **Vibrant UI**: Modern, engaging interface with smooth animations
- **Error Handling**: Graceful fallbacks and user-friendly messages

## Technology Stack

### **Frontend**
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component library
- **Lucide React**: Beautiful icon set

### **Backend**
- **Next.js API Routes**: Server-side API endpoints
- **Node.js**: JavaScript runtime
- **Document Processing**: Multi-format text extraction
- **AI Integration**: OpenAI API services

### **Development Tools**
- **pnpm**: Fast package manager
- **ESLint**: Code quality and consistency
- **TypeScript**: Static type checking
- **PostCSS**: CSS processing

## Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/peercodeai/voiceloophr_v0-1e.git
   cd voiceloophr_v0-1e
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local file
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
voiceloophr_v0-1e/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── upload/        # File upload handling
│   │   ├── process/       # AI processing
│   │   ├── chat/          # Voice chat
│   │   └── embeddings/    # Vector embeddings
│   ├── upload/            # Upload page
│   ├── results/           # Results display
│   └── settings/          # Configuration
├── lib/                    # Core libraries
│   ├── documentProcessor.ts # Document processing logic
│   ├── aiService.ts       # AI service integration
│   └── types/             # Type definitions
├── components/             # Reusable UI components
│   └── ui/                # Radix UI components
└── public/                 # Static assets
```

## Smart Parser Development

The Smart Parser is a core component currently under active development. See [SMART_PARSER.md](./SMART_PARSER.md) for detailed development direction and roadmap.

### **Current Status**
- ✅ Basic document processing implemented
- ✅ AI service integration working
- 🔄 PDF processing enhancement in progress
- 📋 Smart content analysis planned

### **Next Steps**
1. **Enhanced PDF Processing**: Robust text extraction and metadata parsing
2. **Content Intelligence**: Document classification and entity extraction
3. **Security Features**: PII detection and content scanning
4. **Performance Optimization**: Streaming and parallel processing

## API Endpoints

### **File Upload**
- `POST /api/upload` - Handle file uploads and processing

### **AI Processing**
- `POST /api/process` - AI-powered document analysis
- `POST /api/chat` - Voice chat and Q&A
- `POST /api/embeddings` - Generate vector embeddings

### **File Management**
- `GET /api/files` - Retrieve processed files
- `DELETE /api/files/:id` - Remove files

## Configuration

### **Environment Variables**
```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional
NEXT_PUBLIC_APP_NAME=VoiceLoop HR
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### **AI Service Settings**
- **Model**: GPT-4 (configurable)
- **Max Tokens**: 1000 (adjustable)
- **Temperature**: 0.3 (balanced creativity)
- **Timeout**: 30 seconds

## Development

### **Available Scripts**
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### **Code Quality**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code style and quality rules
- **Prettier**: Code formatting (recommended)

### **Testing Strategy**
- **Unit Tests**: Component and utility testing
- **Integration Tests**: API endpoint testing
- **Performance Tests**: Document processing benchmarks

## Deployment

### **Vercel (Recommended)**
1. Connect your GitHub repository
2. Configure environment variables
3. Deploy automatically on push

### **Manual Deployment**
1. Build the project: `pnpm build`
2. Start production: `pnpm start`
3. Configure reverse proxy (nginx/Apache)

## Contributing

### **Development Workflow**
1. Create feature branch from `main`
2. Implement changes with tests
3. Submit pull request with description
4. Code review and approval process

### **Code Standards**
- **TypeScript**: Strict mode compliance
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS with component variants
- **Testing**: Minimum 80% coverage

## Roadmap

### **Q1 2024**
- [x] Core document processing
- [x] AI service integration
- [x] Basic UI implementation
- [ ] Enhanced PDF processing
- [ ] Smart content analysis

### **Q2 2024**
- [ ] Enterprise features
- [ ] Advanced security
- [ ] Performance optimization
- [ ] Mobile app development

### **Q3 2024**
- [ ] Multi-tenant support
- [ ] Advanced analytics
- [ ] API marketplace
- [ ] Global deployment

## Support & Community

### **Documentation**
- [Smart Parser Development](./SMART_PARSER.md)
- [API Reference](./docs/api.md)
- [Component Library](./docs/components.md)

### **Issues & Questions**
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community questions and answers
- **Wiki**: Detailed documentation and guides

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Next.js Team**: Amazing React framework
- **OpenAI**: Powerful AI services
- **Radix UI**: Accessible components
- **Vercel**: Deployment platform

---

*Built with ❤️ by the VoiceLoop team*
