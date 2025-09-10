import ollama from 'ollama';
import { answerQuery } from '../query.js';

export async function generateRAGResponse(message, history = [], limit = 10) {
  // Step 1: search Pinecone
  const result = await answerQuery(message, limit);
  const docs =  result ? result : [] ;

  // Step 2: create combined prompt
  const prompt = `
You are a RAG chatbot. Use the conversation history + user query + infromation about prathamesh
to provide a helpful answer.

Chat history:
${history.map(h => `${h.role}: ${h.message}`).join("\n")}

User: "${message}"

Relevant information about prathamesh:
${docs}

Now, write a clear, complete response to the user.
  `;

  const response = await ollama.chat({
    model: 'gemma3:4b', 
    messages: [{ role: 'user', content: prompt }],
  });

  return response.message.content.trim();
}
