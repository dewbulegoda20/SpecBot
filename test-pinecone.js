/**
 * Pinecone Connection Test Script
 * 
 * This script tests your Pinecone configuration before implementing the full integration.
 * 
 * Prerequisites:
 * 1. npm install @pinecone-database/pinecone
 * 2. Add Pinecone credentials to .env.local
 * 
 * Run: node test-pinecone.js
 */

require('dotenv').config({ path: '.env.local' });

async function testPineconeConnection() {
  console.log('\n🧪 Testing Pinecone Connection...\n');

  // Check environment variables
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!apiKey) {
    console.error('❌ PINECONE_API_KEY not found in .env.local');
    process.exit(1);
  }

  if (!indexName) {
    console.error('❌ PINECONE_INDEX_NAME not found in .env.local');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`   Index Name: ${indexName}`);
  console.log(`   API Key: ${apiKey.substring(0, 10)}...`);

  try {
    // Import Pinecone client
    const { Pinecone } = await import('@pinecone-database/pinecone');

    // Initialize client
    const pc = new Pinecone({
      apiKey: apiKey
    });

    console.log('✅ Pinecone client created');

    // Get index
    const index = pc.index(indexName);
    console.log(`✅ Connected to index: ${indexName}`);

    // Get index stats
    const stats = await index.describeIndexStats();
    console.log('✅ Index stats retrieved:');
    console.log(`   Dimension: ${stats.dimension}`);
    console.log(`   Total Vector Count: ${stats.totalRecordCount || 0}`);
    
    if (stats.namespaces && Object.keys(stats.namespaces).length > 0) {
      console.log('   Namespaces:');
      Object.entries(stats.namespaces).forEach(([name, data]) => {
        console.log(`     - ${name}: ${data.recordCount} vectors`);
      });
    } else {
      console.log('   Namespaces: (none - index is empty)');
    }

    // Test upsert (write a test vector)
    console.log('\n📤 Testing vector upsert...');
    const testNamespace = 'test-namespace';
    await index.namespace(testNamespace).upsert([
      {
        id: 'test-vector-1',
        values: Array(1536).fill(0.1), // Dummy 1536D vector
        metadata: {
          text: 'Test chunk',
          pageNumber: 1,
          test: true
        }
      }
    ]);
    console.log('✅ Test vector uploaded successfully');

    // Test query (read the vector back)
    console.log('\n📥 Testing vector query...');
    const queryResults = await index.namespace(testNamespace).query({
      vector: Array(1536).fill(0.1),
      topK: 1,
      includeMetadata: true
    });
    
    if (queryResults.matches && queryResults.matches.length > 0) {
      console.log('✅ Query successful');
      console.log(`   Found ${queryResults.matches.length} match(es)`);
      console.log(`   Top match ID: ${queryResults.matches[0].id}`);
      console.log(`   Similarity score: ${queryResults.matches[0].score}`);
    } else {
      console.log('⚠️  Query returned no results (unexpected)');
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await index.namespace(testNamespace).deleteAll();
    console.log('✅ Test namespace deleted');

    // Final check
    console.log('\n🎉 Pinecone is set up correctly!');
    console.log('\nNext steps:');
    console.log('1. Install Azure Document Intelligence: npm install @azure/ai-form-recognizer');
    console.log('2. Follow IMPLEMENTATION_GUIDE.md to start coding');

  } catch (error) {
    console.error('\n❌ Error connecting to Pinecone:');
    console.error(error.message);

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check your API key is correct');
      console.error('   - Regenerate key in Pinecone dashboard if needed');
      console.error('   - Verify no extra spaces in .env.local');
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check index name spelling');
      console.error('   - Verify index exists in Pinecone dashboard');
      console.error('   - Wait 60 seconds if just created');
    } else if (error.message.includes('dimension')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Index dimension must be 1536');
      console.error('   - Delete and recreate index with correct dimension');
    } else {
      console.error('\n💡 Troubleshooting:');
      console.error('   - See SETUP_PINECONE.md for detailed setup');
      console.error('   - Check network connection');
      console.error('   - Verify Pinecone service status');
    }

    process.exit(1);
  }
}

testPineconeConnection();
