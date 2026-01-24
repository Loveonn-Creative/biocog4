import { useEffect, useRef, useCallback, useState } from 'react';
import { Language } from '@/lib/languages';
import { toast } from 'sonner';

interface VoiceOutputProps {
  language: Language;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export const useVoiceOutput = ({ language, onSpeakingChange }: VoiceOutputProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      toast.error('Speech synthesis not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language.speechCode;
    utterance.rate = 0.95;
    utterance.pitch = 1;

    // Try to find a voice that matches the language
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(
      voice => voice.lang.startsWith(language.code) || voice.lang === language.speechCode
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      onSpeakingChange?.(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onSpeakingChange?.(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      onSpeakingChange?.(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [language, onSpeakingChange]);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      onSpeakingChange?.(false);
    }
  }, [onSpeakingChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, isSpeaking };
};

// Hook for voice input (speech recognition) with improved error handling and feedback
interface VoiceInputHookProps {
  language: Language;
  onResult: (transcript: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  onError?: (error: string) => void;
}

export const useVoiceInput = ({ language, onResult, onListeningChange, onError }: VoiceInputHookProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const onListeningChangeRef = useRef(onListeningChange);
  const onErrorRef = useRef(onError);

  // Keep refs updated to avoid stale closures
  useEffect(() => {
    onResultRef.current = onResult;
    onListeningChangeRef.current = onListeningChange;
    onErrorRef.current = onError;
  }, [onResult, onListeningChange, onError]);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language.speechCode;

    recognition.onstart = () => {
      console.log('Voice recognition started');
      setIsListening(true);
      onListeningChangeRef.current?.(true);
      toast.info('🎤 Listening...', { duration: 2000 });
    };

    recognition.onend = () => {
      console.log('Voice recognition ended');
      setIsListening(false);
      onListeningChangeRef.current?.(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      onListeningChangeRef.current?.(false);
      
      // User-friendly error messages
      const errorMessages: Record<string, string> = {
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'Microphone not available. Please check permissions.',
        'not-allowed': 'Microphone access denied. Please enable in browser settings.',
        'network': 'Network error. Please check your connection.',
        'aborted': 'Voice recognition was cancelled.',
        'service-not-allowed': 'Voice service not available. Try again later.',
      };
      
      const message = errorMessages[event.error] || `Voice error: ${event.error}`;
      toast.error(message);
      onErrorRef.current?.(message);
    };

    recognition.onresult = (event: any) => {
      const results = event.results;
      const transcript = Array.from(results)
        .map((result: any) => result[0].transcript)
        .join('');
      
      // Check if this is a final result
      if (results[results.length - 1].isFinal) {
        console.log('Final transcript:', transcript);
        if (transcript.trim()) {
          toast.success(`Heard: "${transcript.slice(0, 50)}${transcript.length > 50 ? '...' : ''}"`, { duration: 2000 });
          onResultRef.current(transcript);
        } else {
          toast.warning('No speech detected. Please try again.');
        }
        recognition.stop();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [language.speechCode]);

  // Update language when it changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language.speechCode;
    }
  }, [language.speechCode]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error('Voice recognition is not supported in this browser');
      return;
    }
    
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Failed to start voice recognition. Please try again.');
      }
    }
  }, [isListening, isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      toast.info('Stopped listening');
    }
  }, [isListening]);

  return { startListening, stopListening, isListening, isSupported };
};
