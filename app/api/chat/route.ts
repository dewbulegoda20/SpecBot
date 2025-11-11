import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateEmbedding, chatWithReferences } from '@/lib/openai';
import { searchWithContext } from '@/lib/pinecone-client';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, question } = await request.json();

    if (!conversationId || !question) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get conversation and document
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        Document: true,
        Message: {
          orderBy: { createdAt: 'asc' },
          take: 10, // Get last 10 messages for context
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: question,
      },
    });

    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);

    // Search Pinecone for relevant chunks (with context expansion)
    // Increase to 8 top matches for comprehensive answers
    console.log('Searching Pinecone for relevant chunks...');
    const searchResults = await searchWithContext(
      conversation.Document.id,
      questionEmbedding,
      8, // Top 8 matches (increased from 3 for better coverage)
      2  // ±2 surrounding chunks for context (increased from 1)
    );

    console.log(`Found ${searchResults.length} relevant chunks (with context)`);

    // Get full chunk details from database
    const chunkIds = searchResults.map(r => {
      const docId = r.metadata.documentId as string;
      const chunkIdx = r.metadata.chunkIndex as number;
      return `${docId}-chunk-${chunkIdx}`;
    });
    const dbChunks = await prisma.documentChunk.findMany({
      where: {
        pineconeId: { in: chunkIds },
      },
    });

    // Create a map for quick lookup
    const chunkMap = new Map(dbChunks.map(chunk => [chunk.pineconeId, chunk]));

    // Prepare context for AI with enhanced metadata
    const context = searchResults
      .map(result => {
        const docId = result.metadata.documentId as string;
        const chunkIdx = result.metadata.chunkIndex as number;
        const dbChunk = chunkMap.get(`${docId}-chunk-${chunkIdx}`);
        if (!dbChunk) return null;

        const text = result.metadata.text as string;
        const pageNum = result.metadata.pageNumber as number;
        const chunkTypeStr = result.metadata.chunkType as string;
        const tableDataStr = result.metadata.tableData as string | undefined;

        return {
          content: text,
          pageNumber: pageNum,
          chunkId: dbChunk.id,
          chunkType: chunkTypeStr,
          score: result.score,
          tableData: tableDataStr ? JSON.parse(tableDataStr) : undefined,
        };
      })
      .filter(Boolean) as Array<{
      content: string;
      pageNumber: number;
      chunkId: string;
      chunkType: string;
      score: number;
      tableData?: any;
    }>;

    // Get conversation history for context
    const conversationHistory = conversation.Message.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Generate AI response with references
    const { answer, references } = await chatWithReferences({
      question,
      context,
      conversationHistory,
    });

    console.log('AI Response generated:');
    console.log('- Answer length:', answer.length);
    console.log('- References count:', references.length);
    console.log('- References:', references.map(r => ({ page: r.pageNumber, textPreview: r.text.substring(0, 50) })));

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: answer,
      },
    });

    // Save references with enhanced metadata
    if (references.length > 0) {
      const referencesWithMetadata = await Promise.all(
        references.map(async (ref, index) => {
          const dbChunk = await prisma.documentChunk.findUnique({
            where: { id: ref.chunkId },
          });

          return {
            messageId: assistantMessage.id,
            chunkId: ref.chunkId,
            pageNumber: ref.pageNumber,
            text: ref.text,
            relevance: ref.relevance,
            citationIndex: index + 1,
            boundingBox: dbChunk?.boundingBox || null,
            chunkType: dbChunk?.chunkType || null,
          };
        })
      );

      await prisma.reference.createMany({
        data: referencesWithMetadata,
      });
    }

    // Update conversation title if it's the first message
    if (conversation.Message.length === 0) {
      const title = question.substring(0, 50) + (question.length > 50 ? '...' : '');
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title, updatedAt: new Date() },
      });
    }

    // Fetch the complete message with references
    const completeMessage = await prisma.message.findUnique({
      where: { id: assistantMessage.id },
      include: {
        Reference: true,
      },
    });

    // Transform Prisma's Reference to lowercase references for frontend
    const transformedMessage = {
      ...completeMessage,
      references: completeMessage?.Reference, // Map Reference -> references
      Reference: undefined, // Remove capital R version
    };

    return NextResponse.json({
      success: true,
      message: transformedMessage,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
