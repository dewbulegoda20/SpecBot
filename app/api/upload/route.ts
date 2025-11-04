import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveUploadedFile, validateFileType, validateFileSize } from '@/lib/upload';
import { processAndChunkPDF } from '@/lib/pdf';
import { generateEmbeddings } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!validateFileType(file.name)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (!validateFileSize(file.size)) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed size (10MB).' },
        { status: 400 }
      );
    }

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const { filepath, filename } = await saveUploadedFile(buffer, file.name);

    // Create document record
    const document = await prisma.document.create({
      data: {
        filename,
        filepath,
        filesize: file.size,
      },
    });

    // Process PDF in background (chunks and embeddings)
    // We'll do this synchronously for now, but in production you'd want to use a job queue
    try {
      const chunks = await processAndChunkPDF(filepath);
      
      // Generate embeddings in batches
      const batchSize = 20;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddings = await generateEmbeddings(batch.map(c => c.content));
        
        // Save chunks with embeddings
        await prisma.documentChunk.createMany({
          data: batch.map((chunk, idx) => ({
            documentId: document.id,
            content: chunk.content,
            pageNumber: chunk.pageNumber,
            chunkIndex: chunk.chunkIndex,
            embedding: JSON.stringify(embeddings[idx]),
          })),
        });
      }

      // Create initial conversation
      const conversation = await prisma.conversation.create({
        data: {
          documentId: document.id,
          title: 'New Conversation',
        },
      });

      return NextResponse.json({
        success: true,
        document: {
          id: document.id,
          filename: document.filename,
          uploadedAt: document.uploadedAt,
        },
        conversation: {
          id: conversation.id,
        },
      });
    } catch (error) {
      // If processing fails, delete the document
      await prisma.document.delete({ where: { id: document.id } });
      throw error;
    }
  } catch (error) {
    console.error('Upload error:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to upload and process document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
