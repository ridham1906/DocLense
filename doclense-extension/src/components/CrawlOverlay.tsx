import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {ScanningLoader} from './Loader';

interface CrawlOverlayProps {
  onComplete: () => void;
  maxPages?: number;
}

const displayMsgs = 
["It may take some time, so please wait!", 
  "Reading Documentation for you 😎", 
  "Analyzing content with AI...",
  "This won't take long, promise!",
  "Crawling through the docs...",
  "Almost there, hang tight!",
  "Just a moment more...",
  "Fetching the info you need...",
  "Preparing to assist you...",
  "ohh! That's interesting...",
  "ok, got it!"
]

const CrawlOverlay: React.FC<CrawlOverlayProps> = ({ onComplete, maxPages = 50 }) => {
  const [isScanning, setIsScanning] = useState(true);
  const [crawlStatus, setCrawlStatus] = useState<'scanning' | 'success' | 'error'>('scanning');
  const [displayMsg, setDisplayMsg] = useState(displayMsgs[0]);

  console.log('DocLense: CrawlOverlay component rendering with maxPages:', maxPages);

  useEffect(() => {
    const timer = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * displayMsgs.length);
      setDisplayMsg(displayMsgs[randomIndex]);
    }, 2500); // Change message every 2 seconds
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Backend crawl request
    const crawlUrl = async () => {
      try {
        console.log('DocLense: Starting crawl for', window.location.href, 'with maxPages:', maxPages);
        const response = await fetch('http://localhost:4000/api/crawl', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: window.location.href,
            maxPages: maxPages
          }),
        });

        let res;
        try {
          res = await response.json();
        } catch (parseError) {
          console.error('DocLense: Failed to parse response:', parseError);
          throw new Error('Invalid response format');
        }

        console.log('DocLense: Backend response:', res);

        if (response.ok && res.success) {
          console.log('DocLense: Crawl completed successfully');
          setCrawlStatus('success');

          // Stop scanning after success
          setTimeout(() => {
            setIsScanning(false);
            setTimeout(onComplete, 500); // Wait for fade out animation
          }, 1000);
        } else {
          console.error('DocLense: Crawl failed - Response:', res);
          setCrawlStatus('error');

          // Stop scanning after error
          setTimeout(() => {
            setIsScanning(false);
            setTimeout(() => {
              // Don't call onComplete for errors - just close overlay
              const container = document.getElementById('doclense-crawl-overlay');
              if (container) {
                const root = container.querySelector('div');
                if (root) {
                  // @ts-ignore
                  root._reactRoot?.unmount?.();
                }
                container.remove();
              }
            }, 500);
          }, 2000);
        }
      } catch (error) {
        console.error('DocLense: Network error during crawl', error);
        setCrawlStatus('error');

        // Stop scanning after error
        setTimeout(() => {
          setIsScanning(false);
          setTimeout(() => {
            // Don't call onComplete for errors - just close overlay
            const container = document.getElementById('doclense-crawl-overlay');
            if (container) {
              const root = container.querySelector('div');
              if (root) {
                // @ts-ignore
                root._reactRoot?.unmount?.();
              }
              container.remove();
            }
          }, 500);
        }, 2000);
      }
    };

    crawlUrl();
  }, [onComplete, maxPages]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto'
      }}
    >
      <div style={{
        textAlign: 'center',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyItems: 'center',
      }}>
        <ScanningLoader />

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '6px',
            marginTop: "5px"
          }}
        >
          {crawlStatus === 'scanning' && <p> It may take some time, so Please wait! </p>}
          {crawlStatus === 'success' && 'Crawl Successful!'}
          {crawlStatus === 'error' && 'Crawl Failed'}
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            color: '#9ca3af'
          }}
        >
          {crawlStatus === 'scanning' && displayMsg}
          {crawlStatus === 'success' && 'Ready to help with this documentation!'}
          {crawlStatus === 'error' && 'Please try again or check your connection.'}
        </motion.p>
      </div>
    </motion.div>
  );
};

export default CrawlOverlay;
