import React, { useState, useEffect } from 'react';

interface PagesSelectionModalProps {
  maxPages: number;
  onChange: (pages: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const PagesSelectionModal: React.FC<PagesSelectionModalProps> = ({
  maxPages,
  onChange,
  onCancel,
  onConfirm
}) => {
  return (
    <div style={{
      width: '320px',
      padding: '24px',
      backgroundColor: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '8px'
        }}>
          How many pages should I read?
        </h2>

        <p style={{
          color: '#6b7280',
          fontSize: '14px',
          marginBottom: '24px'
        }}>
          Select the number of documentation pages to crawl
        </p>

        {/* Slider Section */}
        <div style={{
          marginBottom: '32px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <span style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#2563eb',
              minWidth: '80px'
            }}>
              {maxPages}
            </span>
            <span style={{
              color: '#6b7280',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              pages
            </span>
          </div>

          <input
            type="range"
            min="50"
            max="100"
            value={maxPages}
            onChange={(e) => onChange(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((maxPages - 50) / 50) * 100}%, #e5e7eb ${((maxPages - 50) / 50) * 100}%, #e5e7eb 100%)`,
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none'
            }}
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px'
          }}>
            <span style={{
              color: '#6b7280',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              50 pages
            </span>
            <span style={{
              color: '#6b7280',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              100 pages
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              color: '#374151',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            Read {maxPages} pages
          </button>
        </div>
      </div>
    </div>
  );
};

const Popup: React.FC = () => {
  const [showPagesModal, setShowPagesModal] = useState(false);
  const [selectedPages, setSelectedPages] = useState(50);
  const [crawlStatus, setCrawlStatus] = useState<'loading' | 'crawled' | 'notCrawled' | 'error'>('loading');
  const [currentUrl, setCurrentUrl] = useState('');

  // Check crawl status when popup opens
  useEffect(() => {
    const checkCrawlStatus = async () => {
      try {
        // Get current tab URL
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].url) {
          const url = tabs[0].url;
          setCurrentUrl(url);
          
          // Check if site is already crawled
          const response = await fetch(`http://localhost:4000/api/crawl/status?domain=${encodeURIComponent(url)}`);
          const data = await response.json();
          
          if (data.success && data.alreadyCrawled) {
            setCrawlStatus('crawled');
          } else {
            setCrawlStatus('notCrawled');
          }
        } else {
          setCrawlStatus('error');
        }
      } catch (error) {
        console.error('Error checking crawl status:', error);
        setCrawlStatus('error');
      }
    };

    checkCrawlStatus();
  }, []);

  const handleReadDocs = () => {
    setShowPagesModal(true);
  };

  const handleReadAgain = () => {
    setShowPagesModal(true);
  };

  const handleShowChatbot = () => {
    // Send message to content script to show chatbot
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SHOW_CHATBOT'
        });
      }
    });
    
    // Close popup
    window.close();
  };

  const handlePagesChange = (pages: number) => {
    setSelectedPages(pages);
  };

  const handleCancel = () => {
    setShowPagesModal(false);
    setSelectedPages(50); // Reset to default
  };

  const handleConfirm = () => {
    console.log('DocLense: Starting crawl with', selectedPages, 'pages');

    // Send message to content script to start scanning with page count
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'START_SCANNING',
          maxPages: selectedPages
        });
      }
    });

    // Close popup
    window.close();
  };

  if (showPagesModal) {
    return (
      <PagesSelectionModal
        maxPages={selectedPages}
        onChange={handlePagesChange}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    );
  }

  return (
    <div style={{
      width: '320px',
      padding: '24px',
      backgroundColor: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '8px'
        }}>DocLense</h1>
        <p style={{
          color: '#6b7280',
          marginBottom: '24px'
        }}>Your AI assistant for any documentation</p>

        {crawlStatus === 'loading' && (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center',
            color: '#6b7280'
          }}>
            Checking crawl status...
          </div>
        )}

        {crawlStatus === 'error' && (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center',
            color: '#ef4444'
          }}>
            Error checking crawl status
          </div>
        )}

        {crawlStatus === 'crawled' && (
          <div>
            <div style={{
              padding: '16px',
              backgroundColor: '#dcfce7',
              borderRadius: '8px',
              marginBottom: '24px',
              color: '#166534',
              fontWeight: '500'
            }}>
              ✓ I've already read this documentation once
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <button
                onClick={handleShowChatbot}
                style={{
                  width: '100%',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  fontWeight: '500',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
              >
                Show Chatbot
              </button>
              
              <button
                onClick={handleReadAgain}
                style={{
                  width: '100%',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: '500',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                Read Again
              </button>
            </div>
          </div>
        )}

        {crawlStatus === 'notCrawled' && (
          <button
            onClick={handleReadDocs}
            style={{
              width: '100%',
              backgroundColor: '#2563eb',
              color: 'white',
              fontWeight: '500',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            Read this documentation
          </button>
        )}
      </div>
    </div>
  );
};

export default Popup;