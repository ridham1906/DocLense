# DocLense Browser Extension

An AI-powered browser extension that enhances your documentation reading experience by intelligently crawling, indexing, and searching through documentation websites.

## Features

- **Smart Documentation Detection**: Automatically detects when you're browsing documentation sites
- **One-Click Crawling**: Easily crawl and index documentation with a single click
- **AI Chatbot Integration**: Ask questions about the documentation directly
- **Helpful Prompts**: Unobtrusive help prompts appear on documentation sites
- **Customizable Crawling**: Choose how many pages to crawl (50-100 pages)

## Components

The extension consists of several key components:

1. **Popup UI** - Main interface for controlling DocLense features
2. **Content Script** - Runs on documentation pages to detect content and inject UI components
3. **Background Script** - Handles communication with the backend service
4. **Help Prompt** - Appears on documentation sites to offer assistance
5. **Crawl Overlay** - Shows progress during documentation crawling
6. **Chatbot Widget** - Provides an interface for asking questions about the documentation

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- Git

### Building the Extension

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/doclense.git
   cd doclense/doclense-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

   For Firefox:
   ```bash
   npm run build:firefox
   ```

### Loading the Extension

#### Chrome/Edge:
1. Open the browser and navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `doclense-extension/.output/chrome-mv3` directory

#### Firefox:
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `doclense-extension/.output/firefox-mv3` directory

## Development

To run the extension in development mode with hot reloading:

```bash
npm run dev
```

For Firefox development:
```bash
npm run dev:firefox
```

### Available Scripts

| Command               | Description                          |
|-----------------------|--------------------------------------|
| `npm run dev`         | Run development server (Chrome)      |
| `npm run dev:firefox` | Run development server (Firefox)     |
| `npm run build`       | Build for production (Chrome)        |
| `npm run build:firefox`| Build for production (Firefox)      |
| `npm run zip`         | Package extension (Chrome)           |
| `npm run zip:firefox` | Package extension (Firefox)          |
| `npm run compile`     | Compile TypeScript without emitting  |

## Usage

1. Navigate to any documentation website
2. Look for the DocLense help prompt that appears at the bottom right of the page
3. Click the prompt to open the DocLense popup
4. Choose how many pages to crawl (50-100)
5. After crawling completes, use the chatbot to ask questions about the documentation

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ChatbotWidget.tsx
│   ├── CrawlOverlay.tsx
│   ├── HelpPrompt.tsx
│   └── Loader.tsx
├── entrypoints/         # Extension entry points
│   ├── popup/           # Popup UI
│   │   ├── Popup.tsx
│   │   ├── index.html
│   │   └── main.tsx
│   ├── background.ts     # Background script
│   └── content.tsx       # Content script
├── utils/               # Utility functions
│   └── keywords.ts
├── manifest.ts          # Extension manifest
└── style.css            # Global styles
```

## Technologies Used

- **WXT Framework** - for creating Chrome extension
- **React** - UI library for building components
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Styled Components** - CSS-in-JS library
- **Framer Motion** - Animation library

## Communication with Backend

The extension communicates with the DocLense backend service to perform crawling and search operations. Ensure the backend is running on `localhost:4000` for full functionality.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## Troubleshooting

### Extension not loading
- Ensure all dependencies are installed with `npm install`
- Check that you're loading the correct build directory

### Backend connection issues
- Verify the DocLense backend is running
- Check that the backend is accessible at `localhost:4000`

### Help prompt not appearing
- The extension only activates on documentation sites
- Check the [keywords.ts](src/utils/keywords.ts) file for supported domains

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE.txt) file for details.