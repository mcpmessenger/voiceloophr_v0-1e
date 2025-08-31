# 🚀 Week 1 Implementation Guide - AWS Foundation

## 📅 **Week 1 Overview**
**Goal**: Set up AWS infrastructure and basic Textract integration
**Duration**: Flexible (work at your own pace)
**Estimated Effort**: 2-3 days of focused work
**Key Deliverables**: AWS account configured, S3 bucket ready, basic Textract client working

---

## 🎯 **Day 1: AWS Account Setup & IAM Configuration**

### **Session 1: AWS Account Setup**

#### **Task 1.1: Create AWS Account and IAM Roles**

**Step 1: AWS Account Creation**
```bash
# 1. Navigate to AWS Console
open https://aws.amazon.com/

# 2. Click "Create an AWS Account"
# 3. Follow the signup process with your business email
# 4. Set up billing information (credit card required)
# 5. Choose "Free Tier" if eligible
```

**Step 2: IAM User Creation**
```bash
# 1. Go to IAM Console
# 2. Create new IAM user for development
# 3. Attach policies for Textract and S3 access
```

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

**Step 3: Access Key Configuration**
```bash
# 1. Generate access keys for your IAM user
# 2. Download the CSV file with credentials
# 3. Store securely (never commit to git!)
```

**Step 4: AWS CLI Setup**
```bash
# Install AWS CLI if not already installed
# Windows (using chocolatey):
choco install awscli

# Or download from: https://aws.amazon.com/cli/

# Configure AWS CLI
aws configure
# Enter your Access Key ID
# Enter your Secret Access Key
# Enter your region (e.g., us-east-1)
# Enter output format (json)
```

**Step 5: Test AWS Connectivity**
```bash
# Test S3 access
aws s3 ls

# Test Textract access (should show available APIs)
aws textract help
```

**Acceptance Criteria Met When:**
- [ ] AWS account created and accessible
- [ ] IAM user with proper permissions created
- [ ] Access keys generated and stored securely
- [ ] AWS CLI configured and working
- [ ] Basic connectivity tests passing

---

### **Session 2: S3 Bucket Setup**

#### **Task 1.2: Set up S3 Bucket for Document Processing**

**Step 1: Create S3 Bucket**
```bash
# Create bucket with unique name
aws s3 mb s3://voiceloop-hr-documents-$(date +%Y%m%d)

# Example: voiceloop-hr-documents-20241201
```

**Step 2: Configure Bucket Settings**
```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket voiceloop-hr-documents-20241201 \
  --versioning-configuration Status=Enabled

# Configure lifecycle policy for cost optimization
aws s3api put-bucket-lifecycle-configuration \
  --bucket voiceloop-hr-documents-20241201 \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "DeleteOldVersions",
        "Status": "Enabled",
        "Filter": {},
        "NoncurrentVersionExpiration": {
          "NoncurrentDays": 7
        }
      },
      {
        "ID": "DeleteOldDocuments",
        "Status": "Enabled",
        "Filter": {},
        "Expiration": {
          "Days": 30
        }
      }
    ]
  }'
```

**Step 3: Configure CORS for Web App Access**
```bash
# Create CORS configuration file
cat > cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
EOF

# Apply CORS configuration
aws s3api put-bucket-cors \
  --bucket voiceloop-hr-documents-20241201 \
  --cors-configuration file://cors-config.json
```

**Step 4: Test S3 Operations**
```bash
# Test upload
echo "test document content" > test-doc.txt
aws s3 cp test-doc.txt s3://voiceloop-hr-documents-20241201/

# Test download
aws s3 cp s3://voiceloop-hr-documents-20241201/test-doc.txt ./downloaded-test.txt

# Test list
aws s3 ls s3://voiceloop-hr-documents-20241201/

# Clean up test files
aws s3 rm s3://voiceloop-hr-documents-20241201/test-doc.txt
rm test-doc.txt downloaded-test.txt
```

**Acceptance Criteria Met When:**
- [ ] S3 bucket created with proper naming
- [ ] Versioning enabled
- [ ] Lifecycle policies configured
- [ ] CORS settings applied
- [ ] Basic S3 operations working

---

## 🎯 **Session 3: AWS SDK Installation & Configuration**

#### **Task 1.3: Install and Configure AWS SDK**

**Step 1: Install AWS SDK Dependencies**
```bash
# Navigate to project directory
cd voiceloophr_v0-1e

# Install AWS SDK v3 packages
pnpm add @aws-sdk/client-textract @aws-sdk/client-s3 @aws-sdk/lib-storage

# Install additional utilities
pnpm add @aws-sdk/s3-request-presigner
```

**Step 2: Create AWS Configuration File**
```typescript
// lib/aws/config.ts
import { TextractClient, S3Client } from '@aws-sdk/client-textract'
import { S3Client as S3ClientV2 } from '@aws-sdk/client-s3'

export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
}

export const textractClient = new TextractClient(awsConfig)
export const s3Client = new S3Client(awsConfig)

// For compatibility with some S3 operations
export const s3ClientV2 = new S3ClientV2(awsConfig)
```

