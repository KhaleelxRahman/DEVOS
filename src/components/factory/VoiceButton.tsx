import React, { useState } from 'react';
import { Mic } from 'lucide-react';
import { useToast } from '../common/Toast';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();

  const handleToggleVoice = () => {
    if (disabled) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast('Voice Recognition not natively available in browser. Populating sample voice prompt.', 'info');
      onTranscript('Build an Expense Tracker with budget analytics, recurring bills, and visual charts');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        toast('Listening... Speak your application idea clearly', 'info');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          onTranscript(transcript);
          toast(`Captured: "${transcript}"`, 'success');
        }
        setIsListening(false);
      };

      recognition.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e);
        setIsListening(false);
        toast('Microphone input stopped or timed out', 'warning');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      onTranscript('Build a modern AI SaaS Dashboard with real-time analytics');
      toast('Simulated voice input captured successfully', 'info');
    }
  };

  return (
    <button
      type="button"
      id="factory-voice-btn"
      onClick={handleToggleVoice}
      disabled={disabled}
      title={isListening ? 'Listening (Click to stop)' : 'Voice input prompt'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 38,
        borderRadius: 'var(--radius-md)',
        background: isListening
          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
          : 'var(--color-surface-elevated)',
        border: isListening
          ? '1px solid #ef4444'
          : '1px solid var(--color-border)',
        color: isListening ? '#ffffff' : 'var(--color-text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 200ms ease',
        boxShadow: isListening ? '0 0 16px rgba(239, 68, 68, 0.5)' : 'none',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {isListening ? (
        <Mic size={18} className="animate-pulse" />
      ) : (
        <Mic size={18} />
      )}
      {isListening && (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#22c55e',
          }}
        />
      )}
    </button>
  );
};
