import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { MongoRAG } from 'mongodb-rag';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize MongoRAG
const rag = new MongoRAG({
    mongoUrl: process.env.MONGODB_URI,
    database: 'helpdesk',
    collection: 'articles',
    indexName: process.env.VECTOR_SEARCH_INDEX || "vector_index",
    embeddingFieldPath: process.env.EMBEDDING_FIELD_PATH || "embedding",
    embedding: {
        provider: process.env.EMBEDDING_PROVIDER,
        apiKey: process.env.EMBEDDING_API_KEY,
        model: process.env.EMBEDDING_MODEL,
        dimensions: 1536
    }
});

/**
 * API Endpoint: Search for helpdesk articles
 */
app.post('/search', async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
  
    try {
      await rag.connect();
      console.log(`[DEBUG] Searching for: ${query}`);
  
      const results = await rag.search(query, { maxResults: 5, includeMetadata: true });
  
      console.log("[DEBUG] Raw Search Results:", JSON.stringify(results, null, 2));
  
      res.json(results);
    } catch (error) {
      console.error('[ERROR] Search failed:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    } finally {
      await rag.close();
    }
  });
// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
