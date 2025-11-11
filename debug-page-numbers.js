// Quick diagnostic script to check page numbers in database
const { PrismaClient } = require('@prisma/client');

async function checkPageNumbers() {
  const prisma = new PrismaClient();
  
  try {
    // Get all documents
    const documents = await prisma.document.findMany({
      orderBy: { uploadedAt: 'desc' },
      take: 1,
    });
    
    if (documents.length === 0) {
      console.log('No documents found');
      return;
    }
    
    const doc = documents[0];
    console.log(`\n📄 Document: ${doc.filename}`);
    console.log(`   ID: ${doc.id}`);
    
    // Get chunks for this document
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId: doc.id },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        chunkIndex: true,
        pageNumber: true,
        chunkType: true,
        boundingBox: true,
        content: true,
      },
    });
    
    console.log(`\n📦 Total chunks: ${chunks.length}\n`);
    
    // Count chunks per page
    const pageDistribution = {};
    chunks.forEach(chunk => {
      const page = chunk.pageNumber || 0;
      pageDistribution[page] = (pageDistribution[page] || 0) + 1;
    });
    
    console.log('📊 Page Distribution:');
    Object.entries(pageDistribution)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([page, count]) => {
        console.log(`   Page ${page}: ${count} chunks`);
      });
    
    // Check bounding boxes
    const chunksWithBBox = chunks.filter(c => c.boundingBox && c.boundingBox !== 'null');
    const chunksWithoutBBox = chunks.filter(c => !c.boundingBox || c.boundingBox === 'null');
    
    console.log(`\n📐 Bounding Box Stats:`);
    console.log(`   With bounding box: ${chunksWithBBox.length}`);
    console.log(`   Without bounding box: ${chunksWithoutBBox.length}`);
    
    // Show first 10 chunks
    console.log(`\n🔍 First 10 chunks:`);
    chunks.slice(0, 10).forEach(chunk => {
      const hasBBox = chunk.boundingBox && chunk.boundingBox !== 'null';
      const bboxPreview = hasBBox ? chunk.boundingBox.substring(0, 30) + '...' : 'NONE';
      console.log(`   [${chunk.chunkIndex}] Page ${chunk.pageNumber} | ${chunk.chunkType.padEnd(10)} | BBox: ${bboxPreview}`);
      console.log(`       Text: ${chunk.content.substring(0, 60)}...`);
    });
    
    // Show last conversation's references
    const latestConversation = await prisma.conversation.findFirst({
      where: { documentId: doc.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        Message: {
          where: { role: 'assistant' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            Reference: true,
          },
        },
      },
    });
    
    if (latestConversation && latestConversation.Message.length > 0) {
      const message = latestConversation.Message[0];
      console.log(`\n💬 Latest Assistant Message References:`);
      console.log(`   Total references: ${message.Reference.length}`);
      message.Reference.slice(0, 10).forEach(ref => {
        const hasBBox = ref.boundingBox && ref.boundingBox !== 'null';
        console.log(`   [${ref.citationIndex}] Page ${ref.pageNumber} | BBox: ${hasBBox ? 'YES' : 'NO'} | ChunkType: ${ref.chunkType || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPageNumbers();