**Step 3: Update Environment Variables**
```bash
# Add to .env.local
echo "AWS_REGION=us-east-1" >> .env.local
echo "AWS_ACCESS_KEY_ID=your_access_key_here" >> .env.local
echo "AWS_SECRET_ACCESS_KEY=your_secret_key_here" >> .env.local
echo "S3_BUCKET_NAME=voiceloop-hr-documents-20241201" >> .env.local
```

**Step 4: Create Basic AWS Service Test**
```typescript
// lib/aws/test-connection.ts
import { textractClient, s3Client } from './config'

export async function testAWSConnection() {
  try {
    // Test S3 connection
    const s3Test = await s3Client.send(new ListBucketsCommand({}))
    console.log('✅ S3 connection successful')
    
    // Test Textract connection (list available APIs)
    const textractTest = await textractClient.send(new ListDocumentAnalysisJobsCommand({}))
    console.log('✅ Textract connection successful')
    
    return { success: true, s3: s3Test, textract: textractTest }
  } catch (error) {
    console.error('❌ AWS connection failed:', error)
    return { success: false, error }
  }
}
```

**Step 5: Test AWS SDK Integration**
```bash
# Run the connection test
pnpm ts-node lib/aws/test-connection.ts
```

**Acceptance Criteria Met When:**
- [ ] AWS SDK packages installed
- [ ] Configuration file created
- [ ] Environment variables set
- [ ] Basic connectivity test passing
- [ ] No TypeScript compilation errors

---

#### **Task 1.4: Implement Basic Textract Client**

**Step 1: Create Textract Client Class**
```typescript
// lib/aws/textractClient.ts
import { 
  TextractClient, 
  AnalyzeDocumentCommand,
  AnalyzeDocumentCommandInput,
  AnalyzeDocumentCommandOutput 
} from '@aws-sdk/client-textract'
import { textractClient } from './config'

export interface TextractAnalysisResult {
  success: boolean
  text?: string
  forms?: any[]
  tables?: any[]
  keyValuePairs?: any[]
  confidence?: number
  error?: string
  processingTime: number
}

export class TextractService {
  private client: TextractClient
  
  constructor() {
    this.client = textractClient
  }
  
  async analyzeDocument(
    documentBytes: Buffer,
    features: string[] = ['FORMS', 'TABLES', 'LINES']
  ): Promise<TextractAnalysisResult> {
    const startTime = Date.now()
    
    try {
      const command: AnalyzeDocumentCommandInput = {
        Document: {
          Bytes: documentBytes
        },
        FeatureTypes: features as any
      }
      
      const response: AnalyzeDocumentCommandOutput = await this.client.send(
        new AnalyzeDocumentCommand(command)
      )
      
      const processingTime = Date.now() - startTime
      
      return {
        success: true,
        text: this.extractText(response),
        forms: this.extractForms(response),
        tables: this.extractTables(response),
        keyValuePairs: this.extractKeyValuePairs(response),
        confidence: this.calculateConfidence(response),
        processingTime
      }
    } catch (error) {
      const processingTime = Date.now() - startTime
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      }
    }
  }
  
  private extractText(response: AnalyzeDocumentCommandOutput): string {
    // Extract plain text from response
    return response.Blocks?.filter(block => block.BlockType === 'LINE')
      .map(block => block.Text)
      .join(' ') || ''
  }
  
  private extractForms(response: AnalyzeDocumentCommandOutput): any[] {
    // Extract form fields
    return response.Blocks?.filter(block => block.BlockType === 'KEY_VALUE_SET')
      .map(block => ({
        key: block.Key?.Text || '',
        value: block.Value?.Text || '',
        confidence: block.Confidence || 0
      })) || []
  }
  
  private extractTables(response: AnalyzeDocumentCommandOutput): any[] {
    // Extract table data
    // This is a simplified version - you'll enhance this later
    return []
  }
  
  private extractKeyValuePairs(response: AnalyzeDocumentCommandOutput): any[] {
    // Extract key-value pairs
    return this.extractForms(response)
  }
  
  private calculateConfidence(response: AnalyzeDocumentCommandOutput): number {
    // Calculate overall confidence
    const blocks = response.Blocks || []
    if (blocks.length === 0) return 0
    
    const totalConfidence = blocks.reduce((sum, block) => sum + (block.Confidence || 0), 0)
    return totalConfidence / blocks.length
  }
}
```

