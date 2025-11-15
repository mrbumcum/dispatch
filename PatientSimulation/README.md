# EMT Patient Simulation Training Platform

An interactive EMT training simulation where students practice patient assessment skills through realistic scenarios powered by AI. The platform features voice interaction, realistic patient responses, and dispatcher feedback.

## Features

- 🎯 **Realistic Patient Scenarios**: AI-generated emergency scenarios with diverse patient presentations
- 🎤 **Voice Interaction**: Speak directly to patients using microphone input (Web Speech API)
- 🔊 **Text-to-Speech**: Patient and dispatcher responses with natural, emotional voices (ElevenLabs)
- 📋 **Dual AI System**: Patient AI simulates symptoms, Dispatcher AI provides feedback and guidance
- 🎨 **Modern UI/UX**: Beautiful visual and transcript views with real-time audio indicators
- 🎭 **Dynamic Voice Selection**: Patient voices adapt based on age and gender
- 📝 **Stage Directions**: Visual display of patient emotional cues and physical responses

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)

## Quick Start (Copy & Paste)

Run these commands in your terminal to get started from scratch:

```bash
# 1. Navigate to the PatientSimulation directory
cd PatientSimulation

# 2. Install dependencies
npm install

# 3. Set up API keys (see API Configuration section below)
cp src/config.example.ts src/config.ts

# 4. Edit src/config.ts and add your API keys
# (Open the file in your editor and replace the placeholder values)

# 5. Start the development server
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in your terminal).

## Detailed Setup Instructions

### Step 1: Clone the Repository

If you haven't already cloned the repository:

```bash
git clone <YOUR_GIT_URL>
cd dispatch/PatientSimulation
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React & React DOM
- Vite (build tool)
- TypeScript
- Tailwind CSS
- Shadcn UI components
- And more...

### Step 3: Configure API Keys

You'll need API keys from two services:

#### Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or use an existing key
4. Copy your API key

#### Get ElevenLabs API Key

1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up or log in
3. Navigate to your profile/settings
4. Copy your API key

#### Configure the Keys

1. Copy the example config file:
   ```bash
   cp src/config.example.ts src/config.ts
   ```

2. Open `src/config.ts` in your editor and replace the placeholders:
   ```typescript
   export const CONFIG = {
     GEMINI_API_KEY: 'your-actual-gemini-api-key-here',
     ELEVENLABS_API_KEY: 'your-actual-elevenlabs-api-key-here'
   };
   ```

   ⚠️ **Important**: The `src/config.ts` file is gitignored and will NOT be committed to version control. Never share your API keys publicly.

### Step 4: Run the Development Server

```bash
npm run dev
```

The terminal will display the local URL (typically `http://localhost:5173`). Open this URL in your browser.

### Step 5: Start Training!

1. Click the **"New Scenario"** button to start a training session
2. Wait for the dispatch sound and dispatcher announcement
3. Listen to the patient's initial response
4. Click the **microphone button** to speak your assessment questions
5. Click the microphone again when finished speaking
6. The patient will respond both in text and audio
7. The dispatcher will provide feedback on your assessment

## Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint
```

## Project Structure

```
PatientSimulation/
├── public/              # Static assets (audio files, favicon)
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # Shadcn UI components
│   │   ├── VisualView.tsx
│   │   ├── TranscriptView.tsx
│   │   └── ...
│   ├── pages/          # Page components
│   │   └── Index.tsx   # Main simulation page
│   ├── config.ts       # API keys (gitignored)
│   ├── config.example.ts  # Config template
│   └── ...
├── package.json
└── README.md
```

## Technologies Used

- **Vite** - Fast build tool and dev server
- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - High-quality React components
- **Google Gemini API** - AI for patient and dispatcher responses
- **ElevenLabs API** - Text-to-speech with natural voices
- **Web Speech API** - Browser-based speech recognition

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically try the next available port. Check your terminal for the actual URL.

### API Key Errors

- **"API key is not configured"**: Make sure `src/config.ts` exists and contains valid API keys
- **"401 Unauthorized"**: Your API key is invalid or expired. Get a new key from the provider
- **"Model not available"**: The API model might have changed. Check the console for available models

### Microphone Not Working

- Ensure your browser has microphone permissions
- Use Chrome or Edge for best Web Speech API support
- Check browser console for permission errors
- Some browsers require HTTPS for microphone access (use `npm run dev` which provides local HTTPS)

### Audio Not Playing

- Check browser console for errors
- Ensure ElevenLabs API key is valid and has credits
- Verify your browser allows autoplay (some browsers block autoplay by default)

## Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (may require user interaction for audio)

## Security Notes

⚠️ **Never commit API keys to version control!**

- `src/config.ts` is already in `.gitignore`
- Always use `src/config.example.ts` as a template
- For production, consider using environment variables or a backend proxy

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add your license here]

## Support

For issues or questions, please open an issue on GitHub.
