# Audio Fact Checker Chrome Extension

A browser extension that captures audio from web pages in real-time, sends it to your fact-checking AI API, and displays the results in a non-intrusive overlay.

## Features

- **Real-time Audio Capture**: Automatically captures audio from any media element (video or audio) playing on web pages
- **Chunking Strategy**: Processes audio in 5-second chunks for efficient analysis
- **API Integration**: Sends audio data to your backend AI service for fact-checking
- **Non-intrusive UI**: Displays fact-check results in a clean overlay
- **Confidence Indicators**: Color-coded confidence levels for fact-check results

## Screenshots

![Extension Popup](docs/screenshots/popup.png)
![Fact-Check Overlay](docs/screenshots/overlay.png)

## Installation

### From Source

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/audio-fact-checker.git
   cd audio-fact-checker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure the API endpoint:
   - Open `src/background/index.ts`
   - Update the `API_ENDPOINT` variable with your server URL
   - If your API requires authentication, update the `API_KEY` value

4. Build the extension:
   ```
   npm run build
   ```

5. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the `dist` folder from this project

### Development

Run the following command for development with hot-reloading:
```
npm run dev
```

## Usage

1. Click the extension icon in your Chrome toolbar
2. Click "Start Fact Checking" to begin analyzing audio
3. Listen to content on websites (YouTube, podcasts, news sites, etc.)
4. Fact-check results will appear in a non-intrusive overlay
5. Click "Stop Fact Checking" to disable the extension

## API Integration

The extension sends audio data to your server in the following format:

```json
{
  "audio": "base64EncodedAudioData",
  "format": "base64"
}
```

Your server should respond with:

```json
{
  "summary": "Brief summary of fact check",
  "confidenceLevel": "high|medium|low",
  "claims": [
    {
      "text": "The claim statement",
      "isFact": true|false,
      "confidence": 0.95
    }
  ]
}
```

## Server Setup

You need a server running at the endpoint specified in `src/background/index.ts`. The default is `http://0.0.0.0:8000/api/fact-check`.

The server should:
1. Accept POST requests with JSON containing base64-encoded audio
2. Process the audio to identify claims
3. Verify the claims against known facts
4. Return results in the format described above

## Technical Details

- Built with TypeScript, React, and the Chrome Extension API
- Uses Web Audio API for capturing audio streams
- Implements the ScriptProcessor interface for audio processing
- Real-time data transmission with minimal latency

## Project Structure

```
/
├── src/
│   ├── background/     # Background scripts
│   ├── content/        # Content scripts
│   ├── popup/          # Popup UI components
│   ├── types/          # TypeScript declarations
│   └── icons/          # Extension icons
├── dist/               # Built extension
├── webpack.config.js   # Webpack configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## Security and Privacy

- Audio data is processed locally before being sent to the server
- Only audio data is transmitted, not personal information
- No audio is stored after processing
- All communication with the API is done securely

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- This project was inspired by the need for real-time fact checking in the era of misinformation
- Thanks to all contributors who have helped shape this project 