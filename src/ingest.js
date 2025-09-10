import 'dotenv/config';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Pinecone } from '@pinecone-database/pinecone';
import ollama from 'ollama';

// Path to your data folder (inside src/data)
const DATA_DIR = path.resolve('./src/data');

// ----------------------
// Embedding function (Ollama)
// ----------------------
async function getEmbedding(text) {
  try {
    const response = await ollama.embeddings({
      model: 'nomic-embed-text', // outputs 768-d vectors
      prompt: text,
    });
    return response.embedding;
  } catch (err) {
    console.error('Embedding error:', err);
    return [];
  }
}

// ----------------------
// Ingestion function
// ----------------------
export async function ingestAll() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

  // just connect to your existing index "rag-new"
  const indexName = 'rag-new';
  const index = pc.index(indexName);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 150,
  });

  const files = await fs.readdir(DATA_DIR);
  const batch = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) continue;

    const raw = await fs.readFile(filePath, 'utf8');
    const documents = await splitter.createDocuments([raw]);
    const texts = documents.map(d => d.pageContent);

    for (const [i, t] of texts.entries()) {
      const embedding = await getEmbedding(t);

      batch.push({
        id: uuidv4(),
        values: embedding,
        metadata: {
          source: file,
          chunk_index: i,
          text: t.slice(0, 2000),
        },
      });

      // Upsert in batches of 100
      if (batch.length >= 100) {
        await index.upsert(batch);
        batch.length = 0;
      }
    }
  }

  if (batch.length > 0) {
    await index.upsert(batch);
  }

  console.log('✅ Ingestion complete — documents added to Pinecone.');
}