**Step 2: Create S3 Service Class**
```typescript
// lib/aws/s3Client.ts
import { 
  S3Client, 
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand 
} from '@aws-sdk/client-s3'
import { s3Client } from './config'

export interface S3UploadResult {
  success: boolean
  key?: string
  url?: string
  error?: string
}

export class S3Service {
  private client: S3Client
  private bucketName: string
  
  constructor() {
    this.client = s3Client
    this.bucketName = process.env.S3_BUCKET_NAME || ''
  }
  
  async uploadDocument(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string
  ): Promise<S3UploadResult> {
    try {
      const key = `documents/${Date.now()}-${fileName}`
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString()
        }
      })
      
      await this.client.send(command)
      
      return {
        success: true,
        key,
        url: `https://${this.bucketName}.s3.amazonaws.com/${key}`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async getDocument(key: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })
      
      const response = await this.client.send(command)
      const chunks: Uint8Array[] = []
      
      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk)
        }
      }
      
      return Buffer.concat(chunks)
    } catch (error) {
      console.error('Error getting document from S3:', error)
      return null
    }
  }
  
  async deleteDocument(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })
      
      await this.client.send(command)
      return true
    } catch (error) {
      console.error('Error deleting document from S3:', error)
      return false
    }
  }
}
```

**Step 3: Create Integration Test**
```typescript
// lib/aws/integration-test.ts
import { TextractService } from './textractClient'
import { S3Service } from './s3Client'
import * as fs from 'fs'
import * as path from 'path'

export async function runIntegrationTest() {
  console.log('🧪 Starting AWS Textract Integration Test...')
  
  try {
    // Test S3 service
    console.log('\n📁 Testing S3 Service...')
    const s3Service = new S3Service()
    
    // Create test document
    const testContent = 'This is a test document for AWS Textract integration.'
    const testBuffer = Buffer.from(testContent)
    
    // Upload test document
    const uploadResult = await s3Service.uploadDocument(
      testBuffer,
      'test-document.txt',
      'text/plain'
    )
    
    if (!uploadResult.success) {
      throw new Error(`S3 upload failed: ${uploadResult.error}`)
    }
    
    console.log('✅ S3 upload successful:', uploadResult.key)
    
    // Test Textract service
    console.log('\n🔍 Testing Textract Service...')
    const textractService = new TextractService()
    
    const analysisResult = await textractService.analyzeDocument(testBuffer)
    
    if (!analysisResult.success) {
      throw new Error(`Textract analysis failed: ${analysisResult.error}`)
    }
    
    console.log('✅ Textract analysis successful')
    console.log(`📊 Processing time: ${analysisResult.processingTime}ms`)
    console.log(`📝 Extracted text: "${analysisResult.text}"`)
    console.log(`🎯 Confidence: ${analysisResult.confidence?.toFixed(2)}%`)
    
    // Clean up test document
    if (uploadResult.key) {
      await s3Service.deleteDocument(uploadResult.key)
      console.log('🧹 Test document cleaned up')
    }
    
    console.log('\n🎉 Integration test completed successfully!')
    return true
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error)
    return false
  }
}
```

**Step 4: Run Integration Test**
```bash
# Test the complete integration
pnpm ts-node lib/aws/integration-test.ts
```

**Acceptance Criteria Met When:**
- [ ] Textract client class implemented
- [ ] S3 service class implemented
- [ ] Basic document analysis working
- [ ] Error handling covers common AWS errors
- [ ] Integration test passing

---

## 🧪 **Session 4: Testing & Validation**

**Comprehensive Testing**
- [ ] Unit tests for all new classes
- [ ] Integration tests with real AWS services
- [ ] Error scenario testing
- [ ] Performance benchmarking

**Documentation & Cleanup**
- [ ] Update project documentation
- [ ] Create usage examples
- [ ] Document known limitations
- [ ] Prepare for next phase

---

## 📊 **Week 1 Success Metrics**

### **Technical Metrics**
- [ ] AWS account configured and accessible
- [ ] S3 bucket created with proper settings
- [ ] AWS SDK installed and configured
- [ ] Basic Textract client working
- [ ] Integration tests passing

### **Quality Metrics**
- [ ] Error handling comprehensive
- [ ] Code follows project standards
- [ ] Documentation updated
- [ ] Tests provide good coverage

### **Performance Metrics**
- [ ] AWS connection < 1 second
- [ ] S3 operations < 2 seconds
- [ ] Textract analysis < 5 seconds for test documents

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: AWS Credentials Not Working**
**Solution**: Verify IAM permissions and access key configuration
```bash
# Test credentials
aws sts get-caller-identity
```

### **Issue 2: S3 Bucket Access Denied**
**Solution**: Check bucket policy and IAM permissions
```bash
# Verify bucket access
aws s3 ls s3://your-bucket-name
```

### **Issue 3: Textract API Errors**
**Solution**: Verify region configuration and service availability
```bash
# Check available Textract APIs
aws textract help
```

---

## 🎯 **Week 1 Definition of Done**

### **All Tasks Complete When:**
- [ ] AWS infrastructure configured
- [ ] S3 bucket operational
- [ ] AWS SDK integrated
- [ ] Basic Textract client working
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] Ready for Week 2 development

---

## 🚀 **Ready for the Next Phase!**

**Congratulations! You've successfully completed the AWS foundation setup.**

**What You've Accomplished:**
- ✅ AWS infrastructure foundation
- ✅ S3 document storage ready
- ✅ Basic Textract integration working
- ✅ Fallback strategy framework in place

**Next Phase Focus:**
- 🔗 Document upload pipeline
- 🔍 Textract document analysis
- 🛡️ Fallback to local processing
- 📊 Performance monitoring

**Great work! The foundation is solid, and you're ready to build the core functionality.** 🎉
