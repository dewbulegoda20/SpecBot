import pdf from 'pdf-parse';
import fs from 'fs/promises';

export interface PDFChunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
}

export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function extractTextByPages(filePath: string): Promise<Map<number, string>> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    
    // Use pdf-parse to get metadata and text
    const pdfData = await pdf(dataBuffer);
    const numPages = pdfData.numpages;
    
    console.log(`PDF has ${numPages} pages according to metadata`);
    
    const pageTexts = new Map<number, string>();
    
    // Try multiple splitting strategies
    let pages: string[] = [];
    
    // Strategy 1: Split by form feed (\f) - most common page separator
    pages = pdfData.text.split('\f');
    
    // Strategy 2: If form feed didn't work well, try splitting by page markers
    if (pages.length < numPages / 2) {
      // Look for common page break patterns
      pages = pdfData.text.split(/\n-+\s*\d+\s*-+\n|\n={3,}\n|\nPage\s+\d+\n/i);
    }
    
    // Strategy 3: If still not enough pages, estimate by text length
    if (pages.length < numPages / 2 && numPages > 1) {
      const avgCharsPerPage = Math.ceil(pdfData.text.length / numPages);
      pages = [];
      for (let i = 0; i < numPages; i++) {
        const start = i * avgCharsPerPage;
        const end = Math.min((i + 1) * avgCharsPerPage, pdfData.text.length);
        pages.push(pdfData.text.substring(start, end));
      }
    }
    
    // Clean and store pages
    pages.forEach((pageText: string, index: number) => {
      const cleaned = pageText.trim();
      if (cleaned.length > 0) {
        pageTexts.set(index + 1, cleaned);
      }
    });
    
    // If no pages found at all, treat entire text as single document across estimated pages
    if (pageTexts.size === 0) {
      const totalPages = numPages || 1;
      const charsPerPage = Math.ceil(pdfData.text.length / totalPages);
      
      for (let i = 0; i < totalPages; i++) {
        const start = i * charsPerPage;
        const end = Math.min((i + 1) * charsPerPage, pdfData.text.length);
        const pageText = pdfData.text.substring(start, end).trim();
        if (pageText) {
          pageTexts.set(i + 1, pageText);
        }
      }
    }
    
    console.log(`Fallback extracted ${pageTexts.size} pages`);
    return pageTexts;
  } catch (error) {
    console.error('Error extracting text by pages:', error);
    throw new Error('Failed to extract text by pages from PDF');
  }
}

export function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  
  // Split by sentences (rough approximation)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxChunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      
      // Add overlap from previous chunk
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5)).join(' ');
      currentChunk = overlapWords + ' ' + sentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
}

export async function processAndChunkPDF(filePath: string): Promise<PDFChunk[]> {
  const pageTexts = await extractTextByPages(filePath);
  const allChunks: PDFChunk[] = [];
  
  let globalChunkIndex = 0;
  
  for (const [pageNumber, pageText] of pageTexts.entries()) {
    const chunks = chunkText(pageText);
    
    for (const chunk of chunks) {
      allChunks.push({
        content: chunk,
        pageNumber,
        chunkIndex: globalChunkIndex++,
      });
    }
  }
  
  return allChunks;
}

export async function searchTextInPDF(
  filePath: string,
  searchText: string
): Promise<Array<{ pageNumber: number; text: string; position: number }>> {
  const pageTexts = await extractTextByPages(filePath);
  const results: Array<{ pageNumber: number; text: string; position: number }> = [];
  
  for (const [pageNumber, pageText] of pageTexts.entries()) {
    const lowerPageText = pageText.toLowerCase();
    const lowerSearchText = searchText.toLowerCase();
    
    let position = 0;
    while ((position = lowerPageText.indexOf(lowerSearchText, position)) !== -1) {
      // Get context around the match (100 chars before and after)
      const start = Math.max(0, position - 100);
      const end = Math.min(pageText.length, position + searchText.length + 100);
      const context = pageText.substring(start, end);
      
      results.push({
        pageNumber,
        text: context,
        position,
      });
      
      position += searchText.length;
    }
  }
  
  return results;
}
