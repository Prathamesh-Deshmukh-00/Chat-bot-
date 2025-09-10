import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { ingestAll } from './ingest.js';
import { classifyMessage } from './services/classifier.js';
import { generateGeneralResponse } from './services/general.js';
import { generateRAGResponse } from './services/rag.js';
import { addMessage, getHistory, clearHistory } from './services/history.js';

const app = express();
app.use(express.json());
app.use(express.static("public")); 

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// --- Socket.IO Chat ---
io.on('connection', (socket) => {
  console.log(`⚡ User connected: ${socket.id}`);

  socket.on('chat', async ({ message, limit = 10 }) => {
    try {
      // Add user message to history
      addMessage(socket.id, 'user', message);

      const history = getHistory(socket.id);
      const category = await classifyMessage(message, history);

      let botReply;
      if (category === 'general') {
        botReply = await generateGeneralResponse(message, history);
      } else {
        botReply = await generateRAGResponse(message, history, limit);
      }

      // Save bot reply
      addMessage(socket.id, 'bot', botReply);

      socket.emit('chat-response', { from: 'bot', message: botReply });
    } catch (err) {
      console.error(err);
      socket.emit('chat-response', { from: 'bot', message: '⚠️ Error occurred.' });
    }
  });

  socket.on('get-history', () => {
    socket.emit('chat-history', getHistory(socket.id));
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    clearHistory(socket.id);
  });
});

// --- REST API routes (ingest/query) ---
app.post('/ingest', async (req, res) => {
  try {
    await ingestAll();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- /query route ---
app.post('/query', async (req, res) => {
  try {
    const { q } = req.body;
    if (!q) return res.status(400).json({ error: 'missing q in body' });

    const out = await answerQuery(q, 10);
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
