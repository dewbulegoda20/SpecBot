import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveUploadedFile, validateFileType, validateFileSize } from '@/lib/upload';
import { processPDFWithAzure } from '@/lib/azure-document';
import { generateEmbeddings } from '@/lib/openai';
import { uploadChunksToPinecone } from '@/lib/pinecone-client';

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
      console.log('Processing PDF with Azure Document Intelligence...');
      const { chunks: extractedChunks, totalPages } = await processPDFWithAzure(buffer);
      
      console.log(`Extracted ${extractedChunks.length} chunks from ${totalPages} pages`);

      // Generate embeddings in batches
      const batchSize = 20;
      const chunksWithEmbeddings: Array<{
        id: string;
        embedding: number[];
        text: string;
        pageNumber: number;
        chunkType: 'paragraph' | 'table' | 'heading' | 'list';
        readingOrder: number;
        boundingBox?: number[];
        tableData?: any;
        heading?: any;
      }> = [];

      for (let i = 0; i < extractedChunks.length; i += batchSize) {
        const batch = extractedChunks.slice(i, i + batchSize);
        const embeddings = await generateEmbeddings(batch.map(c => c.text));
        
        batch.forEach((chunk, idx) => {
          const chunkId = `${document.id}-chunk-${i + idx}`;
          chunksWithEmbeddings.push({
            id: chunkId,
            embedding: embeddings[idx],
            text: chunk.text,
            pageNumber: chunk.pageNumber,
            chunkType: chunk.chunkType,
            readingOrder: chunk.readingOrder,
            boundingBox: chunk.boundingBox,
            tableData: chunk.metadata.tableData,
            heading: chunk.metadata.heading,
          });
        });

        console.log(`Generated embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(extractedChunks.length / batchSize)}`);
      }

      // Upload to Pinecone
      console.log('Uploading chunks to Pinecone...');
      await uploadChunksToPinecone(document.id, chunksWithEmbeddings);

      // Save chunks to database (without embeddings, since they're in Pinecone)
      await prisma.documentChunk.createMany({
        data: extractedChunks.map((chunk, idx) => ({
          documentId: document.id,
          content: chunk.text,
          pageNumber: chunk.pageNumber,
          chunkIndex: idx,
          chunkType: chunk.chunkType,
          readingOrder: chunk.readingOrder,
          boundingBox: chunk.boundingBox ? JSON.stringify(chunk.boundingBox) : null,
          tableData: chunk.metadata.tableData ? JSON.stringify(chunk.metadata.tableData) : null,
          heading: chunk.metadata.heading ? JSON.stringify(chunk.metadata.heading) : null,
          pineconeId: `${document.id}-chunk-${idx}`,
        })),
      });

      console.log('PDF processing complete!');

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
          totalPages,
          totalChunks: extractedChunks.length,
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
