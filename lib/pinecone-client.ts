/**
 * Pinecone Vector Database Client
 * 
 * This module handles all interactions with Pinecone for vector storage and retrieval.
 */

import { Pinecone, Index, RecordMetadata } from '@pinecone-database/pinecone';

// Initialize Pinecone client
const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME;

if (!apiKey || !indexName) {
  throw new Error('Pinecone credentials not configured');
}

const pc = new Pinecone({ apiKey });

export interface ChunkMetadata {
  documentId: string;
  chunkIndex: number;
  text: string;
  pageNumber: number;
  chunkType: string;
  readingOrder: number;
  boundingBox?: string;
  tableData?: string;
  heading?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: RecordMetadata;
}

/**
 * Get Pinecone index
 */
export function getPineconeIndex(): Index {
  return pc.index(indexName!);
}

/**
 * Upload chunks to Pinecone
 */
export async function uploadChunksToPinecone(
  documentId: string,
  chunks: Array<{
    id: string;
    embedding: number[];
    text: string;
    pageNumber: number;
    chunkType: 'paragraph' | 'table' | 'heading' | 'list';
    readingOrder: number;
    boundingBox?: number[];
    tableData?: any;
    heading?: any;
  }>
): Promise<void> {
  try {
    const index = getPineconeIndex();

    // Prepare vectors for upsert
    const vectors = chunks.map((chunk, idx) => {
      // Build metadata object, excluding undefined values
      const metadata: Record<string, string | number | boolean | string[]> = {
        documentId,
        chunkIndex: idx,
        text: chunk.text.substring(0, 40000), // Pinecone metadata limit
        pageNumber: chunk.pageNumber,
        chunkType: chunk.chunkType,
        readingOrder: chunk.readingOrder,
      };

      // Log first few chunks to verify page numbers
      if (idx < 3) {
        console.log(`🔍 Preparing chunk ${idx} for Pinecone:`, {
          id: chunk.id,
          pageNumber: chunk.pageNumber,
          textPreview: chunk.text.substring(0, 50),
        });
      }

      // Only add optional fields if they have values
      if (chunk.boundingBox) {
        metadata.boundingBox = JSON.stringify(chunk.boundingBox);
      }
      if (chunk.tableData) {
        metadata.tableData = JSON.stringify(chunk.tableData);
      }
      if (chunk.heading) {
        metadata.heading = JSON.stringify(chunk.heading);
      }

      return {
        id: chunk.id,
        values: chunk.embedding,
        metadata: metadata as RecordMetadata,
      };
    });

    // Upload in batches of 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.namespace(documentId).upsert(batch);
      console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
    }

    console.log(`Successfully uploaded ${vectors.length} chunks to Pinecone`);
  } catch (error) {
    console.error('Error uploading to Pinecone:', error);
    throw new Error(`Failed to upload to Pinecone: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search for relevant chunks
 */
export async function searchChunks(
  documentId: string,
  queryEmbedding: number[],
  topK: number = 5
): Promise<SearchResult[]> {
  try {
    const index = getPineconeIndex();

    const queryResponse = await index.namespace(documentId).query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    return queryResponse.matches.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata || {},
    }));
  } catch (error) {
    console.error('Error searching Pinecone:', error);
    throw new Error(`Failed to search Pinecone: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search with context expansion
 * Returns the matched chunks plus surrounding chunks for better context
 */
export async function searchWithContext(
  documentId: string,
  queryEmbedding: number[],
  topK: number = 3,
  contextWindow: number = 1
): Promise<SearchResult[]> {
  try {
    // First, get the top matches
    const matches = await searchChunks(documentId, queryEmbedding, topK);

    if (matches.length === 0) {
      return [];
    }

    // Expand context by fetching surrounding chunks
    const expandedChunks: SearchResult[] = [...matches];
    const fetchedIds = new Set(matches.map(m => m.id));

    for (const match of matches) {
      const chunkIndex = Number(match.metadata.chunkIndex);
      
      if (isNaN(chunkIndex)) continue; // Skip if not a valid number

      // Fetch previous and next chunks
      for (let offset = -contextWindow; offset <= contextWindow; offset++) {
        if (offset === 0) continue; // Skip the chunk itself

        const neighborId = `${documentId}-chunk-${chunkIndex + offset}`;
        if (fetchedIds.has(neighborId)) continue;

        try {
          const index = getPineconeIndex();
          const fetchResponse = await index.namespace(documentId).fetch([neighborId]);

          if (fetchResponse.records[neighborId]) {
            const record = fetchResponse.records[neighborId];
            expandedChunks.push({
              id: neighborId,
              score: match.score * 0.8, // Lower score for context chunks
              metadata: record.metadata || {},
            });
            fetchedIds.add(neighborId);
          }
        } catch (error) {
          // Chunk doesn't exist, skip
          continue;
        }
      }
    }

    // Sort by reading order to maintain document flow
    expandedChunks.sort((a, b) => {
      const aPage = (a.metadata.pageNumber as number) || 0;
      const bPage = (b.metadata.pageNumber as number) || 0;
      const aOrder = (a.metadata.readingOrder as number) || 0;
      const bOrder = (b.metadata.readingOrder as number) || 0;
      
      if (aPage !== bPage) {
        return aPage - bPage;
      }
      return aOrder - bOrder;
    });

    return expandedChunks;
  } catch (error) {
    console.error('Error searching with context:', error);
    // Fallback to regular search
    return searchChunks(documentId, queryEmbedding, topK);
  }
}

/**
 * Delete all chunks for a document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  try {
    const index = getPineconeIndex();
    await index.namespace(documentId).deleteAll();
    console.log(`Deleted all chunks for document ${documentId}`);
  } catch (error) {
    console.error('Error deleting from Pinecone:', error);
    throw new Error(`Failed to delete from Pinecone: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get statistics for a document
 */
export async function getDocumentStats(documentId: string): Promise<{
  vectorCount: number;
}> {
  try {
    const index = getPineconeIndex();
    const stats = await index.describeIndexStats();

    const namespaceStats = stats.namespaces?.[documentId];
    return {
      vectorCount: namespaceStats?.recordCount || 0,
    };
  } catch (error) {
    console.error('Error getting document stats:', error);
    return { vectorCount: 0 };
  }
}
