import { useState, useEffect, useRef } from 'react';
import '../styles/TempPage.css';

// API Configuration - can be moved to environment variables or config file
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function TempPage() {
  const [messages, setMessages] = useState([
    { text: 'Hello! How can I help you today?', isUser: false }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper function to format text with markdown-like formatting
  const formatMessage = (text) => {
    if (!text) return '';
    
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
          formattedLines.push(`<pre><code>${codeBlockContent.join('\n')}</code></pre>`);
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
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
  };

  // Function to format inline markdown (bold, italic, code)
  const formatInlineMarkdown = (text) => {
    let formatted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    formatted = formatted.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    formatted = formatted.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\b\*([^*\n]+?)\*\b/g, '<em>$1</em>');
    formatted = formatted.replace(/\b_([^_\n]+?)_\b/g, '<em>$1</em>');
    return formatted;
  };

  // Function to get AI response from Gemini API
  const getAIResponse = async (userMessage) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error('Please set your Gemini API key in environment variables (VITE_GEMINI_API_KEY)');
    }
    
    const updatedHistory = [
      ...conversationHistory,
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ];
    
    const requestBody = {
      contents: updatedHistory
    };
    
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                          'I apologize, but I could not generate a response.';
    
    const newHistory = [
      ...updatedHistory,
      {
        role: 'model',
        parts: [{ text: aiResponseText }]
      }
    ];
    
    // Keep conversation history manageable (last 20 messages)
    const trimmedHistory = newHistory.length > 20 ? newHistory.slice(-20) : newHistory;
    setConversationHistory(trimmedHistory);
    
    return aiResponseText;
  };

  // Function to handle sending a message
  const sendMessage = async () => {
    const message = inputValue.trim();
    
    if (!message || isLoading) {
      return;
    }
    
    // Add user message
    setMessages(prev => [...prev, { text: message, isUser: true }]);
    setInputValue('');
    
    // Disable input while waiting for response
    setIsLoading(true);
    
    // Get AI response
    try {
      const aiResponse = await getAIResponse(message);
      setMessages(prev => [...prev, { text: aiResponse, isUser: false }]);
    } catch (error) {
      const errorMessage = error.message.includes('API key') 
        ? "Please set your Gemini API key in environment variables (VITE_GEMINI_API_KEY)" 
        : `Error: ${error.message}`;
      setMessages(prev => [...prev, { text: errorMessage, isUser: false }]);
      console.error('Error getting AI response:', error);
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="temp-page">
      <div className="chat-container">
        <div className="chat-header">
          <h1>AI Assistant</h1>
        </div>
        
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.isUser ? 'user-message' : 'ai-message'}`}>
              <div className="message-content">
                {message.isUser ? (
                  <p>{message.text}</p>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }} />
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message ai-message">
              <div className="message-content typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="chat-input-container">
          <div className="input-wrapper">
            <input 
              type="text" 
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="chat-input" 
              placeholder="Type your message here..."
              disabled={isLoading}
              autoComplete="off"
            />
            <button 
              onClick={sendMessage}
              className="send-button"
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TempPage;

