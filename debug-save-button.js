// Debug script to test the Save Document button functionality
// Run this in your browser console

async function testSaveDocument() {
  console.log('🧪 Testing Save Document functionality...');
  
  // Get the current document data from the page
  const fileId = 'file_1757650825272_ejxmvjc61'; // From your URL
  const fileName = '8.25.25IPanalysis.md.pdf';
  
  // Get the extracted text from the page (you'll need to find this element)
  const textElement = document.querySelector('[data-testid="document-text"]') || 
                     document.querySelector('.document-content') ||
                     document.querySelector('pre') ||
                     document.querySelector('textarea');
  
  if (!textElement) {
    console.log('❌ Could not find document text on page');
    console.log('Available elements:', document.querySelectorAll('*').length);
    return;
  }
  
  const extractedText = textElement.textContent || textElement.value || '';
  console.log('📄 Found text length:', extractedText.length);
  console.log('📄 Text preview:', extractedText.substring(0, 200) + '...');
  
  if (!extractedText || extractedText.length < 100) {
    console.log('❌ Text too short or empty');
    return;
  }
  
  // Test the RAG save API directly
  try {
    console.log('🚀 Testing RAG save API...');
    
    const response = await fetch('/api/rag/save-for-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: crypto.randomUUID(),
        fileName: fileName,
        text: extractedText,
        userId: null,
        openaiKey: localStorage.getItem('voiceloop_openai_key')
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ RAG save successful!', result);
      console.log('📊 Created chunks:', result.chunks?.length || 0);
    } else {
      console.log('❌ RAG save failed:', result);
    }
    
  } catch (error) {
    console.log('❌ RAG save error:', error);
  }
  
  // Test the regular database save API
  try {
    console.log('🚀 Testing database save API...');
    
    const response = await fetch('/api/documents/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        name: fileName,
        type: 'application/pdf',
        size: extractedText.length,
        extractedText: extractedText,
        summary: '',
        processingMethod: 'debug-test',
        userId: null
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Database save successful!', result);
    } else {
      console.log('❌ Database save failed:', result);
    }
    
  } catch (error) {
    console.log('❌ Database save error:', error);
  }
}

// Run the test
testSaveDocument();
