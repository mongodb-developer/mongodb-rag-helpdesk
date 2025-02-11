import fs from 'fs';
import path from 'path';
import { MongoRAG } from 'mongodb-rag';
import dotenv from 'dotenv';
import { Chunker } from 'mongodb-rag';

dotenv.config();

const chunker = new Chunker({
    strategy: 'sliding',
    maxChunkSize: 500, 
    overlap: 50,
    splitter: 'sentence'
});

// Initialize MongoRAG with debugging enabled
const rag = new MongoRAG({
  mongoUrl: process.env.MONGODB_URI,
  database: 'helpdesk',
  collection: 'articles',
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER,
    apiKey: process.env.EMBEDDING_API_KEY,
    model: process.env.EMBEDDING_MODEL,
    dimensions: 1536
  }
});

/**
 * Reads all markdown files from the directory.
 */
async function loadMarkdownFiles(directory) {
  console.log(`[DEBUG] Scanning directory: ${directory}`);
  const files = fs.readdirSync(directory).filter(file => file.endsWith('.md'));

  console.log(`[DEBUG] Found ${files.length} markdown files.`);
  return files.map(file => {
    const content = fs.readFileSync(path.join(directory, file), 'utf-8');
    return { id: file.replace('.md', ''), content, metadata: { source: 'helpdesk' } };
  });
}

/**
 * Splits documents into chunks before ingestion.
 */
async function chunkDocuments(documents) {
    let totalChunks = 0;
    let chunkedDocs = [];

    for (const doc of documents) {
        const chunks = await chunker.chunkDocument(doc);
        totalChunks += chunks.length;
        chunkedDocs.push(...chunks);
        console.log(`[DEBUG] Document ${doc.id} split into ${chunks.length} chunks.`);
    }

    console.log(`[DEBUG] Total chunks created: ${totalChunks}`);
    return chunkedDocs;
}

/**
 * Ingests markdown files into MongoDB with vector embeddings.
 */
async function ingestHelpdeskDocs() {
  try {
    console.time('Total Ingestion Time');

    console.log('[DEBUG] Loading markdown files...');
    const documents = await loadMarkdownFiles('./helpdesk_docs');

    if (documents.length === 0) {
      console.log('[ERROR] No markdown files found. Exiting.');
      return;
    }

    console.log(`[DEBUG] ${documents.length} documents loaded. Connecting to MongoDB...`);
    await rag.connect();
    console.log('[DEBUG] Successfully connected to MongoDB.');

    console.log('[DEBUG] Chunking documents...');
    const chunkedDocs = await chunkDocuments(documents);
    console.log(`[DEBUG] Chunked document count: ${chunkedDocs.length}`);

    console.log('[DEBUG] Starting document ingestion...');
    console.time('Ingestion Process');

    await rag.ingestBatch(chunkedDocs, {
      onProgress: (progress) => {
        console.log(`[DEBUG] Ingestion Progress: ${progress.percent}%`);
      }
    });

    console.timeEnd('Ingestion Process');
    console.log('[DEBUG] Ingestion complete!');

  } catch (error) {
    console.error('[ERROR] An error occurred during ingestion:', error);
  } finally {
    console.log('[DEBUG] Closing database connection...');
    await rag.close();
    console.log('[DEBUG] Connection closed.');
    console.timeEnd('Total Ingestion Time');
  }
}

// Execute ingestion
ingestHelpdeskDocs();
