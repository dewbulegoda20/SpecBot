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
        references: {
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
      if (msg.references && msg.references.length > 0) {
        console.log(`Message ${msg.id} has ${msg.references.length} references:`, 
          msg.references.map(r => `Page ${r.pageNumber}`));
      }
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
