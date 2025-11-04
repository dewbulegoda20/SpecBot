import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateEmbedding, cosineSimilarity, chatWithReferences } from '@/lib/openai';

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
        document: true,
        messages: {
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

    // Get all document chunks with embeddings
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId: conversation.document.id },
    });

    // Calculate similarity and find top relevant chunks
    const chunksWithSimilarity = chunks
      .map(chunk => {
        const chunkEmbedding = JSON.parse(chunk.embedding || '[]');
        const similarity = cosineSimilarity(questionEmbedding, chunkEmbedding);
        return { ...chunk, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Top 5 most relevant chunks

    // Prepare context for AI
    const context = chunksWithSimilarity.map(chunk => ({
      content: chunk.content,
      pageNumber: chunk.pageNumber,
      chunkId: chunk.id,
    }));

    // Get conversation history for context
    const conversationHistory = conversation.messages.map(msg => ({
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

    // Save references
    if (references.length > 0) {
      await prisma.reference.createMany({
        data: references.map((ref, index) => ({
          messageId: assistantMessage.id,
          chunkId: ref.chunkId,
          pageNumber: ref.pageNumber,
          text: ref.text,
          relevance: ref.relevance,
          citationIndex: index + 1, // Citation number is 1-indexed
        })),
      });
    }

    // Update conversation title if it's the first message
    if (conversation.messages.length === 0) {
      const title = question.substring(0, 50) + (question.length > 50 ? '...' : '');
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { title },
      });
    }

    // Fetch the complete message with references
    const completeMessage = await prisma.message.findUnique({
      where: { id: assistantMessage.id },
      include: {
        references: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: completeMessage,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
