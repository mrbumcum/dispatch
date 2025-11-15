const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate personality based on question prompt
async function generatePersonality(questionPrompt) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    console.log('[Gemini] Generating personality from prompt:', questionPrompt);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Based on the following scenario/question prompt, generate a detailed personality profile for a simulated patient. 
    The personality should include:
    - Emotional state
    - Communication style
    - Background context
    - Behavioral traits
    - Speaking patterns
    
    Question Prompt: ${questionPrompt}
    
    Respond with a concise personality profile in 2-3 sentences that can be used to guide conversational responses.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const personality = response.text();
    console.log(`[Gemini] Personality generated: "${personality}"`);
    return personality;
  } catch (error) {
    console.error('[Gemini] Personality generation error:', error);
    console.error('[Gemini] Error details:', {
      message: error.message,
      status: error.status,
      code: error.code
    });
    
    if (error.message.includes('API key') || error.message.includes('GEMINI_API_KEY')) {
      throw new Error('Gemini API key is missing or invalid.');
    }
    
    throw new Error(`Personality generation failed: ${error.message}`);
  }
}

// Generate script/response based on personality and user input
async function generateScript({ personality, userInput, conversationHistory = [], stream = false }) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    console.log('[Gemini] Generating script:', { 
      hasPersonality: !!personality, 
      userInput, 
      historyLength: conversationHistory.length,
      stream 
    });
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Build conversation context
    let contextPrompt = '';
    if (personality) {
      contextPrompt += `Personality: ${personality}\n\n`;
    }
    
    if (conversationHistory.length > 0) {
      contextPrompt += 'Previous conversation:\n';
      conversationHistory.slice(-5).forEach((msg, idx) => {
        contextPrompt += `User: ${msg.userInput}\n`;
        contextPrompt += `You: ${msg.script}\n\n`;
      });
    }
    
    contextPrompt += `Current user input: ${userInput}\n\n`;
    contextPrompt += `Generate a natural, conversational response that matches the personality. Keep it concise (1-2 sentences).`;

    if (stream) {
      console.log('[Gemini] Starting stream generation...');
      const result = await model.generateContentStream(contextPrompt);
      return result;
    } else {
      const result = await model.generateContent(contextPrompt);
      const response = await result.response;
      const script = response.text();
      console.log(`[Gemini] Script generated: "${script}"`);
      return script;
    }
  } catch (error) {
    console.error('[Gemini] Script generation error:', error);
    console.error('[Gemini] Error details:', {
      message: error.message,
      status: error.status,
      code: error.code
    });
    
    if (error.message.includes('API key') || error.message.includes('GEMINI_API_KEY')) {
      throw new Error('Gemini API key is missing or invalid.');
    }
    
    throw new Error(`Script generation failed: ${error.message}`);
  }
}

module.exports = { generatePersonality, generateScript };

