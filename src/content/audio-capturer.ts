/// <reference types="chrome"/>
export interface AudioChunk {
  data: Float32Array;
  timestamp: number;
}

export interface FactCheckResult {
  summary: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  claims?: Array<{
    text: string;
    isFact: boolean;
    confidence: number;
  }>;
  error?: string;
}

export class AudioCapturer {
  private audioContext: AudioContext | null = null;
  private mediaElements: Set<HTMLMediaElement> = new Set();
  private sources: Map<HTMLMediaElement, MediaElementAudioSourceNode> = new Map();
  private processor: ScriptProcessorNode | null = null;
  private isCapturing: boolean = false;
  private bufferSize: number = 4096; // Adjust based on performance needs
  private chunkInterval: number = 5000; // 5 seconds between chunks
  private audioBuffer: Float32Array[] = [];
  private lastChunkTime: number = 0;
  private overlayManager: OverlayManager;

  constructor(overlayManager: OverlayManager) {
    this.overlayManager = overlayManager;
    
    // Listen for start/stop events
    window.addEventListener('startFactChecking', this.start.bind(this));
    window.addEventListener('stopFactChecking', this.stop.bind(this));
  }

  private initAudioContext(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to create AudioContext:', error);
        this.overlayManager.showError('Failed to initialize audio processing');
      }
    }
  }

  public start(): void {
    if (this.isCapturing) return;
    
    this.initAudioContext();
    if (!this.audioContext) return;
    
    this.isCapturing = true;
    this.lastChunkTime = Date.now();
    
    // Initialize processor
    this.processor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);
    this.processor.onaudioprocess = this.handleAudioProcess.bind(this);
    
    // Connect existing media elements
    this.connectExistingMedia();
    
    // Set up observer for new media elements
    this.observeMediaElements();
    
    // Show starting overlay
    this.overlayManager.showStarting();
  }

  public stop(): void {
    if (!this.isCapturing) return;
    
    this.isCapturing = false;
    
    // Disconnect all sources
    this.sources.forEach((source, element) => {
      source.disconnect();
      this.mediaElements.delete(element);
    });
    this.sources.clear();
    
    // Clear processor
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    // Clear buffer
    this.audioBuffer = [];
    
    // Hide overlay
    this.overlayManager.hide();
  }

  private connectExistingMedia(): void {
    const mediaElements = document.querySelectorAll<HTMLMediaElement>('video, audio');
    mediaElements.forEach(element => this.connectMediaElement(element));
  }

  private observeMediaElements(): void {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLMediaElement) {
            this.connectMediaElement(node);
          } else if (node.childNodes) {
            node.childNodes.forEach(child => {
              if (child instanceof HTMLMediaElement) {
                this.connectMediaElement(child);
              }
            });
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private connectMediaElement(element: HTMLMediaElement): void {
    if (!this.audioContext || !this.processor || this.mediaElements.has(element)) return;
    
    try {
      // Create source from media element
      const source = this.audioContext.createMediaElementSource(element);
      
      // Connect to processor and destination
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      // Track connected elements
      this.mediaElements.add(element);
      this.sources.set(element, source);
    } catch (error) {
      console.error('Failed to connect media element:', error);
    }
  }

  private handleAudioProcess(event: AudioProcessingEvent): void {
    if (!this.isCapturing) return;
    
    // Get audio data from input buffer
    const audioData = event.inputBuffer.getChannelData(0).slice();
    this.audioBuffer.push(audioData);
    
    // Check if it's time to process a chunk
    const now = Date.now();
    if (now - this.lastChunkTime >= this.chunkInterval) {
      this.processChunk();
      this.lastChunkTime = now;
    }
  }

  private processChunk(): void {
    if (this.audioBuffer.length === 0) return;
    
    // Combine all buffers into a single chunk
    const totalLength = this.audioBuffer.reduce((sum, buffer) => sum + buffer.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    
    let offset = 0;
    this.audioBuffer.forEach(buffer => {
      combinedBuffer.set(buffer, offset);
      offset += buffer.length;
    });
    
    // Clear buffer
    this.audioBuffer = [];
    
    // Show loading state
    this.overlayManager.showLoading();
    
    // Send to background script
    chrome.runtime.sendMessage({
      type: 'processAudio',
      audioData: this.convertToBase64(combinedBuffer),
      tabId: -1 // Will be determined by Chrome based on sender
    }, (result: FactCheckResult | undefined) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending audio data:', chrome.runtime.lastError);
        this.overlayManager.showError(chrome.runtime.lastError.message || 'Error communicating with background script');
        return;
      }
      
      if (!result) {
        this.overlayManager.showError('No response received from API');
        return;
      }
      
      if (result.error) {
        this.overlayManager.showError(result.error);
        return;
      }
      
      // Display results
      this.overlayManager.showResults(result);
    });
  }

  private convertToBase64(chunk: Float32Array): string {
    // Convert Float32Array to Int16Array (more compact for transmission)
    const raw = new Int16Array(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      // Scale to 16-bit range
      raw[i] = Math.max(-32768, Math.min(32767, chunk[i] * 32767));
    }
    
    // Convert to Base64
    const buffer = new ArrayBuffer(raw.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < raw.length; i++) {
      view.setInt16(i * 2, raw[i], true);
    }
    
    // Create binary string
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  }
}

