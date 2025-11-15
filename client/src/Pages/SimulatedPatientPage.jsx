import { useState, useRef, useEffect } from 'react';
import '../styles/SimulatedPatientPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function SimulatedPatientPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [response, setResponse] = useState('');
  const [responseAudio, setResponseAudio] = useState(null);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [error, setError] = useState(null);
  const [processingStep, setProcessingStep] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  // Initialize MediaRecorder
  useEffect(() => {
    return () => {
      // Cleanup: stop recording if component unmounts
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      console.log('[Frontend] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Frontend] Microphone access granted');
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log(`[Frontend] Audio chunk received: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('[Frontend] MediaRecorder error:', event.error);
        setError(`Recording error: ${event.error?.message || 'Unknown error'}`);
        setIsRecording(false);
      };

      mediaRecorder.onstop = async () => {
        console.log('[Frontend] Recording stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log(`[Frontend] Audio blob size: ${audioBlob.size} bytes`);
        await processAudio(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      console.log('[Frontend] Recording started');
    } catch (error) {
      console.error('[Frontend] Error accessing microphone:', error);
      const errorMsg = error.name === 'NotAllowedError' 
        ? 'Microphone access denied. Please allow microphone access and try again.'
        : error.name === 'NotFoundError'
        ? 'No microphone found. Please connect a microphone and try again.'
        : `Error accessing microphone: ${error.message}`;
      setError(errorMsg);
      alert(errorMsg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    setError(null);
    setTranscription('');
    setResponse('');
    setResponseAudio(null);
    setProcessingStep('Preparing audio...');

    try {
      // Validate audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('No audio data recorded. Please try recording again.');
      }
      console.log(`[Frontend] Processing audio: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

      // Create FormData
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('sessionId', sessionId);
      if (questionPrompt) {
        formData.append('questionPrompt', questionPrompt);
      }
      console.log('[Frontend] Sending audio to backend...', { sessionId, hasPrompt: !!questionPrompt });

      // Option 1: Get text response stream
      setProcessingStep('Transcribing audio...');
      console.log(`[Frontend] Calling ${API_BASE_URL}/api/voice/stream-response`);
      
      const textResponse = await fetch(`${API_BASE_URL}/api/voice/stream-response`, {
        method: 'POST',
        body: formData,
      });

      console.log('[Frontend] Text response status:', textResponse.status, textResponse.statusText);

      if (!textResponse.ok) {
        const errorData = await textResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || `Server error: ${textResponse.status}`);
      }

      setProcessingStep('Generating response...');
      // Read SSE stream
      const reader = textResponse.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullText += data.text;
                setResponse(fullText);
              }
              if (data.done) {
                break;
              }
            } catch (parseError) {
              console.warn('[Frontend] Failed to parse SSE data:', parseError);
            }
          }
        }
      }

      console.log('[Frontend] Received text response:', fullText);

      // Option 2: Get audio response
      setProcessingStep('Generating voice...');
      console.log(`[Frontend] Calling ${API_BASE_URL}/api/voice/process`);
      
      const audioResponse = await fetch(`${API_BASE_URL}/api/voice/process`, {
        method: 'POST',
        body: formData,
      });

      console.log('[Frontend] Audio response status:', audioResponse.status, audioResponse.statusText);

      if (audioResponse.ok) {
        const audioBlobResponse = await audioResponse.blob();
        console.log(`[Frontend] Received audio: ${audioBlobResponse.size} bytes, type: ${audioBlobResponse.type}`);
        const audioUrl = URL.createObjectURL(audioBlobResponse);
        setResponseAudio(audioUrl);

        // Auto-play audio
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch(err => {
            console.error('[Frontend] Error playing audio:', err);
            setError(`Audio playback error: ${err.message}`);
          });
        }
      } else {
        const errorData = await audioResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Frontend] Audio generation failed:', errorData);
        setError(`Audio generation failed: ${errorData.error || errorData.details || 'Unknown error'}`);
      }

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { userInput: transcription || 'Audio input', response: fullText, timestamp: new Date() }
      ]);

      setProcessingStep('');
      console.log('[Frontend] Audio processing completed successfully');

    } catch (error) {
      console.error('[Frontend] Error processing audio:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      setError(`Error: ${errorMessage}`);
      setProcessingStep('');
      alert(`Error processing audio: ${errorMessage}\n\nCheck the browser console for more details.`);
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="simulated-patient-page">
      <div className="container">
        <h1>Simulated Patient</h1>
        
        <div className="question-prompt-section">
          <label htmlFor="questionPrompt">Question Prompt (Optional):</label>
          <textarea
            id="questionPrompt"
            value={questionPrompt}
            onChange={(e) => setQuestionPrompt(e.target.value)}
            placeholder="Enter a scenario or question prompt to generate a personality..."
            rows="3"
          />
        </div>

        <div className="recording-section">
          <div className="recording-controls">
            {!isRecording ? (
              <button 
                onClick={startRecording} 
                className="record-button"
                disabled={isProcessing}
              >
                🎤 Start Recording
              </button>
            ) : (
              <button 
                onClick={stopRecording} 
                className="stop-button"
              >
                ⏹️ Stop Recording
              </button>
            )}
          </div>

          <div className="status-indicator">
            {isRecording && <span className="recording-dot">●</span>}
            {isRecording && <span>Recording...</span>}
            {isProcessing && <span>{processingStep || 'Processing...'}</span>}
          </div>
          
          {error && (
            <div className="error-section">
              <h3>Error:</h3>
              <p>{error}</p>
              <button onClick={() => setError(null)} className="dismiss-error">Dismiss</button>
            </div>
          )}
        </div>

        {transcription && (
          <div className="transcription-section">
            <h3>Transcription:</h3>
            <p>{transcription}</p>
          </div>
        )}

        {response && (
          <div className="response-section">
            <h3>Response:</h3>
            <p>{response}</p>
          </div>
        )}

        {responseAudio && (
          <div className="audio-section">
            <h3>Audio Response:</h3>
            <audio ref={audioRef} controls autoPlay>
              <source src={responseAudio} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {conversationHistory.length > 0 && (
          <div className="conversation-history">
            <h3>Conversation History:</h3>
            <div className="history-list">
              {conversationHistory.map((item, idx) => (
                <div key={idx} className="history-item">
                  <div className="user-message">
                    <strong>You:</strong> {item.userInput}
                  </div>
                  <div className="ai-message">
                    <strong>Patient:</strong> {item.response}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimulatedPatientPage;
