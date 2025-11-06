# DocLense

DocLense is an AI-powered document search and summarization tool that enhances your browsing experience by intelligently crawling, indexing, and searching through documentation websites. With a browser extension interface, users can quickly find relevant information across documentation sites without manually searching through pages.

## Features

- **Smart Crawling**: Automatically crawls documentation websites to extract and index content
- **AI-Powered Search**: Uses embeddings and vector search for semantic understanding of queries
- **Intelligent Summarization**: Generates concise summaries of relevant documentation sections
- **Browser Extension Interface**: Easy-to-use popup interface for searching documentation
- **Real-time Results**: Provides enhanced search results with contextual information

## How It Works

DocLense consists of two main components:

1. **Backend Service** - Handles the core logic for:
   - Crawling documentation websites
   - Creating embeddings for indexed content
   - Performing vector searches on the indexed data
   - Generating enhanced search results

2. **Browser Extension** - Provides the user interface:
   - Popup UI for entering search queries
   - Content script for interacting with web pages
   - Background service for communication with the backend

The system works by first crawling documentation sites and storing the content. It then creates vector embeddings of the content which are stored in a vector database. When a user searches through the browser extension, the query is also embedded and compared against the stored embeddings to find the most relevant content, which is then summarized and presented to the user.

## Setup Guide

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- Docker and Docker Compose
- Git

### Cloning the Repository

```bash
git clone https://github.com/your-username/doclense.git
cd doclense
```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the backend directory with the following variables:
   ```env
   # Database configuration
   DATABASE_URL=your_database_url
   
   # API keys for services (if needed)
   OPENAI_API_KEY=your_openai_api_key
   
   # Other configuration
   PORT=3000
   ```

4. Run the database migrations (if applicable):
   ```bash
   npx drizzle-kit push
   ```

5. Start the backend service:
   ```bash
   npm run dev
   ```
   
   Or using Docker:
   ```bash
   docker-compose up
   ```

### Browser Extension Setup

1. Navigate to the extension directory:
   ```bash
   cd ../doclense-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `doclense-extension/.output/chrome-mv3` directory

### Development

To run the extension in development mode with hot reloading:

```bash
npm run dev
```

This will watch for changes and automatically rebuild the extension.

## Usage

1. Click on the DocLense extension icon in your browser toolbar
2. Enter your search query in the popup
3. View the enhanced search results with summarized information
4. Click on result links to navigate to relevant documentation sections

## Project Structure

```
.
├── backend/                 # Backend service
│   ├── src/
│   │   ├── db/              # Database schema and connection
│   │   ├── services/        # Core business logic modules
│   │   └── index.ts         # Entry point
│   ├── storage/             # Request queues and key-value stores
│   └── ...
├── doclense-extension/      # Browser extension
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── entrypoints/     # Popup, background, content scripts
│   │   └── ...
│   └── ...
```

## Technologies Used

- **Backend**:
  - TypeScript/Node.js
  - Drizzle ORM
  - Docker

- **Frontend Extension**:
  - WXT Framework - for creating chrome extention
  - React
  - Tailwind CSS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.