export class OverlayManager {
  private overlay: HTMLElement | null = null;
  private timeoutId: number | null = null;
  
  constructor() {
    this.createOverlay();
  }
  
  private createOverlay(): void {
    // Create overlay element if it doesn't exist
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'fact-check-overlay';
      this.overlay.style.display = 'none';
      document.body.appendChild(this.overlay);
      
      // Add close button
      const closeButton = document.createElement('button');
      closeButton.textContent = '×';
      closeButton.className = 'fact-check-close';
      closeButton.addEventListener('click', () => this.hide());
      this.overlay.appendChild(closeButton);
      
      // Add content container
      const content = document.createElement('div');
      content.className = 'fact-check-content';
      this.overlay.appendChild(content);
    }
  }
  
  public showStarting(): void {
    this.updateContent(`
      <div class="fact-check-status">
        <div class="fact-check-spinner"></div>
        <p>Audio Fact Checker Activated</p>
        <p class="fact-check-subtitle">Waiting for audio content...</p>
      </div>
    `);
    this.show();
  }
  
  public showLoading(): void {
    this.updateContent(`
      <div class="fact-check-status">
        <div class="fact-check-spinner"></div>
        <p>Analyzing audio content...</p>
        <p class="fact-check-subtitle">Checking facts in real-time</p>
      </div>
    `);
    this.show();
  }
  
  public showResults(result: FactCheckResult): void {
    let claimsHtml = '';
    if (result.claims && result.claims.length > 0) {
      claimsHtml = `
        <div class="fact-check-claims">
          ${result.claims.map(claim => `
            <div class="fact-check-claim ${claim.isFact ? 'fact-check-true' : 'fact-check-false'}">
              <span class="fact-check-claim-icon">${claim.isFact ? '✓' : '✗'}</span>
              <span class="fact-check-claim-text">${claim.text}</span>
              <span class="fact-check-claim-confidence">${Math.round(claim.confidence * 100)}%</span>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    this.updateContent(`
      <div class="fact-check-result confidence-${result.confidenceLevel}">
        <div class="fact-check-summary">
          <h3>Fact Check Result</h3>
          <p>${result.summary}</p>
        </div>
        ${claimsHtml}
      </div>
    `);
    this.show();
    
    // Auto-hide after 10 seconds
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }
    this.timeoutId = window.setTimeout(() => this.hide(), 10000);
  }
  
  public showError(message: string): void {
    this.updateContent(`
      <div class="fact-check-error">
        <span class="fact-check-error-icon">⚠️</span>
        <p>Error: ${message}</p>
      </div>
    `);
    this.show();
    
    // Auto-hide after 5 seconds
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }
    this.timeoutId = window.setTimeout(() => this.hide(), 5000);
  }
  
  public hide(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
    
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
  
  private updateContent(html: string): void {
    if (this.overlay) {
      const content = this.overlay.querySelector('.fact-check-content');
      if (content) {
        content.innerHTML = html;
      }
    }
  }
  
  private show(): void {
    if (this.overlay) {
      this.overlay.style.display = 'block';
    }
  }
} 