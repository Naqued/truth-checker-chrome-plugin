/// <reference types="chrome"/>
import React, { useState, useEffect } from 'react';
import './popup.css';

interface FactCheckState {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
}

interface StorageResult {
  isFactCheckActive?: boolean;
}

const Popup: React.FC = () => {
  const [state, setState] = useState<FactCheckState>({
    isActive: false,
    isLoading: false,
    error: null
  });

  useEffect(() => {
    // Check if fact-checking is currently active
    chrome.storage.local.get(['isFactCheckActive'], (result: StorageResult) => {
      setState(prev => ({
        ...prev,
        isActive: result.isFactCheckActive || false
      }));
    });
  }, []);

  const toggleFactChecking = () => {
    const newActiveState = !state.isActive;
    
    setState(prev => ({
      ...prev,
      isLoading: true
    }));

    // Send message to background script to start/stop fact checking
    chrome.runtime.sendMessage(
      { action: newActiveState ? 'startFactChecking' : 'stopFactChecking' },
      (response) => {
        if (chrome.runtime.lastError) {
          setState({
            isActive: !newActiveState, // Revert if error
            isLoading: false,
            error: chrome.runtime.lastError.message || 'Unknown error'
          });
          return;
        }

        // Save state to storage
        chrome.storage.local.set({ isFactCheckActive: newActiveState }, () => {
          setState({
            isActive: newActiveState,
            isLoading: false,
            error: null
          });
        });
      }
    );
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f9fafb', minHeight: '100%' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
        Audio Fact Checker
      </h1>
      
      {state.error && (
        <div style={{ 
          backgroundColor: '#FEE2E2', 
          border: '1px solid #F87171', 
          color: '#B91C1C', 
          padding: '8px 16px', 
          marginBottom: '16px', 
          borderRadius: '4px' 
        }}>
          {state.error}
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          onClick={toggleFactChecking}
          disabled={state.isLoading}
          className={state.isActive ? 'button-red' : 'button-green'}
          style={{ opacity: state.isLoading ? 0.5 : 1, cursor: state.isLoading ? 'not-allowed' : 'pointer' }}
        >
          {state.isLoading
            ? 'Processing...'
            : state.isActive
            ? 'Stop Fact Checking'
            : 'Start Fact Checking'}
        </button>
        
        <p style={{ marginTop: '16px', fontSize: '14px', color: '#4B5563', textAlign: 'center' }}>
          {state.isActive
            ? 'Fact checking is currently active. The extension is listening to audio and checking facts in real-time.'
            : 'Click the button above to start fact checking audio on this page.'}
        </p>
      </div>
      
      <hr style={{ margin: '16px 0', borderColor: '#D1D5DB' }} />
      
      <div style={{ fontSize: '12px', color: '#6B7280', textAlign: 'center' }}>
        <p>Audio is processed locally before being sent for analysis.</p>
        <p>No audio is stored or used for any purpose other than fact checking.</p>
      </div>
    </div>
  );
};

export default Popup; 