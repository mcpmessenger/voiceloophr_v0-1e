# VoiceLoop HR Platform

*AI-Powered Document Processing & Analysis for HR Professionals*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-🚀%20Visit%20Site-green?style=for-the-badge)](https://v0-voice-loop-hr-platform-git-311a9e-peercodeai-7933s-projects.vercel.app/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/peercodeai-7933s-projects/v0-voice-loop-hr-platform)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/ftTpqsXikOm)
[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

## 🚀 Live Demo

**Visit the deployed VoiceLoop HR Platform:** [https://v0-voice-loop-hr-platform-git-311a9e-peercodeai-7933s-projects.vercel.app/](https://v0-voice-loop-hr-platform-git-311a9e-peercodeai-7933s-projects.vercel.app/)

## Overview

VoiceLoop HR is an intelligent document processing platform that leverages AI to extract, analyze, and summarize HR documents. Built with Next.js 15 and TypeScript, it provides a modern, scalable solution for document management and AI-powered insights.

**🚀 NEW: AWS Textract Integration** - Enterprise-grade document parsing with 99%+ accuracy for forms, tables, and key-value pairs!

## Features

### 🚀 **Core Capabilities**
- **Multi-format Support**: PDF, DOCX, CSV, Markdown, and text files
- **AI-Powered Analysis**: OpenAI GPT-4 integration for intelligent summarization
- **Smart Document Processing**: Intelligent text extraction and content analysis
- **Voice Integration**: Audio transcription and voice chat capabilities
- **Modern UI**: Beautiful, responsive interface with Radix UI components

### 📄 **Document Processing**
- **PDF Processing**: Enhanced with AWS Textract for enterprise-grade OCR
- **Form Recognition**: Automatic key-value pair extraction from forms
- **Table Extraction**: Structured data conversion from complex tables
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
- **AWS Textract**: Enterprise-grade document analysis
- **AWS S3**: Document storage and management
- **Document Processing**: Multi-format text extraction
- **AI Integration**: OpenAI API services

### **Development Tools**
- **pnpm**: Fast package manager
- **ESLint**: Code quality and consistency
- **TypeScript**: Static type checking
- **PostCSS**: CSS processing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- OpenAI API key (for AI features)
- AWS account with Textract and S3 access

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
   cp .env.example .env.local  # if exists, or create manually
   ```

4. **Configure AWS credentials** (Required for Textract features)
   ```bash
   # Add AWS credentials to .env.local
   echo "AWS_REGION=us-east-1" >> .env.local
   echo "AWS_ACCESS_KEY_ID=your_access_key_here" >> .env.local
   echo "AWS_SECRET_ACCESS_KEY=your_secret_key_here" >> .env.local
   echo "S3_BUCKET_NAME=your-s3-bucket-name" >> .env.local
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

## 🔑 AWS Credentials Setup

### **Step 1: Create AWS Account**
1. Go to [AWS Console](https://aws.amazon.com/)
2. Click "Create an AWS Account"
3. Follow the signup process (credit card required)
4. Choose "Free Tier" if eligible

### **Step 2: Create IAM User**
1. Go to IAM Console → Users → Create User
2. Name: `voiceloop-hr-dev` (or your preferred name)
3. Attach policies for Textract and S3 access

**Required IAM Policies:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "textract:AnalyzeDocument",
        "textract:DetectDocumentText",
        "textract:GetDocumentAnalysis",
        "textract:StartDocumentAnalysis"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-document-bucket",
        "arn:aws:s3:::your-document-bucket/*"
      ]
    }
  ]
}
```

### **Step 3: Generate Access Keys**
1. Select your IAM user → Security credentials tab
2. Click "Create access key"
3. Choose "Command Line Interface (CLI)"
4. Download the CSV file with credentials
5. **Store securely** (never commit to git!)

### **Step 4: Create S3 Bucket**
```bash
# Install AWS CLI
# Windows: choco install awscli
# macOS: brew install awscli
# Linux: curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

# Configure AWS CLI
aws configure
# Enter your Access Key ID
# Enter your Secret Access Key
# Enter your region (e.g., us-east-1)
# Enter output format (json)

# Create S3 bucket
aws s3 mb s3://voiceloop-hr-documents-$(date +%Y%m%d)
# Example: voiceloop-hr-documents-20241201
```

### **Step 5: Update Environment Variables**
```bash
# Update .env.local with your actual values
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=voiceloop-hr-documents-20241201
```

### **Step 6: Test AWS Integration**
```bash
# Test AWS connectivity
aws sts get-caller-identity
aws s3 ls
aws textract help

# Test from your app
pnpm ts-node lib/aws/test-connection.ts
```

## 📚 Documentation

### **Key Files**
- **SMART_PARSER.md**: Complete AWS Textract integration strategy
- **WEEK1_IMPLEMENTATION_GUIDE.md**: Step-by-step AWS setup guide
- **QUICK_START_GUIDE.md**: Quick setup and development commands
- **SECURITY.md**: Comprehensive security guide and best practices

### **AWS Resources**
- [AWS Textract Developer Guide](https://docs.aws.amazon.com/textract/)
- [Textract API Reference](https://docs.aws.amazon.com/textract/latest/dg/API_Reference.html)
- [S3 Integration Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/)

## 🚨 Common Issues

### **AWS Credentials Not Working**
```bash
# Verify credentials
aws sts get-caller-identity

# Check IAM permissions
aws iam get-user
aws iam list-attached-user-policies --user-name your-username
```

### **S3 Bucket Access Denied**
```bash
# Verify bucket access
aws s3 ls s3://your-bucket-name

# Check bucket policy
aws s3api get-bucket-policy --bucket your-bucket-name
```

### **Textract API Errors**
```bash
# Check service availability
aws textract help

# Verify region configuration
aws configure list
```

## 🎯 Development Commands

```bash
# Install dependencies
pnpm install

# Add AWS SDK
pnpm add @aws-sdk/client-textract @aws-sdk/client-s3 @aws-sdk/lib-storage

# Run tests
pnpm test

# Start development server
pnpm dev

# Run benchmarks
pnpm run benchmark:pdf

# Test AWS integration
pnpm ts-node lib/aws/integration-test.ts

# 🔒 Security scanning
npm run security:scan      # Comprehensive security check
npm run security:check     # Quick security validation
npm run pre-push          # Full pre-push validation
```

## 🚀 What's Next?

### **Immediate (Today)**
1. ✅ Set up development environment
2. ✅ Configure AWS credentials
3. ✅ Create S3 bucket
4. ✅ Test AWS integration

### **This Week**
1. 🔗 Implement document upload pipeline
2. 🔍 Integrate Textract document analysis
3. 🛡️ Implement fallback to local processing

### **Following Weeks**
1. 🧠 Enhanced content analysis with Textract data
2. 🧪 Comprehensive testing and optimization
3. 🚀 Production deployment and monitoring

---

**🎉 Ready to build enterprise-grade document intelligence! Start with AWS credentials setup and follow the implementation guides.**
