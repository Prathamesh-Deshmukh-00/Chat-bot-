import ollama from 'ollama';

export async function classifyMessage(message, history = []) {
  const prompt = `
You are a classifier. Decide if the user message is:
- "general": casual talk or general chatbot queries
- "prathamesh": needs info about Prathamesh (use RAG search)

Chat history:
${history.map(h => `${h.role}: ${h.message}`).join("\n")}

User: "${message}"
Answer with only one word: "general" or "prathamesh".
  `;

  const response = await ollama.chat({
    model: 'gemma3:4b', 
    messages: [{ role: 'user', content: prompt }],
  });

  return response.message.content.trim().toLowerCase().includes("prathamesh")
    ? "prathamesh"
    : "general";
}
