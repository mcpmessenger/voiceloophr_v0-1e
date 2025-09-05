# VoiceLoop HR - Intelligent Document Analysis Platform

![VoiceLoop HR Logo](public/images/voiceloop-logo.png)

VoiceLoop HR is a cutting-edge document analysis platform that combines AI-powered text extraction, semantic search, and intelligent document processing to revolutionize how organizations handle their HR documents and content.

## 🚀 Features

### 📄 **Multi-Format Document Support**
- **PDF Documents** - Full PDF parsing with visual viewer
- **Microsoft Office** - Word (.docx), Excel (.xlsx), PowerPoint (.pptx)
- **Text Files** - Plain text, markdown, and more
- **Media Files** - Images, audio, and video with transcription support
- **CSV Files** - Spreadsheet data analysis

### 🤖 **AI-Powered Analysis**
- **OpenAI GPT-4 Integration** - Intelligent document summarization
- **Whisper Integration** - Audio transcription capabilities
- **Semantic Search** - Natural language document querying
- **RAG (Retrieval-Augmented Generation)** - Context-aware responses

### 🔍 **Advanced Document Processing**
- **Smart Text Extraction** - Multiple parsing methods for optimal results
- **Document Viewer** - Integrated PDF viewer with zoom, rotation, and navigation
- **Real-time Processing** - Instant document analysis and feedback
- **Batch Processing** - Handle multiple documents efficiently

### 🔐 **Authentication & Security**
- **Supabase Integration** - Secure user authentication
- **Google OAuth** - One-click Google sign-in
- **LinkedIn Integration** - Professional network authentication
- **Guest Mode** - Try the platform without registration
- **Row Level Security** - Data protection and privacy

### 🔗 **Rich Platform Integrations**
- **LinkedIn Professional Network** - Import profile data, connections, and professional content
- **Google Drive Integration** - Seamless document import from Drive folders
- **Cross-Platform Document Linking** - Connect LinkedIn posts to Drive documents
- **Professional Context Analysis** - Industry-specific document insights
- **Network Intelligence** - Leverage professional connections for document discovery

### 💾 **Flexible Storage Options**
- **Database Storage** - Persistent document storage with Supabase
- **Local Storage** - Guest mode with browser-based storage
- **Vector Embeddings** - Semantic search capabilities
- **File Management** - Upload, organize, and manage documents

### 🎨 **Modern User Interface**
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark/Light Mode** - System preference detection with manual toggle
- **Montserrat Font** - Clean, modern typography throughout
- **Context-Aware Navigation** - Smart button visibility based on current page
- **Streamlined Interface** - Clean, uncluttered design
- **Real-time Feedback** - Loading states and progress indicators

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component library
- **Lucide React** - Beautiful icons
- **React PDF** - PDF viewing capabilities

### **Backend**
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - Database and authentication
- **PostgreSQL** - Relational database with pg_vector extension
- **OpenAI API** - GPT-4 and Whisper integration

### **Document Processing**
- **Mammoth** - DOCX parsing
- **XLSX** - Excel file processing
- **PDF-Parse** - PDF text extraction
- **Custom PDF Parser** - Enhanced PDF processing
- **File Type Detection** - Automatic format recognition

### **Development Tools**
- **pnpm** - Fast package manager
- **ESLint** - Code linting
- **TypeScript** - Static type checking
- **Hot Reload** - Development efficiency

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- OpenAI API key
- Supabase account (optional for guest mode)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/voiceloophr.git
   cd voiceloophr
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Supabase Configuration (Optional)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Google OAuth & Drive Integration
   GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
   GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
   
   # LinkedIn Professional Network Integration
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   
   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Start Development Server**
   ```bash
   pnpm dev
   ```

5. **Open in Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔗 Platform Integration Setup

### Permissions & OAuth Scopes

- Google Drive
  - Read: `https://www.googleapis.com/auth/drive.readonly`
  - Write (Save to Drive): `https://www.googleapis.com/auth/drive.file`
  - We request consent with `prompt=consent&access_type=offline` to ensure a fresh token.

- LinkedIn (OIDC)
  - Core: `openid profile email` (no app review needed)
  - Optional (requires review): `w_member_social` (post as user), `r_liteprofile`, `r_emailaddress`

### **LinkedIn Professional Network Setup**

