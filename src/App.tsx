import { useEffect, useState } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import './App.css';

// Config from env
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://retell-frontend.onrender.com';
const AGENT_ID = import.meta.env.VITE_AGENT_ID || '';

interface RegisterCallResponse {
  access_token: string;
}

const retellWebClient = new RetellWebClient();

function App() {
  const [isCalling, setIsCalling] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the SDK
  useEffect(() => {
    retellWebClient.on('call_started', () => {
      console.log('Call started');
      setError(null);
    });

    retellWebClient.on('call_ended', () => {
      console.log('Call ended');
      setIsCalling(false);
      setIsAgentSpeaking(false);
    });

    retellWebClient.on('agent_start_talking', () => {
      console.log('Agent speaking');
      setIsAgentSpeaking(true);
    });

    retellWebClient.on('agent_stop_talking', () => {
      console.log('Agent stopped');
      setIsAgentSpeaking(false);
    });

    retellWebClient.on('error', (error) => {
      console.error('Retell error:', error);
      setError('Connection error. Please try again.');
      retellWebClient.stopCall();
      setIsCalling(false);
    });
  }, []);

  const toggleConversation = async () => {
    if (isCalling) {
      retellWebClient.stopCall();
    } else {
      setError(null);
      try {
        const registerCallResponse = await registerCall(AGENT_ID);
        if (registerCallResponse.access_token) {
          await retellWebClient.startCall({
            accessToken: registerCallResponse.access_token,
          });
          setIsCalling(true);
        }
      } catch (err) {
        console.error('Failed to start call:', err);
        setError('Failed to connect. Check microphone permissions.');
      }
    }
  };

  async function registerCall(agentId: string): Promise<RegisterCallResponse> {
    const response = await fetch(`${BACKEND_URL}/create-web-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent_id: agentId }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return response.json();
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">OZZY</h1>
        <p className="text-neutral-400 text-sm">Tristan's servant</p>
      </header>

      {/* Main Button */}
      <div className="relative mb-8">
        {/* Glow effect when speaking */}
        {isCalling && (
          <div 
            className={`absolute inset-0 rounded-full transition-all duration-500 ${
              isAgentSpeaking 
                ? 'bg-purple-600/30 scale-150' 
                : 'bg-green-500/20 scale-125'
            }`} 
            style={{ filter: 'blur(30px)' }} 
          />
        )}
        
        <button
          onClick={toggleConversation}
          className={`
            relative w-40 h-40 rounded-full
            bg-white/5 backdrop-blur-xl border border-white/10
            flex items-center justify-center
            transition-all duration-300 transform
            hover:scale-105 active:scale-95
            ${isCalling && isAgentSpeaking ? 'ring-4 ring-purple-600/50' : ''}
            ${isCalling && !isAgentSpeaking ? 'ring-4 ring-green-500/50' : ''}
          `}
        >
          <span className="text-6xl">🦇</span>
        </button>
      </div>

      {/* Status */}
      <p className={`text-lg mb-4 ${error ? 'text-red-500' : 'text-neutral-400'}`}>
        {error || (isCalling 
          ? (isAgentSpeaking ? 'Ozzy is speaking...' : 'Listening...') 
          : 'Tap to summon Ozzy')}
      </p>

      {/* Stop button when calling */}
      {isCalling && (
        <button
          onClick={toggleConversation}
          className="px-6 py-3 rounded-xl bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 transition-all"
        >
          End Call
        </button>
      )}

      {/* Footer */}
      <footer className="absolute bottom-6 text-center">
        <p className="text-neutral-500 text-xs">Powered by dark magic 🦇</p>
      </footer>
    </div>
  );
}

export default App;
