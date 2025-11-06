import React, { useEffect, useState } from 'react';

interface HelpPromptProps {
  onDismiss?: () => void;
}

const HelpPrompt: React.FC<HelpPromptProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClick = () => {
    console.log('DocLense: HelpPrompt clicked');

    // Open the extension popup
    if (chrome && chrome.action && chrome.action.openPopup) {
      chrome.action.openPopup().catch((error: any) => {
        console.error('DocLense: Error opening popup:', error);
        // Fallback: send message to background script to open popup
        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }).catch((error2: any) => {
            console.error('DocLense: Error sending message to background:', error2);
          });
        }
      });
    } else {
      console.error('DocLense: chrome.action not available');
      // Send message to background script to open popup
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }).catch((error: any) => {
          console.error('DocLense: Error sending message:', error);
        });
      }
    }

    // Dismiss the prompt after opening popup
    dismissPrompt();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening popup when clicking close
    console.log('DocLense: HelpPrompt closed by user');
    dismissPrompt();
  };

  const dismissPrompt = () => {
    setIsVisible(false);
    // Clean up all injected components
    cleanupInjectedComponents();
    // Call onDismiss callback if provided
    if (onDismiss) {
      onDismiss();
    }
  };

  const cleanupInjectedComponents = () => {
    console.log('DocLense: Cleaning up injected components');

    // Remove HelpPrompt container
    const helpPromptContainer = document.getElementById('doclense-help-prompt');
    if (helpPromptContainer) {
      const root = helpPromptContainer.querySelector('div');
      if (root) {
        // @ts-ignore
        root._reactRoot?.unmount?.();
      }
      helpPromptContainer.remove();
    }

    // Remove ChatbotWidget container (if it exists)
    const chatbotContainer = document.getElementById('doclense-chatbot-widget');
    if (chatbotContainer) {
      const root = chatbotContainer.querySelector('div');
      if (root) {
        // @ts-ignore
        root._reactRoot?.unmount?.();
      }
      chatbotContainer.remove();
    }

    // Remove CrawlOverlay container (if it exists)
    const crawlContainer = document.getElementById('doclense-crawl-overlay');
    if (crawlContainer) {
      const root = crawlContainer.querySelector('div');
      if (root) {
        // @ts-ignore
        root._reactRoot?.unmount?.();
      }
      crawlContainer.remove();
    }
  };

  // Auto-dismiss after some time
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isVisible) {
        console.log('DocLense: HelpPrompt auto-dismissed after timeout');
        dismissPrompt();
      }
    }, 10000); 

    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  console.log('DocLense: HelpPrompt component rendering');

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 999999,
      pointerEvents: 'auto'
    }}>
      <button
        onClick={handleClick}
        style={{
          backgroundColor: '#2563eb',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '9999px',
          border: 'none',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
          transform: 'scale(1)',
          position: 'relative',
          paddingRight: '44px' // Make room for close button
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1d4ed8';
          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#2563eb';
          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          style={{ flexShrink: 0 }}
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <span style={{ whiteSpace: 'nowrap' }}>Need my help with this docs?</span>

        {/* Close Button */}
        <div
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '-4px',
            right: '0px',
            width: '24px',
            height: '24px',
            backgroundColor: 'rgba(235, 30, 30)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(235, 30, 30)';
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </button>
    </div>
  );
};

export default HelpPrompt;
