import 'dotenv/config';
import { Pinecone } from '@pinecone-database/pinecone';
import ollama from 'ollama';

// ----------------------
// Pinecone setup
// ----------------------
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX);

// ----------------------
// Embedding function (Ollama)
// ----------------------
async function embedQuery(text) {
  try {
    const response = await ollama.embeddings({
      model: 'nomic-embed-text', // fast local embedding model
      prompt: text,
    });

    return response.embedding; // array of floats
  } catch (err) {
    console.error("Embedding error:", err);
    return [];
  }
}

// ----------------------
// Ollama chat function
// ----------------------
export async function chatWithOllama(messages) {
  try {
    const response = await ollama.chat({
      model: 'gemma3:4b',   // your chosen chat model
      messages: messages,
      stream: false,
      // ❌ remove format: 'json' → it forces nested JSON output
    });

    // response.message.content is plain text
    return response.message?.content?.trim() ?? "I don't know";
  } catch (err) {
    console.error("Ollama API Error:", err);
    return "An error occurred while communicating with Ollama.";
  }
}

// ----------------------
// Answer query function
// ----------------------
export async function answerQuery(query, topK = 10) {
  // Step 1: Embed the query
  const qVec = await embedQuery(query);

  // Step 2: Query Pinecone
  const resp = await index.query({
    vector: qVec,
    topK,
    includeMetadata: true,
  });

  const matches = resp.matches ?? [];

  // Step 3: Build context
  const context = matches
    .map((m, i) => `Context ${i + 1}:\n${m.metadata?.text || ''}`)
    .join('\n\n');

  console.log("Received context is:", context);

  // Step 4: Prompts
//   const systemPrompt = `
// You are a helpful AI assistant running on the gamma3:4b model.

// Your job:
// - Use ONLY the provided context to answer.
// - Be accurate and faithful to the context.
// - Give responses in clear, user-friendly text.
// - Do not repeat the same sentences or phrases.
// - If the context does not have the answer, reply with: "I don't know."

// Important:
// - Focus on representing the user's information correctly (resume, personal goals, projects, background, etc.).
// - Keep answers concise, but detailed enough to be useful.
// - Avoid adding references, citations, or extra formatting.
// `;

//   const userPrompt = `
// Context:
// ${context}

// Question:
// ${query}

// Instructions:
// - Answer based only on the context above.
// - Provide a natural, user-friendly response in plain text.
// - Do not repeat the same wording from previous answers.
// - If the context does not have enough information, say "I don't know."
// `;

//   // Step 5: Ask Ollama
//   const answer = await chatWithOllama([
//     { role: 'system', content: systemPrompt },
//     { role: 'user', content: userPrompt },
//   ]);

//   // Step 6: Return clean plain text
//   return answer;

return context ;
}
