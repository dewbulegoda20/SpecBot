import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map(d => d.embedding);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatWithReferencesOptions {
  question: string;
  context: Array<{ content: string; pageNumber: number; chunkId: string }>;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
  references: Array<{
    chunkId: string;
    pageNumber: number;
    text: string;
    relevance: number;
  }>;
}

export async function chatWithReferences(
  options: ChatWithReferencesOptions
): Promise<ChatResponse> {
  const { question, context, conversationHistory = [] } = options;

  // Prepare context for the prompt
  const contextText = context
    .map((ctx, idx) => `[${idx + 1}] (Page ${ctx.pageNumber}): ${ctx.content}`)
    .join('\n\n');

  const systemPrompt = `You are SpecBot, an AI expert specializing in electrical specification analysis and technical documentation review.

Your responses are powered by:
- **Azure Document Intelligence**: Extracts text and tables with 99% accuracy, preserving structure and layout
- **Pinecone Vector Search**: Finds relevant information in 20-50ms with context-aware retrieval
- **Advanced Chunking**: Maintains document flow, reading order, and relationships between sections

═══════════════════════════════════════════════════════════════════════════
CRITICAL CITATION RULES - MUST FOLLOW STRICTLY:
═══════════════════════════════════════════════════════════════════════════

1. **MANDATORY CITATIONS**: Every single piece of information MUST have a citation [1], [2], [3], etc.
   - Place citation [X] IMMEDIATELY after the sentence or phrase
   - Use multiple citations [1][2] when information comes from multiple sources
   - NEVER make statements without citations

2. **CITATION ACCURACY**: 
   - Citations correspond to the numbered context sections below
   - [1] = First context section, [2] = Second section, etc.
   - Always verify the page number matches the citation

3. **TABLE HANDLING**:
   - Context may include tables in markdown format between [TABLE] and [/TABLE] tags
   - Preserve table structure when referencing data
   - Extract specific values accurately (voltage, amperage, manufacturer names, etc.)
   - Always cite the table: "As shown in the specification table [X]..."

4. **FORMATTING REQUIREMENTS**:
   - Use **bold** for: Manufacturer names, product models, voltage ratings, current ratings, key specifications
   - Use bullet points for lists of specifications or multiple items
   - Use clear paragraph breaks for complex explanations
   - Maintain technical precision in terminology

5. **TECHNICAL PRECISION**:
   - Use exact values from the document (don't round unless specified)
   - Include units (V, A, kW, Hz, etc.) with all numerical values
   - Preserve technical terminology exactly as written
   - Distinguish between AC and DC specifications

6. **CONTEXT AWARENESS**:
   - Consider the reading order and document structure
   - Related information may span multiple context sections
   - Cross-reference between sections when appropriate
   - If information seems incomplete, acknowledge it clearly

7. **MISSING INFORMATION**:
   - If the context doesn't contain the answer, state: "This information is not found in the provided sections [cite searched sections]."
   - Suggest what additional sections might contain the answer if possible
   - Never fabricate information

═══════════════════════════════════════════════════════════════════════════
EXAMPLE RESPONSES:
═══════════════════════════════════════════════════════════════════════════

❌ WRONG (No citations):
"The PV Panel Manufacturer is Longi. The inverter is from SolarEdge."

✅ CORRECT (Proper citations, formatting, specificity):
"The nominated **PV Panel Manufacturer** is **Longi** [1]. The inverter manufacturer is **SolarEdge Commercial Inverter** with a model rating of **50kW** at **480V AC** [2]."

❌ WRONG (Vague table reference):
"The circuit has certain voltage and amperage values."

✅ CORRECT (Specific table data with citation):
"According to the electrical specifications [1]:
- **Circuit A**: **480V**, **200A**
- **Circuit B**: **208V**, **100A**
- **Main Service**: **480V 3-Phase**, **400A**"

═══════════════════════════════════════════════════════════════════════════
CONTEXT SECTIONS FROM DOCUMENT:
═══════════════════════════════════════════════════════════════════════════

${contextText}

═══════════════════════════════════════════════════════════════════════════
REMEMBER: Citation accuracy is critical. Every fact needs [X]. Every table reference needs [X]. Every specification needs [X].
═══════════════════════════════════════════════════════════════════════════`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-5), // Keep last 5 messages for context
    { role: 'user', content: question },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 1000,
    });

    let answer = response.choices[0].message.content || '';
    
    // Verify the answer contains citations, if not, remind the AI
    const hasCitations = /\[\d+\]/.test(answer);
    if (!hasCitations && context.length > 0) {
      // Make a second attempt with stronger emphasis
      const followUpMessages = [
        ...messages,
        { role: 'assistant' as const, content: answer },
        { 
          role: 'user' as const, 
          content: 'Please add citation numbers [1], [2], [3], etc. to your response to indicate which context section each piece of information came from. This is required.' 
        }
      ];
      
      const retryResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: followUpMessages,
        temperature: 0.3,
        max_tokens: 1000,
      });
      
      answer = retryResponse.choices[0].message.content || answer;
    }

    // Extract ALL citation numbers from the answer and build a proper mapping
    const citationRegex = /\[(\d+)\]/g;
    const citationToContextMap = new Map<number, number>(); // citation number -> context index
    let match;
    
    while ((match = citationRegex.exec(answer)) !== null) {
      const citationNum = parseInt(match[1]);
      if (citationNum > 0 && citationNum <= context.length) {
        const contextIndex = citationNum - 1; // Convert to 0-based
        citationToContextMap.set(citationNum, contextIndex);
      }
    }

    // Build a complete references array with 5 elements (one for each context)
    // This ensures that references[i] always corresponds to citation [i+1]
    const referencedChunks: Array<{
      chunkId: string;
      pageNumber: number;
      text: string;
      relevance: number;
    }> = [];
    
    // Create references for ALL context chunks, marking which ones were actually cited
    for (let i = 0; i < context.length; i++) {
      const citationNum = i + 1;
      const wasCited = citationToContextMap.has(citationNum);
      
      referencedChunks.push({
        chunkId: context[i].chunkId,
        pageNumber: context[i].pageNumber,
        text: context[i].content.substring(0, 200),
        relevance: wasCited ? 1.0 : 0.0, // Mark relevance based on whether it was cited
      });
    }

    console.log(`Context chunks: ${context.length}, Citations found: ${citationToContextMap.size}`);
    console.log('Citation mapping:', Array.from(citationToContextMap.entries()).map(([cit, idx]) => 
      `[${cit}] -> Context[${idx}] -> Page ${context[idx].pageNumber}`
    ));

    return {
      answer,
      references: referencedChunks,
    };
  } catch (error) {
    console.error('Error in chat completion:', error);
    throw error;
  }
}

export { openai };
