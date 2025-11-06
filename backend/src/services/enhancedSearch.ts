import { VectorStoreService } from './vectorStore.ts';
import { embedText } from './embeddings.ts';
import { db } from '../db/index.ts';
import { sql } from 'drizzle-orm';

export interface SearchResult {
  id: number;
  url: string;
  title: string;
  content: string;
  similarity: number;
  relevanceScore: number;
  queryType: 'what' | 'how' | 'setup' | 'troubleshooting' | 'reference' | 'examples' | 'general';
}

export interface SearchResponse {
  results: SearchResult[];
  totalFound: number;
  queryType: string;
  enhancedQuery: string;
}

type SearchOptions = {
  limit?: number;
  threshold?: number;
  includeKeywords?: boolean;
}

export class EnhancedSearchService {
  private vectorStore: VectorStoreService;

  constructor() {
    this.vectorStore = new VectorStoreService();
  }

  /**
   * Enhanced search that preprocesses queries and uses multiple strategies
   */
  async search(query: string, domain: string, options: SearchOptions= {}): Promise<SearchResponse> {
    const { limit = 10, threshold = 0.1, includeKeywords = true } = options;

    // 1. Analyze and enhance the query
    const queryAnalysis = this.analyzeQuery(query);
    const enhancedQuery = this.enhanceQuery(query, queryAnalysis);

    console.log(`[EnhancedSearch] Original: "${query}" -> Enhanced: "${enhancedQuery}"`);
    console.log(`[EnhancedSearch] Query type: ${queryAnalysis.type}`);

    // 2. Perform multiple search strategies
    const searchResults = await Promise.all([
      this.semanticSearch(enhancedQuery, domain, limit * 2),
      includeKeywords ? this.keywordSearch(query, domain, limit) : Promise.resolve([])
    ]);

    // 3. Combine and rank results
    const combinedResults = this.combineSearchResults(searchResults, queryAnalysis);

    // 4. Filter by threshold and limit
    const filteredResults = combinedResults
      .filter(result => result.relevanceScore >= threshold)
      .slice(0, limit);

    return {
      results: filteredResults,
      totalFound: combinedResults.length,
      queryType: queryAnalysis.type,
      enhancedQuery
    };
  }

  /**
   * Analyze query to determine type and intent
   */
  private analyzeQuery(query: string): {
    type: 'what' | 'how' | 'setup' | 'troubleshooting' | 'reference' | 'examples' | 'general';
    keywords: string[];
    intent: string[];
  } {
    const lowerQuery = query.toLowerCase();
    const keywords = this.extractKeywords(query);

    let type: SearchResult['queryType'] = 'general';
    const intent: string[] = [];

    // Detect query type based on patterns
    if (lowerQuery.match(/\b(what is|what are|define|explain|describe)\b/)) {
      type = 'what';
      intent.push('definition', 'explanation');
    } else if (lowerQuery.match(/\b(how to|how can|how do|steps? to|guide to)\b/)) {
      type = 'how';
      intent.push('tutorial', 'guide', 'instructions');
    } else if (lowerQuery.match(/\b(setup|install|configure|create|build|initialize|deploy)\b/)) {
      type = 'setup';
      intent.push('installation', 'configuration', 'setup');
    } else if (lowerQuery.match(/\b(error|problem|issue|fail|bug|troubleshoot|debug|fix|solution)\b/)) {
      type = 'troubleshooting';
      intent.push('error', 'debugging', 'troubleshooting');
    } else if (lowerQuery.match(/\b(api|reference|documentation|docs)\b/)) {
      type = 'reference';
      intent.push('api', 'reference', 'documentation');
    } else if (lowerQuery.match(/\b(example|sample|demo|code|snippet)\b/)) {
      type = 'examples';
      intent.push('example', 'sample', 'code');
    }

    return { type, keywords, intent };
  }

  /**
   * Enhance query with synonyms and related terms
   */
  private enhanceQuery(query: string, analysis: ReturnType<typeof this.analyzeQuery>): string {
    const enhancements: string[] = [query];

    // Add synonyms and related terms based on query type
    switch (analysis.type) {
      case 'what':
        // For "what" questions, add related terms
        enhancements.push('definition', 'explanation', 'overview');
        break;
      case 'how':
        // For "how" questions, add instructional terms
        enhancements.push('tutorial', 'guide', 'steps', 'example');
        break;
      case 'setup':
        // For setup questions, add configuration terms
        enhancements.push('installation', 'configuration', 'setup', 'initialize');
        break;
      case 'reference':
        // For reference questions, add API-related terms
        enhancements.push('api', 'documentation', 'reference', 'method', 'function');
        break;
      case 'examples':
        // For example questions, add code-related terms
        enhancements.push('code', 'example', 'sample', 'snippet', 'demo');
        break;
      case 'troubleshooting':
        // For troubleshooting, add error-related terms
        enhancements.push('error', 'debug', 'problem', 'solution');
        break;
    }

    // Add technical keywords
    enhancements.push(...analysis.keywords);

    return enhancements.join(' ');
  }

