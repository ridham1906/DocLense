import express, { type Request, type Response } from 'express';
import { initDatabase } from './db/index.ts';
import { DocumentationCrawler } from './services/crawler.ts';
import { VectorStoreService } from './services/vectorStore.ts';
import { EnhancedSearchService } from './services/enhancedSearch.ts';
import {config} from 'dotenv';
import { TextGenerelizer } from './services/generelizedResult.ts';
import cors from 'cors';
import { crawlSessions } from './db/schema.ts';
import { eq } from 'drizzle-orm';
import { db } from './db/index.ts';

config();

const app = express();
const vectorStore = new VectorStoreService();
const enhancedSearch = new EnhancedSearchService();
const generelizer = new TextGenerelizer();  
const PORT = Number(process.env.PORT) || 4001;

app.use(cors({
  origin: '*',
}));

app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'system is healthy! :)' });
});

app.post('/api/crawl', async (req: Request, res: Response) => {
  const { url, maxPages = 50 } = req.body as { url?: string; maxPages?: number };

  if (!url) {
    res.status(400).json({
      success: false,
      error: 'Missing "url" in request body',
    });
    return;
  }

  try {
    const crawler = new DocumentationCrawler(url);
    const results = await crawler.run(maxPages);
    await vectorStore.upsertCrawlResults(results);

    res.json({
      success: true,
      pagesIndexed: results.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Add a new endpoint to check if a domain is already crawled
app.get('/api/crawl/status', async (req: Request, res: Response) => {
  try {
    const { domain } = req.query as { domain?: string };

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Missing domain parameter'
      });
    }

    // Normalize domain
    const parsed = new URL(domain);
    const normalizedDomain = parsed.hostname;

    // Check if domain has been successfully crawled
    const existingSession = await db.select()
      .from(crawlSessions)
      .where(eq(crawlSessions.domain, normalizedDomain))
      .limit(1);

    if (existingSession?.length > 0 && existingSession[0]?.status === 'completed') {
      return res.json({
        success: true,
        alreadyCrawled: true,
        message: 'Domain already crawled'
      });
    }

    return res.json({
      success: true,
      alreadyCrawled: false,
      message: 'Domain not yet crawled'
    });
  } catch (error) {
    console.error('Crawl status check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error while checking crawl status'
    });
  }
});

app.post('/api/ask', async (req: Request, res: Response) => {
  try {
    let { q, domain, limit = 10, threshold = 0.85, strategy = 'enhanced', stream = true } = req.body as {
      q?: string;
      domain?: string;
      limit?: string | number;
      threshold?: string | number;
      strategy?: string;
      stream?: boolean;
    };

    if (!q || !domain) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: query and domain are required'
      });
    }

    const parsed = new URL(domain);
    domain = parsed.hostname;
    const limitNum = typeof limit === 'string' ? parseInt(limit) : limit;
    const thresholdNum = typeof threshold === 'string' ? parseFloat(threshold) : threshold;

    if (stream) {
      try {
        // Set headers for streaming
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'X-Accel-Buffering': 'no' // Disable buffering for nginx
        });

        // Perform search
        const enhancedResult = await enhancedSearch.search(q, domain, {
          limit: limitNum,
          threshold: thresholdNum,
          includeKeywords: true
        });

        // Stream directly from the generelizer
        const streamResult = await generelizer.streamResult(enhancedResult.results, q);
        
        // Pipe the stream to the response
        streamResult.on('data', (chunk) => {
          res.write(chunk);
        });
        
        streamResult.on('end', () => {
          res.end();
        });
        
        streamResult.on('error', (error) => {
          console.error('Streaming error:', error);
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            content: 'Sorry, I encountered an error while processing your request.'
          })}\n\n`);
          res.end();
        });
        
        // Handle client disconnect
        req.on('close', () => {
          streamResult.destroy();
        });
      } catch (error) {
        console.error('Streaming error:', error);
        if (!res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          });
        }
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          content: 'Sorry, I encountered an error while processing your request.'
        })}\n\n`);
        res.end();
      }
      
      return;
    }

    // Non-streaming response (existing functionality)
    if (strategy === 'basic') {
      // Using basic vector search with threshold filtering
      const rawResult = await vectorStore.search(q, domain, limitNum * 2); 
      const filteredResult = (rawResult as any[]).filter((item: any) => item.similarity >= thresholdNum);
      const result = filteredResult.slice(0, limitNum).map((item: any) => ({
        id: item.id,
        url: item.url,
        title: item.title,
        content: item.content,
        similarity: item.similarity,
        relevanceScore: item.similarity, // For basic search, relevance = similarity
        queryType: 'general'
      }));
      
      return res.status(200).json({
        success: true,
        result
      });
    } else {
      // Using enhanced search (default)
      const enhancedResult = await enhancedSearch.search(q, domain, {
        limit: limitNum,
        threshold: thresholdNum,
        includeKeywords: true
      });
      const result = await generelizer.generalizeResult(enhancedResult.results, q);

      res.status(200).json({
        success: true,
        result
      });
    }
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error while searching'
    });
  }
});

async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log('🚀 Server ready at http://localhost:',PORT);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exitCode = 1;
});
