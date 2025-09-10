import 'dotenv/config';
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Pinecone } from '@pinecone-database/pinecone';

// -------------------- Setup --------------------

// Embeddings for the query
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY,
  modelName: 'gemini-embedding-001',
});

// LLM for generating answers
const llm = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: 'gemini-1.5-pro',
  temperature: 0.0,
});

// Pinecone client & index
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX);

// -------------------- Flow Function --------------------

/**
 * Full query flow: Embed → Retrieve → Build Context → Generate Answer
 * @param {string} question User's question
 * @param {number} topK Number of top similar documents to retrieve
 * @returns {Object} { answer, sources }
 */
export async function queryFlow(question, topK = 5) {
  try {
    // 1️⃣ Embed the user query
    const qVec = await embeddings.embedQuery(question);

    // 2️⃣ Retrieve top-K similar documents from Pinecone
    const resp = await index.query({
      vector: qVec,
      topK,
      includeMetadata: true,
    });

    const matches = resp.matches ?? [];

    // 3️⃣ Build context for LLM
    const context = matches
      .map(
        (m, i) =>
          `Context ${i + 1} (source: ${m.metadata?.source || 'unknown'}):\n${m.metadata?.text || ''}`
      )
      .join('\n\n');

    // 4️⃣ Build prompt
    const systemPrompt =
      "You are a helpful assistant. Answer using only the provided context. If the context doesn't contain the answer, say 'I don't know'.";
    const userPrompt = `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer concisely:`;

    // 5️⃣ Get LLM answer
    const result = await llm.invoke([
      ['system', systemPrompt],
      ['user', userPrompt],
    ]);

    const answer = typeof result === 'string' ? result : result?.content ?? 'No answer';

    // 6️⃣ Return answer and sources
    return {
      answer,
      sources: matches.map((m) => ({
        id: m.id,
        source: m.metadata?.source,
        score: m.score,
      })),
    };
  } catch (err) {
    console.error('Query flow error:', err);
    return { answer: "Error generating answer", sources: [] };
  }
}
