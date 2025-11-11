import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const search = searchParams.get('search');

    let whereClause: any = {};
    
    if (documentId) {
      whereClause.documentId = documentId;
    }
    
    if (search) {
      whereClause.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        Document: {
          select: {
            id: true,
            filename: true,
          },
        },
        Message: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { documentId, title } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.create({
      data: {
        documentId,
        title: title || 'New Conversation',
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