1. **Create LinkedIn App**
   - Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
   - Create a new app with "Sign In with LinkedIn" product
   - Add redirect URI: `https://your-domain.com/auth/callback`

2. **Configure LinkedIn OAuth**
   - Copy Client ID and Client Secret to environment variables
   - Recommended scopes (OIDC): `openid`, `profile`, `email`
   - Optional (requires LinkedIn review): `w_member_social` (publish posts), `r_liteprofile`, `r_emailaddress`

3. **Professional Data Import**
   - Profile information automatically imported on sign-in
   - Connection network data available for document sharing
   - Industry context used for document categorization

### **Google Drive Integration Setup**

1. **Enable Google Drive API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google Drive API and Google+ API
   - Create OAuth 2.0 credentials

2. **Configure Drive Permissions**
   - Scopes used: 
     - Read: `https://www.googleapis.com/auth/drive.readonly`
     - Write (optional, for "Save to Drive"): `https://www.googleapis.com/auth/drive.file`
   - Set redirect URI: `https://your-domain.com/auth/callback`

3. **Document Import Features**
   - Import entire folder structures
   - Auto-sync with Drive changes
   - Extract collaboration metadata
   - Cross-link with LinkedIn content

### **Cross-Platform Intelligence**

- **Unified Dashboard** - All documents in one view
- **Smart Tagging** - Automatic source identification
- **Relationship Mapping** - Connect content across platforms
- **Professional Analytics** - Industry and network insights

## 📖 Usage Guide

### **Guest Mode (No Registration Required)**
1. Visit the homepage
2. Click "Try Guest Mode"
3. Upload documents and explore features
4. Data stored locally in your browser

### **Full Registration**
1. Click "Settings" in the navigation
2. Choose authentication method (Google, LinkedIn, or Email)
3. Complete registration process
4. Access full features with cloud storage

### **Document Upload & Analysis**
1. **Upload Documents**
   - Drag and drop files or click to browse
   - Support for multiple file formats
   - Real-time upload progress

2. **Automatic Processing**
   - Text extraction and analysis
   - AI-powered summarization
   - Document metadata extraction

3. **View Results**
   - Summary tab for AI-generated insights
   - Content tab for extracted text
   - Document Viewer for visual preview
   - Details tab for metadata

### **Semantic Search**
1. **Save for Search** - Enable semantic search on documents
2. **Natural Language Queries** - Ask questions in plain English
3. **Contextual Results** - Get relevant document sections
4. **RAG Responses** - AI-generated answers based on your documents

## 🔧 API Endpoints

### **Document Management**
- `POST /api/upload` - Upload and process documents
- `GET /api/files/[fileId]` - Retrieve file data
- `POST /api/textract` - Process PDF documents
- `POST /api/analyze` - AI analysis of documents

### **Search & Retrieval**
- `POST /api/search/semantic` - Semantic search queries
- `POST /api/embeddings` - Generate document embeddings
- `POST /api/rag/save-for-search` - Save documents for search

### **Database Operations**
- `GET /api/documents` - List user documents
- `POST /api/documents/save` - Save documents to database
- `DELETE /api/documents/[id]` - Delete documents

## 🎯 Key Features Explained

### **Smart Document Processing**
- **Multi-Method Parsing** - Uses different techniques for optimal text extraction
- **Error Recovery** - Fallback methods when primary parsing fails
- **Format Detection** - Automatic file type recognition
- **Quality Assessment** - Confidence scoring for extracted content

## 🔗 Rich Platform Integrations

### **LinkedIn Professional Network Integration**

#### **Profile & Network Data**
- **Professional Profile Import** - Name, headline, industry, current company
- **Connection Network** - Import professional connections for document sharing
- **Career Timeline** - Past positions and career progression data
- **Industry Context** - Documents tagged by professional industry

#### **LinkedIn Content Types**
- **LinkedIn Posts** - Import and analyze your professional posts
- **LinkedIn Articles** - Long-form content analysis and insights
- **Company Updates** - Company page content and announcements
- **Job Descriptions** - Saved job postings for analysis
- **Professional Analytics** - Post performance and engagement data

#### **Professional Intelligence**
- **Industry Analysis** - Documents categorized by industry relevance
- **Network Insights** - Discover who in your network shares similar content
- **Company Intelligence** - Document analysis with company context
- **Career Progression** - Timeline analysis of professional documents

