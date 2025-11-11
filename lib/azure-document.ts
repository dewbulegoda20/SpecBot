/**
 * Azure Document Intelligence Integration
 * 
 * This module handles PDF processing using Azure's Document Intelligence API.
 * It extracts text, tables, and structural information with high accuracy.
 */

import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import type { AnalyzeResult, DocumentTable, DocumentParagraph } from '@azure/ai-form-recognizer';

// Initialize Azure client
const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

if (!endpoint || !apiKey) {
  throw new Error('Azure Document Intelligence credentials not configured');
}

const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

export interface ExtractedChunk {
  text: string;
  pageNumber: number;
  chunkType: 'paragraph' | 'table' | 'heading' | 'list';
  boundingBox?: number[];
  readingOrder: number;
  metadata: {
    tableData?: {
      rows: number;
      columns: number;
      cells: Array<{
        rowIndex: number;
        columnIndex: number;
        content: string;
        rowSpan?: number;
        columnSpan?: number;
      }>;
    };
    heading?: {
      level: number;
      role: string;
    };
    confidence?: number;
  };
}

export interface ProcessedDocument {
  chunks: ExtractedChunk[];
  totalPages: number;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: string;
  };
}

/**
 * Process PDF with Azure Document Intelligence
 */
export async function processPDFWithAzure(
  fileBuffer: Buffer
): Promise<ProcessedDocument> {
  try {
    console.log('Starting Azure Document Intelligence analysis...');

    // Convert Buffer to Uint8Array for Azure SDK compatibility
    const uint8Array = new Uint8Array(fileBuffer);

    // Analyze document with prebuilt-layout model
    const poller = await client.beginAnalyzeDocument(
      'prebuilt-layout',
      uint8Array
    );

    const result = await poller.pollUntilDone();

    if (!result) {
      throw new Error('No analysis result returned from Azure');
    }

    console.log(`Analysis complete. Processing ${result.pages?.length || 0} pages...`);

    // Extract chunks
    const chunks = extractChunksFromResult(result);

    return {
      chunks,
      totalPages: result.pages?.length || 0,
      metadata: {
        title: extractMetadata(result, 'title'),
        author: extractMetadata(result, 'author'),
      },
    };
  } catch (error) {
    console.error('Azure Document Intelligence error:', error);
    throw new Error(`Failed to process PDF with Azure: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract structured chunks from Azure analysis result
 */
function extractChunksFromResult(result: AnalyzeResult): ExtractedChunk[] {
  const chunks: ExtractedChunk[] = [];
  let readingOrder = 0;

  if (!result.pages) {
    return chunks;
  }

  // Process each page
  for (const page of result.pages) {
    const pageNumber = page.pageNumber;

    // Extract paragraphs
    if (result.paragraphs) {
      const pageParagraphs = result.paragraphs.filter(p => {
        const bbox = p.boundingRegions?.[0];
        return bbox?.pageNumber === pageNumber;
      });

      for (const paragraph of pageParagraphs) {
        const chunk = createParagraphChunk(paragraph, pageNumber, readingOrder++);
        if (chunk) chunks.push(chunk);
      }
    }

    // Extract tables
    if (result.tables) {
      const pageTables = result.tables.filter(t => {
        const bbox = t.boundingRegions?.[0];
        return bbox?.pageNumber === pageNumber;
      });

      for (const table of pageTables) {
        const chunk = createTableChunk(table, pageNumber, readingOrder++);
        if (chunk) chunks.push(chunk);
      }
    }
  }

  console.log(`Extracted ${chunks.length} chunks from ${result.pages.length} pages`);
  return chunks;
}

/**
 * Create chunk from paragraph
 */
function createParagraphChunk(
  paragraph: DocumentParagraph,
  pageNumber: number,
  readingOrder: number
): ExtractedChunk | null {
  if (!paragraph.content || paragraph.content.trim().length === 0) {
    return null;
  }

  const polygon = paragraph.boundingRegions?.[0]?.polygon;
  const boundingBox = polygon ? convertPolygonToArray(polygon) : undefined;
  const role = paragraph.role;

  // Determine chunk type based on role
  let chunkType: ExtractedChunk['chunkType'] = 'paragraph';
  let heading: ExtractedChunk['metadata']['heading'] | undefined;

  if (role) {
    if (role.includes('title') || role.includes('heading')) {
      chunkType = 'heading';
      heading = {
        level: role.includes('1') ? 1 : role.includes('2') ? 2 : 3,
        role: role,
      };
    } else if (role === 'footnote' || role === 'pageNumber') {
      // Skip footnotes and page numbers
      return null;
    }
  }

  return {
    text: paragraph.content,
    pageNumber,
    chunkType,
    boundingBox,
    readingOrder,
    metadata: {
      heading,
    },
  };
}

/**
 * Create chunk from table
 */
function createTableChunk(
  table: DocumentTable,
  pageNumber: number,
  readingOrder: number
): ExtractedChunk | null {
  if (!table.cells || table.cells.length === 0) {
    return null;
  }

  const polygon = table.boundingRegions?.[0]?.polygon;
  const boundingBox = polygon ? convertPolygonToArray(polygon) : undefined;

  // Format table as markdown
  const tableMarkdown = formatTableAsMarkdown(table);

  // Extract structured table data
  const tableData = {
    rows: table.rowCount,
    columns: table.columnCount,
    cells: table.cells.map(cell => ({
      rowIndex: cell.rowIndex,
      columnIndex: cell.columnIndex,
      content: cell.content,
      rowSpan: cell.rowSpan,
      columnSpan: cell.columnSpan,
    })),
  };

  return {
    text: tableMarkdown,
    pageNumber,
    chunkType: 'table',
    boundingBox,
    readingOrder,
    metadata: {
      tableData,
    },
  };
}

/**
 * Format table as markdown for better LLM understanding
 */
function formatTableAsMarkdown(table: DocumentTable): string {
  const rows: string[][] = Array(table.rowCount)
    .fill(null)
    .map(() => Array(table.columnCount).fill(''));

  // Fill cells
  for (const cell of table.cells) {
    rows[cell.rowIndex][cell.columnIndex] = cell.content;
  }

  // Create markdown
  let markdown = '[TABLE]\n';
  
  // Header row
  markdown += '| ' + rows[0].join(' | ') + ' |\n';
  markdown += '|' + ' --- |'.repeat(table.columnCount) + '\n';

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    markdown += '| ' + rows[i].join(' | ') + ' |\n';
  }

  markdown += '[/TABLE]';
  return markdown;
}

/**
 * Extract metadata from key-value pairs
 */
function extractMetadata(result: AnalyzeResult, key: string): string | undefined {
  if (!result.keyValuePairs) return undefined;

  const kvp = result.keyValuePairs.find(
    pair => pair.key?.content?.toLowerCase().includes(key)
  );

  return kvp?.value?.content;
}

/**
 * Get bounding box for a chunk (for highlighting)
 */
export function getBoundingBoxCoordinates(boundingBox: number[] | undefined): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (!boundingBox || boundingBox.length < 8) return null;

  // Polygon format: [x1, y1, x2, y2, x3, y3, x4, y4]
  const x = Math.min(boundingBox[0], boundingBox[2], boundingBox[4], boundingBox[6]);
  const y = Math.min(boundingBox[1], boundingBox[3], boundingBox[5], boundingBox[7]);
  const maxX = Math.max(boundingBox[0], boundingBox[2], boundingBox[4], boundingBox[6]);
  const maxY = Math.max(boundingBox[1], boundingBox[3], boundingBox[5], boundingBox[7]);

  return {
    x,
    y,
    width: maxX - x,
    height: maxY - y,
  };
}

/**
 * Convert Azure Point2D polygon to number array
 */
function convertPolygonToArray(polygon: Array<{ x: number; y: number }>): number[] {
  const result: number[] = [];
  for (const point of polygon) {
    result.push(point.x, point.y);
  }
  return result;
}
