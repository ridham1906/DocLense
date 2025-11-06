import { shouldShowHelpPrompt } from '@/utils/keywords';
import React from 'react';
import { createRoot } from 'react-dom/client';
import HelpPrompt from '@/components/HelpPrompt';
import CrawlOverlay from '@/components/CrawlOverlay';
import ChatbotWidget from '@/components/ChatbotWidget';

interface Message {
  type: string;
  maxPages?: number;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('DocLense: Content script loaded');
    console.log('DocLense: Current URL:', window.location.href);

    // Check if current URL is a documentation site
    if (shouldShowHelpPrompt(window.location.href)) {
      console.log('DocLense: Documentation site detected - checking crawl status');
      
      // Check if site is already crawled
      checkCrawlStatus(window.location.href);
    } else {
      console.log('DocLense: Not a documentation site, skipping component injection');
    }
  },
});

async function checkCrawlStatus(url: string) {
  try {
    const response = await fetch(`http://localhost:4000/api/crawl/status?domain=${encodeURIComponent(url)}`);
    const data = await response.json();
    
    if (data.success && data.alreadyCrawled) {
      console.log('DocLense: Site already crawled, showing chatbot widget');
      // Inject chatbot widget directly if site is already crawled
      injectChatbotWidget();
    } else {
      console.log('DocLense: Site not yet crawled, showing help prompt');
      // Inject HelpPrompt component initially
      injectHelpPrompt();
    }
  } catch (error) {
    console.error('DocLense: Error checking crawl status:', error);
    // Fallback to showing help prompt
    injectHelpPrompt();
  }
}

function injectHelpPrompt() {
  console.log('DocLense: Injecting HelpPrompt component');

  // Check if container already exists
  const existingContainer = document.getElementById('doclense-help-prompt');
  if (existingContainer) {
    console.log('DocLense: HelpPrompt container already exists');
    return;
  }

  const container = document.createElement('div');
  container.id = 'doclense-help-prompt';
  document.body.appendChild(container);

  console.log('DocLense: Created HelpPrompt container, mounting React component');

  try {
    const root = createRoot(container);
    root.render(<HelpPrompt onDismiss={() => {
      console.log('DocLense: HelpPrompt dismissed - cleaning up');
      // The HelpPrompt component handles its own cleanup
      // But we can add additional cleanup here if needed
    }} />);
    console.log('DocLense: HelpPrompt React component mounted successfully');
  } catch (error) {
    console.error('DocLense: Error mounting HelpPrompt component:', error);
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message: Message, sender: chrome.runtime.MessageSender, sendResponse: () => void) => {
    console.log('DocLense: Received message:', message);
    if (message.type === 'START_SCANNING') {
      console.log('DocLense: Starting scanning overlay with maxPages:', message.maxPages);
      showCrawlOverlay(message.maxPages || 50);
    } else if (message.type === 'SHOW_CHATBOT') {
      console.log('DocLense: Showing chatbot widget');
      injectChatbotWidget();
    }
  });
}

function injectChatbotWidget() {
  console.log('DocLense: Injecting ChatbotWidget component');

  // Check if container already exists
  const existingContainer = document.getElementById('doclense-chatbot-widget');
  if (existingContainer) {
    console.log('DocLense: ChatbotWidget container already exists');
    return;
  }

  const container = document.createElement('div');
  container.id = 'doclense-chatbot-widget';
  document.body.appendChild(container);

  console.log('DocLense: Created ChatbotWidget container, mounting React component');

  try {
    const root = createRoot(container);
    root.render(<ChatbotWidget />);
    console.log('DocLense: ChatbotWidget React component mounted successfully');
  } catch (error) {
    console.error('DocLense: Error mounting ChatbotWidget component:', error);
  }
}

function showCrawlOverlay(maxPages: number = 50) {
  console.log('DocLense: Showing crawl overlay with maxPages:', maxPages);

  const container = document.createElement('div');
  container.id = 'doclense-crawl-overlay';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<CrawlOverlay
    maxPages={maxPages}
    onComplete={() => {
      console.log('DocLense: Crawl overlay completed - showing chatbot widget');
      root.unmount();
      container.remove();

      // Show chatbot widget only after successful crawl
      injectChatbotWidget();
    }}
  />);
}