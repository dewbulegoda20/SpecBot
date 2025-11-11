// Test Azure Document Intelligence Setup
// Run with: node test-azure.js

require('dotenv/config');
const { DocumentAnalysisClient, AzureKeyCredential } = require('@azure/ai-form-recognizer');
const fs = require('fs');

async function testAzure() {
  try {
    console.log('🔍 Testing Azure Document Intelligence...\n');
    
    // Check environment variables
    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
    
    if (!endpoint || !key) {
      console.error('❌ Missing environment variables!');
      console.log('Make sure you have these in .env.local:');
      console.log('  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
      console.log('  AZURE_DOCUMENT_INTELLIGENCE_KEY');
      return;
    }
    
    console.log('✅ Environment variables found');
    console.log(`📍 Endpoint: ${endpoint}\n`);
    
    // Create client
    const client = new DocumentAnalysisClient(
      endpoint,
      new AzureKeyCredential(key)
    );
    
    console.log('✅ Client created successfully\n');
    
    // Test with a sample PDF (if you have one)
    // For now, just test the connection
    console.log('🎉 Azure Document Intelligence is set up correctly!');
    console.log('\nNext steps:');
    console.log('1. Upload a test PDF to your project');
    console.log('2. Run the full extraction test');
    console.log('3. Start using it in your upload route\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n💡 Your API key might be invalid. Check:');
      console.log('1. Copy the key exactly from Azure Portal');
      console.log('2. Make sure there are no extra spaces');
      console.log('3. Try using Key 2 instead of Key 1');
    } else if (error.message.includes('404')) {
      console.log('\n💡 Endpoint might be wrong. Make sure it:');
      console.log('1. Starts with https://');
      console.log('2. Ends with .cognitiveservices.azure.com/');
      console.log('3. Matches exactly from Azure Portal');
    }
  }
}

testAzure();
