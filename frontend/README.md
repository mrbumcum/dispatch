# EMT Training Platform

A comprehensive EMT training platform featuring multiple simulation tools to help students practice and improve their emergency medical skills. The platform includes patient simulation, radio simulation, flashcards, and response area quizzes - all powered by AI.

## Features

### Patient Simulation
- 🎯 **Realistic Patient Scenarios**: AI-generated emergency scenarios with diverse patient presentations
- 🎤 **Voice Interaction**: Speak directly to patients using microphone input (Web Speech API)
- 🔊 **Text-to-Speech**: Patient and dispatcher responses with natural, emotional voices (ElevenLabs)
- 📋 **Dual AI System**: Patient AI simulates symptoms, Dispatcher AI provides feedback and guidance
- 🎨 **Modern UI/UX**: Beautiful visual and transcript views with real-time audio indicators
- 🎭 **Dynamic Voice Selection**: Patient voices adapt based on age and gender
- 📝 **Stage Directions**: Visual display of patient emotional cues and physical responses
- 💊 **Vital Signs Tracking**: Real-time vital signs panel that updates during assessment
- 🏥 **Intervention System**: Practice administering medications and treatments
- 📊 **Session Summary**: Review your performance with AI-generated grades and feedback
- ⏱️ **Timer**: Track response time for each scenario

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

# 3. Set up environment variables
copy .env.example .env
# Edit .env and add your real VITE_* keys

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
## Environment Setup

All client-side keys live in `frontend/.env` and use the `VITE_` prefix.

1. Copy template and fill values:
```
cp .env.example .env
```

2. Add your keys in `.env`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
VITE_ELEVENLABS_API_KEY=YOUR_ELEVENLABS_API_KEY
```

3. Access them in code via `import.meta.env`:
```
// src/supabase-client.ts
const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// src/config.ts
export const CONFIG = {
   GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY ?? "",
   ELEVENLABS_API_KEY: import.meta.env.VITE_ELEVENLABS_API_KEY ?? "",
}
```

Restart `vite` when `.env` changes.

### Step 4: Run the Development Server
This app uses React Router. For production on static hosts, enable SPA fallback (rewrite all routes to `index.html`). Vite dev server already handles this locally.
```bash
npm run dev
```

The terminal will display the local URL (typically `http://localhost:5173`). Open this URL in your browser.

### Step 5: Start Training!

1. From the home page, select **"Patient Simulation"**
2. Click the **"New Scenario"** button to start a training session
3. Wait for the dispatch sound effect (5 seconds), then listen to the dispatcher announcement
4. Listen to the patient's initial response
5. Click the **microphone button** to speak your assessment questions
6. Click the microphone again when finished speaking
7. The patient will respond both in text and audio
8. The dispatcher will provide feedback on your assessment
9. Ask to take vital signs to see patient measurements
10. Complete interventions when prompted
11. Click **"End Session"** to view your performance summary with grades and feedback

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
frontend/
├── public/                # Static assets
├── src/
│   ├── components/        # UI + shadcn primitives
│   ├── pages/             # Route pages (Home, PatientSimulation, etc.)
│   ├── contexts/          # App context (ThemeContext)
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities
│   ├── config.ts          # Reads VITE_* keys from `.env`
│   ├── supabase-client.ts # Supabase client
│   ├── App.tsx            # App shell + routing
│   └── main.tsx           # Entry
├── index.html
├── package.json
├── vite.config.ts
├── .env.example           # Template (commit)
└── .env                   # Secrets (gitignored)
```

## Technologies Used

- **Vite** - Fast build tool and dev server
- **React 18** - UI framework with React Router for navigation
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - High-quality React components
- **Google Gemini API** - AI for patient and dispatcher responses, grading, and feedback
- **ElevenLabs API** - Text-to-speech with natural voices
- **Web Speech API** - Browser-based speech recognition
- **React Router** - Client-side routing for multi-page navigation

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically try the next available port. Check your terminal for the actual URL.

### API Key Errors

- "API key is not configured": Ensure `.env` contains `VITE_GEMINI_API_KEY` and `VITE_ELEVENLABS_API_KEY`, and that Vite was restarted after changes.
- "401 Unauthorized": Keys are invalid or expired. Regenerate Gemini/ElevenLabs keys in provider dashboards.
- "Model not available": The requested AI model may have changed or is restricted. Check console logs and provider docs for available models.
- "ElevenLabs quota exceeded": Audio will be disabled when quota is exhausted. Check your ElevenLabs account credits.

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

- `.env` is gitignored and will NOT be committed
- Always use `frontend/.env.example` as the template for local setup
- Never share your API keys publicly
- For production deployments, consider using environment variables or a backend proxy to secure API keys

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues or questions, please open an issue on GitHub.
