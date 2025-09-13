// Script to retry processing of stuck Markdown file
// Run this in the browser console on the results page

async function retryMarkdownProcessing() {
  console.log('🔄 Retrying Markdown file processing...');
  
  // Get the current file ID from the URL
  const fileId = window.location.pathname.split('/').pop();
  console.log('📄 File ID:', fileId);
  
  // Get OpenAI key from localStorage
  const openaiKey = localStorage.getItem('voiceloop_openai_key');
  if (!openaiKey) {
    console.error('❌ No OpenAI key found. Please set your OpenAI key first.');
    return;
  }
  
  try {
    console.log('🚀 Attempting to process file...');
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: fileId,
        openaiKey: openaiKey
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Processing successful!', result);
      console.log('📊 Summary:', result.summary);
      console.log('📝 Word count:', result.wordCount);
      
      // Refresh the page to show updated results
      window.location.reload();
    } else {
      console.error('❌ Processing failed:', result);
    }
  } catch (error) {
    console.error('❌ Error during processing:', error);
  }
}

// Run the retry
retryMarkdownProcessing();
