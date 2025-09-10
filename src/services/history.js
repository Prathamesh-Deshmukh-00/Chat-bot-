const chatHistory = new Map(); // key = socket.id, value = [{role, message}]

export function addMessage(socketId, role, message) {
  if (!chatHistory.has(socketId)) {
    chatHistory.set(socketId, []);
  }
  chatHistory.get(socketId).push({ role, message });
}

export function getHistory(socketId) {
  return chatHistory.get(socketId) || [];
}

export function clearHistory(socketId) {
  chatHistory.delete(socketId);
}
