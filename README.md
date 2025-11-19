# **FieldReady**

FieldReady is an interactive EMT training platform designed to help trainees build real-world skills through realistic simulations, geographic learning tools, study aids, and communication practice. The system blends AI-powered patient interactions, dynamic map training, and customizable study modules into one cohesive training environment.

---

## **Inspiration**

EMTs must be prepared not only to assess and treat patients, but also to navigate their response areas quickly and accurately. Learning street names, building numbers, and dispatch communication is just as important as clinical skills. FieldReady was created to provide a comprehensive, hands-on environment that helps trainees practice all of these competencies—before ever stepping into the field.

---

## **What It Does**

FieldReady includes four core training modules:

### **1. Patient Simulation**

* Generates random EMT scenarios with realistic patient vitals.
* Trainees interact with AI-powered patients through **voice or text**.
* Ask assessment questions and receive natural, context-aware responses.
* AI dispatcher provides:

  * Feedback on assessment technique
  * Guidance through protocols (ABCDE, SAMPLE, vitals gathering, and more)
* Vital signs are dynamically generated based on the scenario.
* Voice synthesis provides lifelike dispatcher and patient dialogue.

## Design Architecture for Patient Situation

---

### **2. Response Area Quiz**

* Interactive map-based learning tool using **Leaflet.js**.
* Helps trainees memorize building locations, street names, and address layouts.
* Users identify buildings or locations on a map to reinforce response-area knowledge.

---

### **3. Flashcards**

* A customizable study system for:

  * EMT protocols
  * Medications and dosages
  * Contraindications
  * Vital sign ranges
* Trainees can build custom decks or review preloaded materials.

---

### **4. Radio Simulation** *(in development)*

* Provides practice with radio communication and dispatch procedures.
* Helps trainees learn the cadence, terminology, and clarity expectations of field dispatch.

---

## **How We Built It**

FieldReady is built using a modern, scalable, and modular stack:

### **Frontend**

* **React** + **TypeScript**
* **Tailwind CSS** for fast, responsive UI design
* Interactive mapping using **Leaflet.js**
* Real-time patient interaction UI with dynamic scenario rendering

### **Backend**

* **Express.js** API for scenario management, scoring, and module logic

### **AI & Voice Integration**

* **Google Gemini API** for:

  * Scenario generation
  * Line-by-line patient dialogue
  * Intelligent dispatcher feedback
* **ElevenLabs** for high-quality, adaptive patient and dispatcher voice synthesis

### **Mapping**

* Leaflet-based system that uses real building data
* Supports quizzes that reinforce geographic familiarity with response areas

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

