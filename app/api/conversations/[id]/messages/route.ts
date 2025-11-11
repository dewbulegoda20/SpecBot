import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messages = await prisma.message.findMany({
      where: {
        conversationId: params.id,
      },
      include: {
        Reference: {
          orderBy: {
            pageNumber: 'asc', // Order by page number instead of relevance
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`Loaded ${messages.length} messages`);
    messages.forEach(msg => {
      if (msg.Reference && msg.Reference.length > 0) {
        console.log(`Message ${msg.id} has ${msg.Reference.length} references:`);
        msg.Reference.forEach((ref, idx) => {
          console.log(`  [${idx}] Page ${ref.pageNumber}, BoundingBox: ${ref.boundingBox ? 'YES' : 'NO'}, Type: ${ref.chunkType}`);
        });
      }
    });

    // Transform Prisma's Reference to lowercase references for frontend
    const transformedMessages = messages.map(msg => ({
      ...msg,
      references: msg.Reference, // Map Reference -> references (includes all fields like boundingBox)
      Reference: undefined, // Remove capital R version
    }));

    return NextResponse.json({ messages: transformedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