### **Google Drive Integration**

#### **Enhanced Document Import**
- **Folder Structure Import** - Import entire folder hierarchies with organization
- **Smart Filtering** - Filter by document type, creation date, folder location
- **Metadata Extraction** - File properties, sharing settings, and collaboration info
- **Auto-Sync Capabilities** - Periodic updates from Google Drive changes

#### **Document Organization**
- **Auto-Tagging System** - Documents automatically tagged by source (LinkedIn, Drive, Upload)
- **Timeline View** - Documents organized by creation and import dates
- **Collaboration Tracking** - See who shared documents and when
- **Cross-Platform Linking** - Connect LinkedIn posts to related Drive documents

#### **Advanced Features**
- **Real-time Sync** - Automatic updates when Drive files change
- **Sharing Intelligence** - Understand document collaboration patterns
- **Version Control** - Track document changes across platforms
- **Export Capabilities** - Generate reports combining data from all sources

### **Cross-Platform Intelligence**

#### **Unified Document Experience**
- **Single Dashboard** - View all documents from LinkedIn, Drive, and uploads
- **Smart Recommendations** - AI suggests related documents across platforms
- **Contextual Search** - Find documents by professional context, not just keywords
- **Relationship Mapping** - Visualize connections between documents and people

#### **Professional Analytics**
- **Content Performance** - Track how LinkedIn content relates to Drive documents
- **Network Analysis** - Understand document sharing patterns in your network
- **Industry Trends** - Identify trending topics across your professional content
- **Collaboration Insights** - Discover effective document collaboration strategies

### **AI Integration**
- **GPT-4 Summarization** - Intelligent document summaries
- **Whisper Transcription** - Audio-to-text conversion
- **Semantic Understanding** - Context-aware document analysis
- **Natural Language Processing** - Human-like document interpretation

### **Vector Search**
- **Embedding Generation** - Convert documents to searchable vectors
- **Similarity Matching** - Find related content across documents
- **Contextual Retrieval** - Get relevant document sections
- **RAG Implementation** - Generate answers from document knowledge

## 🔒 Security & Privacy

### **Data Protection**
- **Row Level Security** - Database-level access control
- **Encrypted Storage** - Secure data persistence
- **API Authentication** - Protected endpoints
- **User Isolation** - Data separation between users

### **Privacy Features**
- **Guest Mode** - No data collection without consent
- **Local Storage** - Browser-based data for guests
- **Optional Registration** - Use without creating accounts
- **Data Deletion** - Remove documents and data on demand

## 🚀 Deployment

### **Vercel Deployment (Recommended)**
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### **Docker Deployment**
```bash
# Build Docker image
docker build -t voiceloophr .

# Run container
docker run -p 3000:3000 voiceloophr
```

### **Manual Deployment**
1. Build the application: `pnpm build`
2. Start production server: `pnpm start`
3. Configure reverse proxy (nginx/Apache)
4. Set up SSL certificates

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** - For GPT-4 and Whisper APIs
- **Supabase** - For backend infrastructure
- **Vercel** - For deployment platform
- **Next.js Team** - For the amazing framework
- **React PDF** - For PDF viewing capabilities

## 📞 Support

- **Documentation** - [docs.voiceloophr.com](https://docs.voiceloophr.com)
- **Issues** - [GitHub Issues](https://github.com/yourusername/voiceloophr/issues)
- **Discussions** - [GitHub Discussions](https://github.com/yourusername/voiceloophr/discussions)
- **Email** - support@voiceloophr.com

## 🔄 Changelog

### **v0.1.1** - UI/UX Improvements
- ✅ Context-aware navigation (removes redundant buttons)
- ✅ Combined Settings & Authentication page
- ✅ System theme detection with manual toggle
- ✅ Streamlined interface design
- ✅ Removed unnecessary CTA sections
- ✅ Enhanced Montserrat typography consistency

### **v0.1.0** - Initial Release
- ✅ Multi-format document support
- ✅ AI-powered analysis with GPT-4
- ✅ Semantic search capabilities
- ✅ PDF viewer with full controls
- ✅ Guest mode for testing
- ✅ Supabase integration
- ✅ Modern responsive UI
- ✅ Authentication system

---

**Built with ❤️ by the VoiceLoop Team**

*Transforming document analysis with the power of AI*