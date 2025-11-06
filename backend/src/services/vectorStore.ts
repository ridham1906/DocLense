import { db } from '../db/index.ts';
import { documentChunks, crawlSessions } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { chunkText, embedBatch, embedText } from './embeddings.ts';
import type { CrawlResult } from './crawler.ts';

export class VectorStoreService {
  async upsertCrawlResults(results: CrawlResult[]): Promise<void> {
    const [first] = results;
    if (!first) return;

    const { domain } = first;
    await this.deleteDomain(domain);

    const session = await db.insert(crawlSessions).values({
      domain,
      baseUrl: first.url,
      status: 'processing',
      totalPages: results.length,
      processedPages: 0,
    }).returning({ id: crawlSessions.id }).then(([row]) => row);

    if (!session) {
      throw new Error('Failed to create crawl session');
    }

    for (const result of results) {
      await this.storeDocument(result);
      await db.update(crawlSessions)
        .set({ processedPages: sql`${crawlSessions.processedPages} + 1` })
        .where(eq(crawlSessions.id, session.id));
    }

    await db.update(crawlSessions)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(crawlSessions.id, session.id));
  }

  private async storeDocument(result: CrawlResult) {
    const chunks = chunkText(result.content);
    if (chunks.length === 0) return;

    const embeddings = await embedBatch(chunks);

    const records = chunks.map((chunk, idx) => ({
      domain: result.domain,
      url: result.url,
      title: result.title,
      content: chunk,
      chunkIndex: idx,
      embedding: embeddings[idx],
      metadata: JSON.stringify({ totalChunks: chunks.length }),
    }));

    await db.insert(documentChunks).values(records);
  }

  async search(query: string, domain: string, limit = 5) {
    const embedding = await embedText(query);
    const vector = `[${embedding.join(',')}]`;

    return db.execute(sql`
      SELECT
        id,
        url,
        title,
        content,
        1 - (embedding <=> ${vector}::vector) AS similarity
      FROM document_chunks
      WHERE domain = ${domain}
      ORDER BY embedding <=> ${vector}::vector
      LIMIT ${limit}
    `);
  }

  async deleteDomain(domain: string) {
    await db.delete(documentChunks).where(eq(documentChunks.domain, domain));
    await db.delete(crawlSessions).where(eq(crawlSessions.domain, domain));
  }
}
