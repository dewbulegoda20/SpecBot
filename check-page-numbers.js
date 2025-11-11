/**
 * Check page numbers in database and Pinecone
 */

const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');

const prisma = new PrismaClient();

async function checkPageNumbers() {
  try {
    console.log('🔍 CHECKING PAGE NUMBERS IN DATABASE\n');

    // Get document chunks
    const chunks = await prisma.documentChunk.findMany({
      take: 20,
      orderBy: { chunkIndex: 'asc' },
      select: {
        chunkIndex: true,
        pageNumber: true,
        content: true,
        pineconeId: true,
      },
    });

    console.log(`Found ${chunks.length} chunks in database:\n`);
    
    // Group by page number
    const pageGroups = {};
    chunks.forEach(chunk => {
      if (!pageGroups[chunk.pageNumber]) {
        pageGroups[chunk.pageNumber] = 0;
      }
      pageGroups[chunk.pageNumber]++;
      
      if (chunk.chunkIndex < 10) {
        console.log(`Chunk ${chunk.chunkIndex}: Page ${chunk.pageNumber} - "${chunk.content.substring(0, 60)}..."`);
      }
    });

    console.log('\n📊 Page distribution:');
    Object.keys(pageGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(page => {
      console.log(`  Page ${page}: ${pageGroups[page]} chunks`);
    });

    // Now check Pinecone
    console.log('\n🔍 CHECKING PINECONE METADATA\n');
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pinecone.index('specbot-embeddings');
    
    // Fetch a few vectors to check metadata
    if (chunks.length > 0 && chunks[0].pineconeId) {
      const fetchResponse = await index.fetch([
        chunks[0].pineconeId,
        chunks[1]?.pineconeId,
        chunks[2]?.pineconeId,
      ].filter(Boolean));

      console.log('Pinecone vectors metadata:');
      Object.entries(fetchResponse.records).forEach(([id, vector]) => {
        console.log(`  ${id}:`);
        console.log(`    pageNumber: ${vector.metadata?.pageNumber}`);
        console.log(`    text preview: "${(vector.metadata?.text || '').substring(0, 60)}..."`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPageNumbers();
