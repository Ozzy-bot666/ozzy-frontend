import { useEffect, useState } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://retell-frontend.onrender.com';
const agentId = import.meta.env.VITE_AGENT_ID || '';

interface RegisterCallResponse {
  access_token: string;
}

const retellWebClient = new RetellWebClient();

function App() {
  const [isCalling, setIsCalling] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCheckingMic, setIsCheckingMic] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize the SDK - exact same as Henk
  useEffect(() => {
    retellWebClient.on('call_started', () => {
      console.log('call started');
      setHasError(false);
      setIsTransitioning(false);
      setIsCheckingMic(false);
    });

    retellWebClient.on('call_ended', () => {
      console.log('call ended');
      setIsCalling(false);
      setHasError(false);
      setIsTransitioning(false);
      setIsMuted(false);
    });

    retellWebClient.on('agent_start_talking', () => {
      console.log('agent_start_talking');
    });

    retellWebClient.on('agent_stop_talking', () => {
      console.log('agent_stop_talking');
    });

    retellWebClient.on('audio', () => {});
    retellWebClient.on('update', () => {});
    retellWebClient.on('metadata', () => {});

    retellWebClient.on('error', (error) => {
      console.error('An error occurred:', error);
      setHasError(true);
      retellWebClient.stopCall();
      setIsCalling(false);
      setIsTransitioning(false);
      setIsCheckingMic(false);
    });
  }, []);

  const [errorDetail, setErrorDetail] = useState<string>('');

  // Mic check with detailed error
  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorDetail('mediaDevices not supported');
        return false;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setErrorDetail('');
      return true;
    } catch (error: any) {
      const errorMsg = error?.name + ': ' + error?.message;
      console.error('Mic error:', errorMsg);
      setErrorDetail(errorMsg);
      return false;
    }
  };

  // Exact same toggle as Henk
  const toggleConversation = async () => {
    if (isTransitioning || isCheckingMic) return;

    if (isCalling) {
      setIsTransitioning(true);
      retellWebClient.stopCall();
    } else {
      try {
        setIsCheckingMic(true);
        const hasMicPermission = await checkMicrophonePermission();

        if (!hasMicPermission) {
          setHasError(true);
          setIsCheckingMic(false);
          return;
        }

        setIsTransitioning(true);
        setHasError(false);
        const registerCallResponse = await registerCall(agentId);
        if (registerCallResponse.access_token) {
          await retellWebClient.startCall({
            accessToken: registerCallResponse.access_token,
          });
          setIsCalling(true);
        }
      } catch (error) {
        console.error('Failed to start call:', error);
        setHasError(true);
        setIsTransitioning(false);
      }
      setIsCheckingMic(false);
    }
  };

  const toggleMute = () => {
    if (!isCalling) return;
    if (isMuted) {
      retellWebClient.unmute();
      setIsMuted(false);
    } else {
      retellWebClient.mute();
      setIsMuted(true);
    }
  };

  async function registerCall(agentId: string): Promise<RegisterCallResponse> {
    const response = await fetch(`${BACKEND_URL}/create-web-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    return response.json();
  }

  const getStatusText = () => {
    if (isCheckingMic) return 'Checking microphone...';
    if (isTransitioning) return 'Connecting...';
    if (hasError) return 'Microphone permission denied';
    if (isCalling) return 'Listening...';
    return 'Tap to summon Ozzy';
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">OZZY</h1>
        <p className="text-neutral-400 text-sm">Tristan's servant</p>
      </header>

      {/* Main Button */}
      <div className="relative mb-8">
        {isCalling && (
          <>
            <div className="absolute inset-0 rounded-full bg-green-500/20 scale-150 animate-pulse" style={{ filter: 'blur(30px)' }} />
            <div className="absolute inset-0 rounded-full border-2 border-green-500/30 scale-125 animate-ping" />
          </>
        )}
        
        <button
          onClick={toggleConversation}
          disabled={isTransitioning || isCheckingMic}
          className={`
            relative w-40 h-40 rounded-full
            bg-white/5 backdrop-blur-xl border border-white/10
            flex items-center justify-center
            transition-all duration-300 transform
            hover:scale-105 active:scale-95
            disabled:opacity-50 disabled:cursor-wait
            ${hasError ? 'ring-4 ring-red-500/50' : ''}
            ${isCalling ? 'ring-4 ring-green-500/50' : ''}
          `}
        >
          <span className="text-6xl">{isCheckingMic || isTransitioning ? '⏳' : '🦇'}</span>
        </button>
      </div>

      {/* Status */}
      <p className={`text-lg mb-4 ${hasError ? 'text-red-400' : 'text-neutral-400'}`}>
        {getStatusText()}
      </p>
      
      {/* Error detail for debugging */}
      {errorDetail && (
        <p className="text-xs text-red-300 mb-4 max-w-xs text-center break-all">
          {errorDetail}
        </p>
      )}

      {/* Mute button during call */}
      {isCalling && (
        <button
          onClick={toggleMute}
          className={`px-6 py-3 rounded-xl transition-all ${
            isMuted 
              ? 'bg-red-600/20 text-red-400 border border-red-600/30' 
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
        >
          {isMuted ? '🔇 Unmute' : '🔊 Mute'}
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
