import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatLoader } from './Loader';

// Define the message type with additional properties for streaming
interface ChatMessage {
  text: string;
  isBot: boolean;
  isStreaming?: boolean;
  sources?: Array<{ title: string; url: string }>;
}

const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: "Hi! I'm Lensy. How can I help you understand this documentation?", isBot: true }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [width, setWidth] = useState(350);
  const [height, setHeight] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  console.log('DocLense: ChatbotWidget component rendering');

  // Handle resizing from top-left corner
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;
      
      const deltaX = startPos.current.x - e.clientX;
      const deltaY = startPos.current.y - e.clientY;
      
      const newWidth = Math.max(300, Math.min(600, startPos.current.width + deltaX));
      const newHeight = Math.max(350, Math.min(700, startPos.current.height + deltaY));
      
      setWidth(newWidth);
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!resizeRef.current) return;
    
    setIsResizing(true);
    const rect = resizeRef.current.getBoundingClientRect();
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = { text: inputValue, isBot: false };
    setMessages(prev => [...prev, userMessage]);

    // Add a placeholder for the bot response
    const botMessageIndex = messages.length;
    setMessages(prev => [...prev, { text: '', isBot: true, isStreaming: true }]);
    setInputValue('');

    try {
      const domain = window.location.origin;
      
      // Create a more responsive streaming implementation
      const response = await fetch('http://localhost:4000/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: inputValue,
          domain: domain,
          stream: true
        })
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let sources: Array<{ title: string; url: string }> = [];
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Finalize the message
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[botMessageIndex + 1] = { 
                text: accumulatedText, 
                isBot: true, 
                isStreaming: false,
                sources: sources.length > 0 ? sources : newMessages[botMessageIndex + 1]?.sources
              };
              return newMessages;
            });
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'chunk') {
                  accumulatedText += data.content;
                  // Update the bot message with the accumulated text
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[botMessageIndex + 1] = { 
                      text: accumulatedText, 
                      isBot: true, 
                      isStreaming: true,
                      sources: sources
                    };
                    return newMessages;
                  });
                } else if (data.type === 'sources') {
                  // Update sources
                  sources = data.content || [];
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[botMessageIndex + 1] = { 
                      ...newMessages[botMessageIndex + 1],
                      sources: sources
                    };
                    return newMessages;
                  });
                } else if (data.type === 'end') {
                  // Finalize the message
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[botMessageIndex + 1] = { 
                      text: accumulatedText, 
                      isBot: true, 
                      isStreaming: false,
                      sources: sources
                    };
                    return newMessages;
                  });
                } else if (data.type === 'error') {
                  // Handle error
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[botMessageIndex + 1] = { 
                      text: data.content || "Sorry, I encountered an error while processing your request.", 
                      isBot: true, 
                      isStreaming: false
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error('Error parsing stream data:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[botMessageIndex + 1] = { 
          text: "Sorry, I encountered an error while processing your request.", 
          isBot: true, 
          isStreaming: false
        };
        return newMessages;
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 999999,
      pointerEvents: 'auto'
    }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={resizeRef}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              position: 'absolute',
              bottom: '80px',
              right: '0',
              width: `${width}px`,
              height: `${height}px`,
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e5e7eb',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}
          >
            {/* Resize Handle (Top-Left Corner) */}
            <div 
              onMouseDown={startResizing}
              style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '20px',
                height: '20px',
                cursor: 'nwse-resize',
                zIndex: 10,
                transform: 'rotate(90deg)',
                padding: '4px',
                color:'white'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                <path d="M8 16L16 8M16 16V8H8" />
              </svg>
            </div>

            {/* Chat Header */}
            <div style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>DocLense Assistant</div>
                  <div style={{ fontSize: '12px', opacity: '0.9', marginTop: '2px' }}>AI-powered documentation helper</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  color: 'white',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Messages */}
            <div style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              backgroundColor: '#f9fafb',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    alignSelf: message.isBot ? 'flex-start' : 'flex-end',
                    maxWidth: '85%'
                  }}
                >
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '18px',
                    backgroundColor: message.isBot ? 'white' : '#3b82f6',
                    color: message.isBot ? '#374151' : 'white',
                    border: message.isBot ? '1px solid #e5e7eb' : 'none',
                    boxShadow: message.isBot ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : '0 1px 2px 0 rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    position: 'relative'
                  }}>
                    {message.isBot ? (
                      <div>
                        {message.text.split('\n').map((paragraph, i) => {
                          // Check if this is a code block
                          if (paragraph.startsWith('```') && paragraph.endsWith('```')) {
                            return (
                              <pre key={i} style={{
                                backgroundColor: '#f3f4f6',
                                padding: '12px',
                                borderRadius: '8px',
                                overflowX: 'auto',
                                margin: '8px 0',
                                fontSize: '13px',
                                lineHeight: '1.4'
                              }}>
                                <code>{paragraph.slice(3, -3)}</code>
                              </pre>
                            );
                          }
                          // Check if this is a numbered list item
                          else if (/^\d+\.\s/.test(paragraph)) {
                            return (
                              <div key={i} style={{ 
                                display: 'flex', 
                                alignItems: 'flex-start',
                                marginBottom: '8px'
                              }}>
                                <span style={{ 
                                  fontWeight: '600',
                                  marginRight: '8px',
                                  minWidth: '24px'
                                }}>
                                  {paragraph.match(/^\d+/)?.[0]}.
                                </span>
                                <span>{paragraph.replace(/^\d+\.\s/, '')}</span>
                              </div>
                            );
                          }
                          // Check if this is a bullet point
                          else if (/^[\*\-\+]\s/.test(paragraph)) {
                            return (
                              <div key={i} style={{ 
                                display: 'flex', 
                                alignItems: 'flex-start',
                                marginBottom: '8px'
                              }}>
                                <span style={{ 
                                  marginRight: '8px',
                                  minWidth: '16px'
                                }}>
                                  •
                                </span>
                                <span>{paragraph.replace(/^[\*\-\+]\s/, '')}</span>
                              </div>
                            );
                          }
                          // Check if this is a header
                          else if (/^#{1,6}\s/.test(paragraph)) {
                            const level = paragraph.match(/^#+/)?.[0].length || 1;
                            const fontSize = `${18 - (level - 1) * 2}px`;
                            const fontWeight = level <= 2 ? '600' : '500';
                            return (
                              <div 
                                key={i} 
                                style={{ 
                                  fontSize, 
                                  fontWeight,
                                  margin: `${16 - (level - 1) * 4}px 0`,
                                  color: '#1f2937'
                                }}
                              >
                                {paragraph.replace(/^#{1,6}\s/, '')}
                              </div>
                            );
                          }
                          // Regular paragraph
                          else if (paragraph.trim() !== '') {
                            return <p key={i} style={{ margin: '8px 0' }}>{paragraph}</p>;
                          }
                          // Empty line
                          else {
                            return <div key={i} style={{ height: '8px' }}></div>;
                          }
                        })}
                      </div>
                    ) : (
                      message.text
                    )}
                    {message.isBot && message.isStreaming && (
                      <ChatLoader />
                    )}
                    {message.isBot && message.sources && message.sources.length > 0 && (
                      <div style={{ 
                        marginTop: '16px', 
                        paddingTop: '16px', 
                        borderTop: '1px solid #e5e7eb',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        <div style={{ 
                          fontWeight: '600', 
                          marginBottom: '8px',
                          color: '#374151',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          Sources
                        </div>
                        <ul style={{ 
                          paddingLeft: '0', 
                          marginTop: '0',
                          maxHeight: '120px',
                          overflowY: 'auto'
                        }}>
                          {message.sources.slice(0, 3).map((source, i) => (
                            <li key={i} style={{ 
                              marginTop: '6px',
                              listStyle: 'none'
                            }}>
                              <a 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                  color: '#3b82f6', 
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                  <path d="M15 3h6v6" />
                                  <path d="M10 14L21 3" />
                                </svg>
                                <span style={{ 
                                  fontSize: '13px',
                                  lineHeight: '1.4'
                                }}>
                                  {source.title}
                                </span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {!message.isBot && (
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#9ca3af', 
                      textAlign: 'right', 
                      marginTop: '4px',
                      marginRight: '8px'
                    }}>
                      You
                    </div>
                  )}
                </motion.div>
              ))}

            </div>

            {/* Chat Input */}
            <div style={{
              padding: '16px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: 'white'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about this documentation..."
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '24px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: 'white',
                    color: 'black'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{transform : 'rotate(60deg)'}}>
                    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px',
          height: '60px',
          backgroundColor: '#3b82f6',
          color: 'white',
          borderRadius: '50%',
          border: 'none',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2563eb';
          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#3b82f6';
          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.svg
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.svg
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default ChatbotWidget;