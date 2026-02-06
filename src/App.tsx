import { useEffect, useState, useCallback, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import './App.css';

// Config from env
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://retell-frontend.onrender.com';
const AGENT_ID = import.meta.env.VITE_AGENT_ID || '';

interface RegisterCallResponse {
  access_token: string;
}

type CallStatus = 'idle' | 'connecting' | 'connected' | 'error';
type TalkMode = 'continuous' | 'push-to-talk';

const retellClient = new RetellWebClient();

function App() {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [talkMode, setTalkMode] = useState<TalkMode>('continuous');
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Retell event handlers
  useEffect(() => {
    retellClient.on('call_started', () => {
      console.log('Call started');
      setStatus('connected');
      setError(null);
    });

    retellClient.on('call_ended', () => {
      console.log('Call ended');
      setStatus('idle');
      setIsAgentSpeaking(false);
      setIsUserSpeaking(false);
      setIsMuted(false);
    });

    retellClient.on('agent_start_talking', () => {
      setIsAgentSpeaking(true);
    });

    retellClient.on('agent_stop_talking', () => {
      setIsAgentSpeaking(false);
    });

    retellClient.on('error', (err) => {
      console.error('Retell error:', err);
      setError('Connection error. Please try again.');
      setStatus('error');
    });

    retellClient.on('audio', (audio: Float32Array) => {
      // Calculate audio level for visualization
      const sum = audio.reduce((acc, val) => acc + Math.abs(val), 0);
      const avg = sum / audio.length;
      setAudioLevel(Math.min(avg * 10, 1));
    });

    return () => {
      if (status === 'connected') {
        retellClient.stopCall();
      }
    };
  }, []);

  // Register call with backend
  const registerCall = async (): Promise<RegisterCallResponse> => {
    const response = await fetch(`${BACKEND_URL}/create-web-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: AGENT_ID }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to register call: ${response.status}`);
    }
    
    return response.json();
  };

  // Request microphone permission explicitly (needed for iOS)
  const requestMicPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed to trigger the permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      return false;
    }
  };

  // Start call
  const startCall = async () => {
    try {
      setStatus('connecting');
      setError(null);
      
      // Request mic permission first (iOS requires this)
      const hasPermission = await requestMicPermission();
      if (!hasPermission) {
        setError('Microphone access denied. Please allow microphone in your browser settings.');
        setStatus('error');
        return;
      }
      
      const { access_token } = await registerCall();
      
      await retellClient.startCall({
        accessToken: access_token,
        emitRawAudioSamples: true,
      });
    } catch (err) {
      console.error('Failed to start call:', err);
      setError('Failed to connect. Check your microphone permissions.');
      setStatus('error');
    }
  };

  // Stop call
  const stopCall = () => {
    retellClient.stopCall();
    setStatus('idle');
  };

  // Toggle mute
  const toggleMute = () => {
    if (isMuted) {
      retellClient.unmute();
      setIsMuted(false);
    } else {
      retellClient.mute();
      setIsMuted(true);
    }
  };

  // Push-to-talk handlers
  const handlePTTStart = useCallback(() => {
    if (status !== 'connected' || talkMode !== 'push-to-talk') return;
    setIsPTTActive(true);
    retellClient.unmute();
  }, [status, talkMode]);

  const handlePTTEnd = useCallback(() => {
    if (talkMode !== 'push-to-talk') return;
    setIsPTTActive(false);
    retellClient.mute();
  }, [talkMode]);

  // Switch talk mode
  const switchMode = (mode: TalkMode) => {
    setTalkMode(mode);
    if (status === 'connected') {
      if (mode === 'push-to-talk') {
        retellClient.mute();
        setIsMuted(true);
      } else {
        retellClient.unmute();
        setIsMuted(false);
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && talkMode === 'push-to-talk' && status === 'connected') {
        e.preventDefault();
        handlePTTStart();
      }
      if (e.code === 'KeyM' && status === 'connected') {
        e.preventDefault();
        toggleMute();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && talkMode === 'push-to-talk') {
        e.preventDefault();
        handlePTTEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [talkMode, status, handlePTTStart, handlePTTEnd]);

  // Status text
  const getStatusText = () => {
    switch (status) {
      case 'idle': return 'Tap to summon Ozzy';
      case 'connecting': return 'Summoning...';
      case 'connected':
        if (isAgentSpeaking) return 'Ozzy is speaking...';
        if (isPTTActive) return 'Listening...';
        if (isMuted) return 'Muted';
        return talkMode === 'push-to-talk' ? 'Hold to speak' : 'Listening...';
      case 'error': return error || 'Something went wrong';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 select-none">
      {/* Header */}
      <header className="w-full max-w-md text-center pt-8">
        <h1 className="text-4xl font-metal tracking-wider text-white mb-1">
          OZZY
        </h1>
        <p className="text-neutral-400 text-sm">Tristan's servant</p>
      </header>

      {/* Main Avatar/Button Area */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        {/* Avatar Circle */}
        <div className="relative mb-8">
          {/* Outer glow rings */}
          {status === 'connected' && (
            <>
              <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                isAgentSpeaking 
                  ? 'bg-purple-600/20 scale-150 animate-pulse' 
                  : isPTTActive || (!isMuted && talkMode === 'continuous')
                    ? 'bg-green-500/20 scale-130 animate-pulse'
                    : 'bg-neutral-800/20 scale-110'
              }`} style={{ filter: 'blur(30px)' }} />
              <div className="pulse-ring" />
            </>
          )}
          
          {/* Main button */}
          <button
            onClick={status === 'idle' || status === 'error' ? startCall : stopCall}
            onMouseDown={talkMode === 'push-to-talk' ? handlePTTStart : undefined}
            onMouseUp={talkMode === 'push-to-talk' ? handlePTTEnd : undefined}
            onMouseLeave={talkMode === 'push-to-talk' ? handlePTTEnd : undefined}
            onTouchStart={talkMode === 'push-to-talk' ? handlePTTStart : undefined}
            onTouchEnd={talkMode === 'push-to-talk' ? handlePTTEnd : undefined}
            className={`
              relative w-40 h-40 rounded-full glass
              flex items-center justify-center
              transition-all duration-300 transform
              ${status === 'connecting' ? 'animate-pulse scale-95' : ''}
              ${status === 'connected' && isAgentSpeaking ? 'ring-4 ring-purple-600/50' : ''}
              ${status === 'connected' && (isPTTActive || (!isMuted && talkMode === 'continuous' && !isAgentSpeaking)) ? 'ring-4 ring-green-500/50' : ''}
              ${status === 'error' ? 'ring-4 ring-red-600/50' : ''}
              hover:scale-105 active:scale-95
            `}
          >
            {/* Bat Icon */}
            <span className="text-6xl">🦇</span>
            
            {/* Audio level indicator */}
            {status === 'connected' && !isAgentSpeaking && audioLevel > 0.1 && (
              <div 
                className="absolute inset-0 rounded-full border-4 border-green-500/50 transition-transform"
                style={{ transform: `scale(${1 + audioLevel * 0.2})` }}
              />
            )}
          </button>
        </div>

        {/* Status Text */}
        <p className={`text-lg mb-8 transition-colors duration-300 ${
          status === 'error' ? 'text-red-600' : 
          status === 'connected' ? 'text-white' : 
          'text-neutral-400'
        }`}>
          {getStatusText()}
        </p>

        {/* Audio Waveform Visualization */}
        {status === 'connected' && (
          <div className="flex items-center justify-center gap-1 h-12 mb-8">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`wave-bar w-1 transition-all duration-100 ${
                  isAgentSpeaking ? 'bg-purple-600' : 'bg-green-500'
                }`}
                style={{
                  height: `${Math.max(8, (isAgentSpeaking || audioLevel > 0.1 ? 
                    (Math.sin(Date.now() / 100 + i) + 1) * 20 + audioLevel * 20 : 
                    8))}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Mode Toggle - Always visible */}
        <div className="glass p-1 flex gap-1 mb-6">
          <button
            onClick={() => switchMode('continuous')}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              talkMode === 'continuous' 
                ? 'bg-neutral-800 text-white' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            🔊 Continuous
          </button>
          <button
            onClick={() => switchMode('push-to-talk')}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              talkMode === 'push-to-talk' 
                ? 'bg-neutral-800 text-white' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            🎤 Push to Talk
          </button>
        </div>

        {/* Mute Button - visible during call in continuous mode */}
        {status === 'connected' && talkMode === 'continuous' && (
          <button
            onClick={toggleMute}
            className={`glass px-6 py-3 rounded-xl transition-all ${
              isMuted ? 'bg-red-600/20 text-red-600' : 'hover:bg-white/10'
            }`}
          >
            {isMuted ? '🔇 Unmute' : '🔊 Mute'}
          </button>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md text-center pb-6">
        <p className="text-neutral-400/50 text-xs">
          {talkMode === 'push-to-talk' && status === 'connected' && (
            <span>Space to talk • M to mute</span>
          )}
          {talkMode === 'continuous' && status === 'connected' && (
            <span>M to mute</span>
          )}
          {status === 'idle' && (
            <span>Powered by dark magic 🦇</span>
          )}
        </p>
      </footer>
    </div>
  );
}

export default App;
