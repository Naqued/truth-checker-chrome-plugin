/// <reference types="chrome"/>

// Configuration
const API_ENDPOINT = 'http://0.0.0.0:8000/api/fact-check';
const API_KEY = 'YOUR_API_KEY'; // If your server requires an API key

// Types
interface AudioMessage {
  type: 'processAudio';
  audioData: string; // base64 encoded audio data
  tabId: number;
}

interface FactCheckResult {
  summary: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  claims?: Array<{
    text: string;
    isFact: boolean;
    confidence: number;
  }>;
  error?: string;
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((
  message: any, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response?: any) => void
) => {
  if (message.type === 'processAudio') {
    processAudioData(message as AudioMessage)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error instanceof Error ? error.message : String(error) }));
    
    // Keep the message channel open for async response
    return true;
  }
  
  if (message.action === 'startFactChecking') {
    // Execute content script to start fact checking
    if (sender.tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        func: () => {
          // This function will be injected into the page
          window.dispatchEvent(new CustomEvent('startFactChecking'));
        }
      }).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
      });
    }
    return true;
  }
  
  if (message.action === 'stopFactChecking') {
    // Execute content script to stop fact checking
    if (sender.tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        func: () => {
          // This function will be injected into the page
          window.dispatchEvent(new CustomEvent('stopFactChecking'));
        }
      }).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
      });
    }
    return true;
  }
});

// Process the audio data and send to API
async function processAudioData(message: AudioMessage): Promise<FactCheckResult> {
  try {
    console.log('Sending audio data to server...');
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        audio: message.audioData,
        format: 'base64'
      })
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Received response from server:', data);
    return data as FactCheckResult;
  } catch (error) {
    console.error('Error processing audio:', error);
    return {
      summary: 'Failed to process audio',
      confidenceLevel: 'low',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 