import { pgTable, serial, text, timestamp, vector, integer, index } from 'drizzle-orm/pg-core';

export const documentChunks = pgTable('document_chunks', {
  id: serial('id').primaryKey(),
  domain: text('domain').notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  domainIdx: index('document_chunks_domain_idx').on(table.domain),
  urlIdx: index('document_chunks_url_idx').on(table.url),
}));

export const crawlSessions = pgTable('crawl_sessions', {
  id: serial('id').primaryKey(),
  domain: text('domain').notNull().unique(),
  baseUrl: text('base_url').notNull(),
  status: text('status').notNull().default('pending'),
  totalPages: integer('total_pages').default(0),
  processedPages: integer('processed_pages').default(0),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type CrawlSession = typeof crawlSessions.$inferSelect;
export type NewCrawlSession = typeof crawlSessions.$inferInsert;
