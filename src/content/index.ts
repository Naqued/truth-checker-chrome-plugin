/// <reference types="chrome"/>
import { AudioCapturer, OverlayManager } from './audio-capturer';
import './styles.css';

// Initialize the overlay manager and audio capturer
const overlayManager = new OverlayManager();
const audioCapturer = new AudioCapturer(overlayManager);

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((
  message: { action?: string },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  if (message.action === 'startFactChecking') {
    audioCapturer.start();
    sendResponse({ success: true });
  }
  
  if (message.action === 'stopFactChecking') {
    audioCapturer.stop();
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open for async response
}); 