markdown
Copy

**Create a Browser Extension for Audio Fact-Checking AI**

**Requirements:**
1. Chrome/Firefox extension that captures audio from browser tabs
2. Sends audio chunks to your existing AI API endpoint
3. Displays fact-check results in an overlay
4. Supports Manifest V3 (Chrome) and WebExtensions (Firefox)

**Technical Specifications:**
- Use Web Audio API for audio capture
- Implement chunking strategy (5-second intervals)
- Handle API response latency with loading states
- Non-intrusive UI that works on YouTube/Netflix/Twitch

**File Structure:**

/extension
├── manifest.json
├── background.js
├── content-script.js
├── overlay-ui.js
├── styles.css
└── icons/
Copy


**1. manifest.json (Chrome):**
```json
{
  "manifest_version": 3,
  "name": "Audio Fact Checker",
  "version": "1.0",
  "permissions": ["activeTab", "storage", "scripting"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["*://*/*"],
    "js": ["content-script.js"],
    "css": ["styles.css"]
  }],
  "action": {
    "default_popup": "popup.html"
  },
  "icons": {
    "128": "icons/icon128.png"
  }
}

2. content-script.js:
javascript
Copy

class AudioCapturer {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.processor = null;
  }

  startCapture() {
    const mediaElements = document.querySelectorAll('video, audio');
    
    mediaElements.forEach(mediaElement => {
      const source = this.audioContext.createMediaElementSource(mediaElement);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const audioData = e.inputBuffer.getChannelData(0);
        this.processAudioChunk(audioData);
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    });
  }

  async processAudioChunk(chunk) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'processAudio',
        audioData: this.convertToBase64(chunk)
      });
      
      this.displayResults(response);
    } catch (error) {
      console.error('API Error:', error);
    }
  }

  convertToBase64(chunk) {
    // Convert Float32Array to Base64 for API transmission
    const raw = new Int16Array(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      raw[i] = chunk[i] * 32767;
    }
    return btoa(String.fromCharCode.apply(null, raw));
  }

  displayResults(results) {
    const overlay = document.createElement('div');
    overlay.className = 'fact-check-overlay';
    overlay.innerHTML = `
      <div class="confidence-${results.confidenceLevel}">
        ${results.summary}
      </div>
    `;
    document.body.appendChild(overlay);
  }
}

// Initialize when media elements are detected
const capturer = new AudioCapturer();
document.addEventListener('play', () => capturer.startCapture(), true);

3. background.js:
javascript
Copy

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'processAudio') {
    fetch('YOUR_API_ENDPOINT', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${YOUR_API_KEY}`
      },
      body: request.audioData
    })
    .then(response => response.json())
    .then(data => sendResponse(data))
    .catch(error => sendResponse({ error: error.message }));
    
    return true; // Keep message channel open for async
  }
});

4. styles.css:
css
Copy

.fact-check-overlay {
  position: fixed;
  bottom: 20px;
  right: 20px;
  max-width: 300px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  z-index: 10000;
  backdrop-filter: blur(5px);
}

.confidence-high { border-left: 4px solid #00ff00; }
.confidence-medium { border-left: 4px solid #ff9900; }
.confidence-low { border-left: 4px solid #ff0000; }

Implementation Steps:

    Replace YOUR_API_ENDPOINT and YOUR_API_KEY in background.js

    Add error handling for different audio codecs

    Implement chunk buffering to handle network latency

    Add user controls for sensitivity/confidence thresholds

    Include content security policy in manifest for Chrome

Testing:

    Use Chrome's chrome://extensions developer mode

    Test with local media files and streaming services

    Monitor performance via Chrome's Task Manager

Advanced Features to Consider:

    WebAssembly audio preprocessing

    Speech-to-text fallback layer

    Local caching of common audio fingerprints