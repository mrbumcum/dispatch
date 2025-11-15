# AI Chat Interface with Gemini API

A modern, beautiful chat interface powered by Google's Gemini AI.

## Features

- Clean, modern UI with gradient design
- Responsive layout that works on desktop and mobile
- Smooth animations and transitions
- Auto-scrolling chat messages
- Typing indicator for AI responses
- Enter key to send messages
- Conversation history for context-aware responses
- Powered by Google Gemini Pro API
- Accessible and user-friendly

## Getting Started

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or use an existing key
4. Copy your API key

### 2. Configure the API Key

1. Copy the example config file:
   ```bash
   cp config.example.js config.js
   ```

2. Open `config.js` and replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key:
   ```javascript
   const CONFIG = {
       GEMINI_API_KEY: 'your-actual-api-key-here'
   };
   ```

   ⚠️ **Note**: The `config.js` file is gitignored and will not be committed to version control.

### 3. Run the Application

1. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

3. Start chatting! Type a message and press Enter or click the send button.

## How It Works

- The chat interface maintains conversation history for context-aware responses
- Messages are sent to the Gemini Pro API via REST API
- The conversation history is limited to the last 20 messages to manage token usage
- Error handling provides helpful messages if the API key is missing or if there are API errors

## Customization

### Styling

Modify `styles.css` to customize colors, fonts, and layout to match your brand.

### API Model

To use a different Gemini model, modify the `GEMINI_API_URL` in `script.js`:

```javascript
// Example: Use gemini-pro-vision for image support
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`;
```

## Browser Support

Works on all modern browsers (Chrome, Firefox, Safari, Edge).

## Security Note

⚠️ **Important**: Never commit your API key to version control. Consider using environment variables or a backend proxy for production applications.

