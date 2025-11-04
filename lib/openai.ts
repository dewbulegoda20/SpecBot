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

  const systemPrompt = `You are SpecBot, an expert assistant for analyzing electrical specifications. 
You have access to a PDF document and can answer questions about it.

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:
1. ALWAYS cite your sources using [1], [2], [3], etc. after EVERY piece of information you provide
2. Use the numbered citations that correspond to the context sections below
3. Place the citation [X] immediately after the sentence or phrase that uses that information
4. Use multiple citations like [1][2] when information comes from multiple sources
5. Structure your response clearly with proper formatting:
   - Use **bold** for important terms, manufacturer names, product names, and key specifications
   - Break down complex answers into clear paragraphs or bullet points
6. If the context doesn't contain enough information, say so clearly
7. Be precise and technical when discussing electrical specifications

EXAMPLE FORMAT:
"The nominated PV Panel Manufacturer is **Longi** [1]. The inverter manufacturer is **SolarEdge Commercial Inverter** [2]."

Context from the document:
${contextText}

Remember: EVERY statement must have a citation [X] referencing which context section it came from!`;

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
