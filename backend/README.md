# DocLense - Universal Documentation Search System

DocLense is an intelligent documentation indexing and search system that uses vector embeddings to provide semantic search capabilities for **any documentation website**.

## Features

- 🕷️ **Universal Web Crawling**: Works with any documentation site (React, Node.js, Express, Socket.IO, etc.)
- 🧠 **Vector Search**: Uses OpenAI embeddings for semantic similarity search
- 🔍 **Enhanced Query Processing**: Intelligently analyzes and enhances user queries
- 📊 **Multiple Search Strategies**: Combines semantic and keyword-based search for better results
- 🎯 **Query Type Detection**: Automatically detects question types (what, how, setup, troubleshooting)
- 📈 **Smart Result Ranking**: Advanced relevance scoring and filtering

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Variables

```env
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

### Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:4001`

### Crawl Any Documentation Site

```bash
# Crawl React documentation
curl -X POST http://localhost:4001/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://react.dev/learn", "maxPages": 50}'

# Crawl Node.js documentation
curl -X POST http://localhost:4001/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://nodejs.org/docs/", "maxPages": 30}'

# Crawl Express documentation
curl -X POST http://localhost:4001/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://expressjs.com/guide/", "maxPages": 40}'

# Crawl Socket.IO documentation
curl -X POST http://localhost:4001/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://socket.io/docs/", "maxPages": 35}'

# Crawl any other documentation site
curl -X POST http://localhost:4001/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-docs-site.com/docs/", "maxPages": 50}'
```

### Enhanced Search

The enhanced search system works with any crawled documentation site.

#### Search React Documentation

```bash
curl "http://localhost:4001/search?q=what%20are%20react%20hooks&domain=react.dev&limit=10"
```

#### Search Node.js Documentation

```bash
curl "http://localhost:4001/search?q=how%20to%20create%20http%20server&domain=nodejs.org&limit=10"
```

#### Search Express Documentation

```bash
curl "http://localhost:4001/search?q=setup%20middleware&domain=expressjs.com&limit=10"
```

#### Search Socket.IO Documentation

```bash
curl "http://localhost:4001/search?q=what%20is%20socket.io&domain=socket.io&limit=10"
```

#### Search Any Documentation Site

```bash
curl "http://localhost:4001/search?q=your%20query%20here&domain=your-domain.com&limit=10"
```

## Enhanced Search Features

### Query Type Detection

The system automatically detects different types of questions:

- **What questions**: "What are React hooks?" → Looks for definitions and explanations
- **How questions**: "How to create HTTP server in Node.js?" → Finds tutorials and guides
- **Setup questions**: "Setup Express middleware" → Searches for installation instructions
- **Troubleshooting**: "React component not rendering" → Finds error solutions

### Query Enhancement

Queries are automatically enhanced with related terms:

- "react hooks" → Enhanced to: "react hooks state management lifecycle components"
- "express middleware" → Enhanced to: "express middleware setup configuration installation"

### Multiple Search Strategies

1. **Semantic Search**: Uses vector embeddings for similarity matching
2. **Keyword Search**: PostgreSQL full-text search for exact matches
3. **Hybrid Approach**: Combines both strategies with relevance boosting

### Smart Result Ranking

Results are ranked based on:

- **Similarity Score**: Vector similarity (0-1)
- **Keyword Matches**: How many query terms are found in content
- **Content Structure**: Bonus for well-structured documentation
- **Query Type Boosting**: Extra relevance for matching content types

## API Endpoints

### POST /crawl

Crawl any documentation website and index it.

**Request:**
```json
{
  "url": "https://react.dev/learn",
  "maxPages": 50
}
```

**Response:**
```json
{
  "success": true,
  "pagesIndexed": 45
}
```

### GET /search

Search the indexed documentation.

**Parameters:**
- `q`: Search query
- `domain`: Domain to search within
- `limit`: Max results (default: 10)
- `threshold`: Min relevance score (default: 0.1)
- `strategy`: `enhanced` or `basic` (default: enhanced)

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": 123,
      "url": "https://react.dev/learn/hooks-state",
      "title": "Using Hooks",
      "content": "React Hooks allow you to use state...",
      "similarity": 0.89,
      "relevanceScore": 0.94,
      "queryType": "what"
    }
  ],
  "totalFound": 12,
  "queryType": "what",
  "enhancedQuery": "what are react hooks state management lifecycle components definition explanation"
}
```

## Example Usage Scenarios

### Scenario 1: React Documentation

**Query:** "What are React hooks?"

**Enhanced Query:** "What are React hooks? state management lifecycle components definition explanation"

**Results:** Pages with hook definitions, introductions, and overviews

### Scenario 2: Node.js Documentation

**Query:** "How to create HTTP server?"

**Enhanced Query:** "How to create HTTP server tutorial guide steps example installation setup configuration"

**Results:** HTTP server guides, setup tutorials, API documentation

### Scenario 3: Express Documentation

**Query:** "Setup middleware in Express"

**Enhanced Query:** "Setup middleware in Express tutorial guide steps example installation configuration"

**Results:** Middleware setup guides, configuration docs, examples

### Scenario 4: Socket.IO Documentation

**Query:** "What is Socket.IO?"

**Enhanced Query:** "What is Socket.IO? websocket real-time communication bidirectional definition explanation"

**Results:** Pages with Socket.IO definitions, introductions, and overviews

### Scenario 5: Troubleshooting (Any Site)

**Query:** "Component not rendering in React"

**Enhanced Query:** "Component not rendering in React error problem solution fix debug troubleshooting"

**Results:** Troubleshooting guides, error solutions, debugging tips

## Works With Any Documentation Site

DocLense is designed to work with **any documentation website**:

- **Frontend Frameworks**: React, Vue, Angular, Svelte
- **Backend Frameworks**: Node.js, Express, Fastify, Koa
- **Libraries**: Socket.IO, Lodash, Axios, jQuery
- **Tools**: Webpack, Vite, Babel, ESLint
- **Databases**: PostgreSQL, MongoDB, Redis
- **Cloud Services**: AWS, Azure, Google Cloud
- **And any other documentation site!**

## Architecture

- **Frontend**: REST API with Express.js
- **Database**: PostgreSQL with pgvector extension
- **Embeddings**: OpenAI text-embedding-3-small
- **Search**: Hybrid semantic + keyword search
- **Crawling**: Playwright-based web scraping

## Development

```bash
# Run database migrations
npm run db:push

# Start development server
npm run dev

# View database
npm run db:studio
```

## License

MIT
