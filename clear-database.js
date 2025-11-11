/**
 * Clear all data from the database
 * This will delete all documents, conversations, messages, chunks, and references
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('🗑️  Starting database cleanup...\n');

    // Delete in correct order (respecting foreign key constraints)
    console.log('Deleting references...');
    const references = await prisma.reference.deleteMany({});
    console.log(`✅ Deleted ${references.count} references`);

    console.log('Deleting messages...');
    const messages = await prisma.message.deleteMany({});
    console.log(`✅ Deleted ${messages.count} messages`);

    console.log('Deleting conversations...');
    const conversations = await prisma.conversation.deleteMany({});
    console.log(`✅ Deleted ${conversations.count} conversations`);

    console.log('Deleting document chunks...');
    const chunks = await prisma.documentChunk.deleteMany({});
    console.log(`✅ Deleted ${chunks.count} document chunks`);

    console.log('Deleting documents...');
    const documents = await prisma.document.deleteMany({});
    console.log(`✅ Deleted ${documents.count} documents`);

    console.log('\n✨ Database cleared successfully!');
    console.log('You can now upload a fresh PDF to test Azure extraction.');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
