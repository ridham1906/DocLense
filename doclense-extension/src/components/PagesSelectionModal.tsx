import React, { useState } from 'react';

interface PagesSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (maxPages: number) => void;
}

const PagesSelectionModal: React.FC<PagesSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [maxPages, setMaxPages] = useState(50);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(maxPages);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            Select the number of documentation pages to crawl (default: 50)
          </p>

          {/* Slider */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <span style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#2563eb',
                minWidth: '60px'
              }}>
                {maxPages}
              </span>
              <span style={{
                color: '#6b7280',
                fontSize: '14px'
              }}>
                pages
              </span>
            </div>

            <input
              type="range"
              min="50"
              max="100"
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: '#e5e7eb',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
              onInput={(e) => {
                const target = e.target as HTMLInputElement;
                target.style.background = `linear-gradient(to right, #2563eb 0%, #2563eb ${(parseInt(target.value) - 50) / 50 * 100}%, #e5e7eb ${(parseInt(target.value) - 50) / 50 * 100}%, #e5e7eb 100%)`;
              }}
            />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px'
            }}>
              <span style={{ color: '#6b7280', fontSize: '12px' }}>50</span>
              <span style={{ color: '#6b7280', fontSize: '12px' }}>100</span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
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
              onClick={handleConfirm}
              style={{
                padding: '10px 24px',
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
    </div>
  );
};

export default PagesSelectionModal;
