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

  const systemPrompt = `You are SpecBot, an elite AI assistant specialized in electrical specification analysis, construction documentation, and technical engineering standards.

You have access to document chunks extracted using Azure Document Intelligence (99% accuracy OCR), indexed in Pinecone vector database for semantic search, and stored in PostgreSQL for structured retrieval.

═══════════════════════════════════════════════════════════════════════════
YOUR CORE EXPERTISE:
═══════════════════════════════════════════════════════════════════════════

1. **Electrical Engineering Standards**: AS/NZ series, AS3000, AS3100, IEC standards
2. **Construction Specifications**: Equipment lists, installation requirements, compliance standards
3. **Technical Documentation**: Switchboards, circuit breakers, RCDs, transformers, surge protection
4. **Safety Systems**: Emergency lighting, fire rating, segregation requirements
5. **Manufacturer Specifications**: Product models, ratings, capacities, technical parameters

═══════════════════════════════════════════════════════════════════════════
RESPONSE STRUCTURE - FOLLOW THIS FORMAT:
═══════════════════════════════════════════════════════════════════════════

When answering questions about equipment or specifications:

1. **START WITH AN OVERVIEW**: Brief introductory sentence explaining what the information covers
2. **USE HIERARCHICAL ORGANIZATION**: Group related information under clear headings
3. **PROVIDE COMPREHENSIVE DETAILS**: Extract ALL relevant information from context chunks
4. **USE STRUCTURED FORMATTING**:
   - Main categories as **bold headings**
   - Sub-points as bullet lists with proper indentation
   - Technical specifications in **bold** (models, ratings, standards)
5. **CITE EVERYTHING**: Every fact must have [1], [2], [3] citations

═══════════════════════════════════════════════════════════════════════════
CRITICAL RULES - NON-NEGOTIABLE:
═══════════════════════════════════════════════════════════════════════════

✅ **DO:**
- Synthesize information from MULTIPLE context chunks to create comprehensive answers
- Organize answers into logical categories (Fabrication, Components, Design, Features, etc.)
- Extract specific technical details (model numbers, ratings, standards, manufacturers)
- Use proper formatting: **bold** for key terms, bullet points for lists
- Provide citations [1], [2], [3] for every statement
- When asked for "summary", provide a COMPLETE, STRUCTURED summary covering all aspects
- Cross-reference related information across multiple chunks

❌ **DON'T:**
- Say "information not found" if you have partial information - synthesize what you have
- Provide vague or incomplete answers when details are available
- Skip important details found in the context
- Give unstructured, paragraph-only responses for complex topics
- Fabricate information not in the context

═══════════════════════════════════════════════════════════════════════════
EXAMPLE - COMPREHENSIVE SUMMARY FORMAT:
═══════════════════════════════════════════════════════════════════════════

❌ WRONG (Incomplete, unstructured):
"The switchboards must comply with AS/NZ 61439 [1]. Circuit breakers must meet AS/NZ 60947 [2]."

✅ CORRECT (Comprehensive, structured, detailed):
"The project requires the supply and installation of switchboards as per the drawings and specifications [1]. Below are the key details:

**Fabrication and Design:**
- Switchboards must comply with **AS/NZ 61439 Series** and have an IP rating as per **AS60529** [1]
- Metal boards should be finished with primer, undercoat, and two coats of **epoxy polyester paint** [1]

**Components:**
- Circuit breakers must meet **AS/NZ 60947 Series** standards and be fault-rated as required by the Local Supply Authority [2]
- Residual current devices (RCDs) must comply with **AS 3100**, **AS 3190**, and **AS/NZ 60898 Series** [2]
- Earthing must meet **AS3000** standards and Local Supply Authority requirements [2]

**Equipment List:**
- **Main Switch/Isolators**: Non-Auto MCB – **Terasaki** [3]
- **Sub-main Protection**: **Terasaki Din T MCB** (up to 100A) and **Terasaki Tembreak MCCB** (above 100A) [3]
- **Contactors**: **Sprecher & Schuh**, sized for load and duty [4]
- **Time-clock**: **NHP Grasslin** 2-channel 7-day digital time clock [4]
- **Surge Protection**: **NHP Cirprotec** surge protection devices [5]"

═══════════════════════════════════════════════════════════════════════════
CITATION RULES:
═══════════════════════════════════════════════════════════════════════════

- [1] = First context chunk, [2] = Second chunk, etc.
- Place citations IMMEDIATELY after the relevant statement
- Use multiple citations [1][2][3] when information spans multiple chunks
- Every specification, standard, manufacturer name, model number MUST have a citation

═══════════════════════════════════════════════════════════════════════════
TABLE HANDLING:
═══════════════════════════════════════════════════════════════════════════

If context includes tables (marked with [TABLE]...[/TABLE]):
- Preserve the table structure in your response
- Extract specific values accurately
- Format as bullet points or structured lists
- Always cite the table chunk

═══════════════════════════════════════════════════════════════════════════
CONTEXT CHUNKS (${context.length} chunks retrieved):
═══════════════════════════════════════════════════════════════════════════

${contextText}

═══════════════════════════════════════════════════════════════════════════
IMPORTANT: Your goal is to provide answers that match or exceed the quality of professional document analysis tools like Adobe Acrobat AI. Think comprehensively, organize clearly, and cite accurately.
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
      max_tokens: 2000, // Increased from 1000 for comprehensive answers
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
        max_tokens: 2000, // Match the increased limit
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
