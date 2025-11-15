// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// Gemini API Configuration
// API key is loaded from config.js (which is gitignored)
const GEMINI_API_KEY = CONFIG?.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
// Using v1 API (stable) with supported models
// Available models for your API key: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash, etc.
const GEMINI_MODEL = 'gemini-2.5-flash'; // Fast model - change to 'gemini-2.5-pro' for better quality
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Helper function to list available models (for debugging)
async function listAvailableModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`);
        const data = await response.json();
        console.log('Available models:', data);
        return data;
    } catch (error) {
        console.error('Error listing models:', error);
        return null;
    }
}

// Conversation history for context
let conversationHistory = [];

// Initialize
messageInput.focus();

// Function to format text with markdown-like formatting
function formatMessage(text) {
    if (!text) return '';
    
    // Split by lines for better processing
    const lines = text.split('\n');
    const formattedLines = [];
    let inCodeBlock = false;
    let codeBlockContent = [];
    let inList = false;
    let listItems = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Handle code blocks
        if (line.trim().startsWith('```')) {
            if (inCodeBlock) {
                // End code block
                formattedLines.push(`<pre><code>${codeBlockContent.join('\n')}</code></pre>`);
                codeBlockContent = [];
                inCodeBlock = false;
            } else {
                // Start code block
                if (codeBlockContent.length > 0) {
                    formattedLines.push(`<pre><code>${codeBlockContent.join('\n')}</code></pre>`);
                    codeBlockContent = [];
                }
                inCodeBlock = true;
            }
            continue;
        }
        
        if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
        }
        
        // Handle headers
        if (line.match(/^###\s+(.+)$/)) {
            formattedLines.push(`<h3>${line.replace(/^###\s+/, '')}</h3>`);
            continue;
        }
        if (line.match(/^##\s+(.+)$/)) {
            formattedLines.push(`<h2>${line.replace(/^##\s+/, '')}</h2>`);
            continue;
        }
        if (line.match(/^#\s+(.+)$/)) {
            formattedLines.push(`<h1>${line.replace(/^#\s+/, '')}</h1>`);
            continue;
        }
        
        // Handle lists
        const listMatch = line.match(/^[\-\*]\s+(.+)$/) || line.match(/^\d+\.\s+(.+)$/);
        if (listMatch) {
            if (!inList) {
                inList = true;
                listItems = [];
            }
            listItems.push(`<li>${formatInlineMarkdown(listMatch[1])}</li>`);
            continue;
        } else {
            if (inList && listItems.length > 0) {
                formattedLines.push(`<ul>${listItems.join('')}</ul>`);
                listItems = [];
                inList = false;
            }
        }
        
        // Handle regular lines
        if (line.trim() === '') {
            formattedLines.push('<br>');
        } else {
            formattedLines.push(`<p>${formatInlineMarkdown(line)}</p>`);
        }
    }
    
    // Close any open code block or list
    if (inCodeBlock && codeBlockContent.length > 0) {
        formattedLines.push(`<pre><code>${codeBlockContent.join('\n')}</code></pre>`);
    }
    if (inList && listItems.length > 0) {
        formattedLines.push(`<ul>${listItems.join('')}</ul>`);
    }
    
    return formattedLines.join('');
}

// Function to format inline markdown (bold, italic, code)
function formatInlineMarkdown(text) {
    // Escape HTML
    let formatted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Inline code (backticks) - process first to avoid conflicts
    formatted = formatted.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    
    // Bold (**text** or __text__) - process before italic
    formatted = formatted.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic (*text* or _text_) - match single asterisk/underscore that's not part of bold
    // Use a simple approach: match *text* that doesn't have ** before or after
    formatted = formatted.replace(/\b\*([^*\n]+?)\*\b/g, '<em>$1</em>');
    formatted = formatted.replace(/\b_([^_\n]+?)_\b/g, '<em>$1</em>');
    
    return formatted;
}

// Function to add a message to the chat
function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // For AI messages, format with markdown; for user messages, keep plain text
    if (isUser) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        contentDiv.appendChild(paragraph);
    } else {
        // Format AI responses with markdown
        contentDiv.innerHTML = formatMessage(text);
    }
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    scrollToBottom();
}

// Function to show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = 'typingIndicator';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const span = document.createElement('span');
        contentDiv.appendChild(span);
    }
    
    typingDiv.appendChild(contentDiv);
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

// Function to remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Function to scroll to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to get AI response from Gemini API
async function getAIResponse(userMessage) {
    // Check if API key is set
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        throw new Error('Please set your Gemini API key in config.js');
    }
    
    // Add user message to conversation history
    conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });
    
    // Prepare the request payload
    const requestBody = {
        contents: conversationHistory
    };
    
    // Make API call to Gemini
    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;
        
        // If model not found, list available models
        if (errorMessage.includes('not found') || errorMessage.includes('not supported')) {
            console.error('Model not found. Listing available models...');
            const models = await listAvailableModels();
            if (models && models.models) {
                const availableModels = models.models
                    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                    .map(m => m.name.replace('models/', ''));
                console.log('Available models that support generateContent:', availableModels);
                errorMessage += `. Available models: ${availableModels.join(', ')}. Check console for full list.`;
            } else {
                errorMessage += `. Try changing GEMINI_MODEL in script.js to: 'gemini-pro', 'gemini-1.5-pro', or 'gemini-1.5-flash'`;
            }
        }
        
        throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Extract the AI response text
    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                          'I apologize, but I could not generate a response.';
    
    // Add AI response to conversation history
    conversationHistory.push({
        role: 'model',
        parts: [{ text: aiResponseText }]
    });
    
    // Keep conversation history manageable (last 20 messages)
    if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
    }
    
    return aiResponseText;
}

// Function to handle sending a message
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // Add user message
    addMessage(message, true);
    
    // Clear input
    messageInput.value = '';
    messageInput.focus();
    
    // Disable input while waiting for response
    messageInput.disabled = true;
    sendButton.disabled = true;
    
    // Show typing indicator
    showTypingIndicator();
    
    // Get AI response
    try {
        const aiResponse = await getAIResponse(message);
        removeTypingIndicator();
        addMessage(aiResponse, false);
    } catch (error) {
        removeTypingIndicator();
        const errorMessage = error.message.includes('API key') 
            ? "Please set your Gemini API key in config.js" 
            : `Error: ${error.message}`;
        addMessage(errorMessage, false);
        console.error('Error getting AI response:', error);
    } finally {
        // Re-enable input
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// Event listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize input (optional enhancement)
messageInput.addEventListener('input', () => {
    // Keep input single line for now, but can be enhanced for multi-line
});