  /**
   * Extract meaningful keywords from query
   */
  private extractKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  /**
   * Check if word is a common stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'us', 'our', 'ours', 'you', 'your',
      'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them', 'their',
      'what', 'which', 'who', 'when', 'where', 'why', 'how'
    ]);
    return stopWords.has(word);
  }

  /**
   * Perform semantic similarity search
   */
  private async semanticSearch(query: string, domain: string, limit: number): Promise<SearchResult[]> {
    const embedding = await embedText(query);
    const vector = `[${embedding.join(',')}]`;

    const rawResults = await db.execute(sql`
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

    return (rawResults as any[]).map(row => ({
      id: row.id,
      url: row.url,
      title: row.title,
      content: row.content,
      similarity: parseFloat(row.similarity),
      relevanceScore: this.calculateRelevanceScore(row.content, query, parseFloat(row.similarity)),
      queryType: 'general' as const
    }));
  }

  /**
   * Perform keyword-based search
   */
  private async keywordSearch(query: string, domain: string, limit: number): Promise<SearchResult[]> {
    const keywords = this.extractKeywords(query);
    if (keywords.length === 0) return [];

    // Create search terms for PostgreSQL full-text search
    const searchTerms = keywords.map(keyword =>
      keyword.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')
    ).join(' | ');

    const rawResults = await db.execute(sql`
      SELECT
        id,
        url,
        title,
        content,
        ts_rank(to_tsvector('english', content), to_tsquery('english', ${searchTerms})) AS rank,
        0.5 AS similarity
      FROM document_chunks
      WHERE domain = ${domain}
        AND to_tsvector('english', content) @@ to_tsquery('english', ${searchTerms})
      ORDER BY rank DESC
      LIMIT ${limit}
    `);

    return (rawResults as any[]).map(row => ({
      id: row.id,
      url: row.url,
      title: row.title,
      content: row.content,
      similarity: 0.5, // Base similarity for keyword matches
      relevanceScore: this.calculateRelevanceScore(row.content, query, 0.5),
      queryType: 'general' as const
    }));
  }

  /**
   * Combine results from multiple search strategies
   */
  private combineSearchResults(
    searchResults: SearchResult[][],
    queryAnalysis: ReturnType<typeof this.analyzeQuery>
  ): SearchResult[] {
    const resultMap = new Map<number, SearchResult>();

    // Add all results to map
    searchResults.flat().forEach(result => {
      if (resultMap.has(result.id)) {
        // Boost score for results found in multiple strategies
        const existing = resultMap.get(result.id)!;
        existing.relevanceScore = Math.min(1.0, existing.relevanceScore + 0.2);
      } else {
        resultMap.set(result.id, result);
      }
    });

    // Apply query type boosting
    const results = Array.from(resultMap.values());
    results.forEach(result => {
      result.queryType = queryAnalysis.type;
      result.relevanceScore = this.applyQueryTypeBoost(result, queryAnalysis);
    });

    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate relevance score based on content and similarity
   */
  private calculateRelevanceScore(content: string, query: string, similarity: number): number {
    let score = similarity;

    // Boost score for content that contains query keywords
    const queryKeywords = this.extractKeywords(query);
    const contentLower = content.toLowerCase();

    const keywordMatches = queryKeywords.filter(keyword =>
      contentLower.includes(keyword)
    ).length;

    score += (keywordMatches / queryKeywords.length) * 0.3;

    // Boost score for structured content (headings, lists, code blocks)
    if (content.match(/^#+\s/m)) score += 0.1; // Has markdown headers
    if (content.match(/```[\s\S]*?```/)) score += 0.1; // Has code blocks
    if (content.match(/^\s*[-*+]\s/m)) score += 0.1; // Has lists

    return Math.min(1.0, score);
  }

  /**
   * Apply boost based on query type
   */
  private applyQueryTypeBoost(
    result: SearchResult,
    analysis: ReturnType<typeof this.analyzeQuery>
  ): number {
    let boost = 0;

    switch (analysis.type) {
      case 'what':
        // Boost definition-like content
        if (result.content.match(/\b(is|are|refers to|defined as|means)\b/i)) {
          boost += 0.2;
        }
        break;
      case 'how':
        // Boost tutorial-like content
        if (result.content.match(/\b(steps?|guide|tutorial|example|first|then|next)\b/i)) {
          boost += 0.2;
        }
        break;
      case 'setup':
        // Boost installation/configuration content
        if (result.content.match(/\b(install|setup|configure|create|initialize|npm|package)\b/i)) {
          boost += 0.2;
        }
        break;
      case 'troubleshooting':
        // Boost error/solution content
        if (result.content.match(/\b(error|problem|issue|solution|fix|debug)\b/i)) {
          boost += 0.2;
        }
        break;
      case 'reference':
        // Boost API documentation and reference content
        if (result.content.match(/\b(api|method|function|parameter|property|class|interface)\b/i)) {
          boost += 0.2;
        }
        break;
      case 'examples':
        // Boost code examples and samples
        if (result.content.match(/```[\s\S]*?```/)) {
          boost += 0.2;
        }
        break;
    }

    return Math.min(1.0, result.relevanceScore + boost);
  }
}
