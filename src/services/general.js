import ollama from 'ollama';

export async function generateGeneralResponse(message, history = []) {
  const prompt = `
You are a friendly chatbot. 
Your abilities are limited to two things only:
1. Chat casually in a friendly, conversational way.  
2. Provide information specifically about Prathamesh when the user asks.  

❌ Do NOT claim that you can do tasks, search the internet, tell stories, or perform actions.  
✅ Keep responses simple, conversational, and limited to chatting or talking about Prathamesh.  

Conversation history:
${history.map(h => `${h.role}: ${h.message}`).join("\n")}

User: "${message}"  
Respond appropriately within your limits.
  `;

  const response = await ollama.chat({
    model: 'gemma3:4b',
    messages: [{ role: 'user', content: prompt }],
  });

  return response.message.content.trim();
}
