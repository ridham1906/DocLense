export default defineBackground(() => {
  console.log('DocLense background script loaded!', { id: chrome.runtime.id });

  // Handle backend crawl requests
  chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
    if (message.type === 'CRAWL_URL') {
      handleCrawlRequest(message.url, sendResponse);
      return true; // Keep the message channel open for async response
    } else if (message.type === 'OPEN_POPUP') {
      handleOpenPopup(sendResponse);
      return true;
    }
  });
});

async function handleCrawlRequest(url: string, sendResponse: (response: any) => void) {
  try {
    console.log('DocLense: Crawling URL:', url);

    // Simulate backend crawl request
    const response = await fetch('http://localhost:5000/crawl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const data = await response.json();
      sendResponse({ success: true, data });
    } else {
      sendResponse({ success: false, error: 'Crawl failed' });
    }
  } catch (error) {
    console.error('DocLense: Crawl error:', error);
    sendResponse({ success: false, error: 'Network error' });
  }
}

async function handleOpenPopup(sendResponse: (response: any) => void) {
  try {
    console.log('DocLense: Opening popup from background script');
    if (chrome.action && chrome.action.openPopup) {
      await chrome.action.openPopup();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'chrome.action.openPopup not available' });
    }
  } catch (error) {
    console.error('DocLense: Error opening popup:', error);
    sendResponse({ success: false, error: error });
  }
}
