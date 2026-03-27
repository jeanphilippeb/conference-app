import { useState, useRef } from 'react';

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  const stopListening = () => {
    // Update UI immediately so button never stays stuck
    setIsListening(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    try {
      recognition?.stop();
    } catch {
      try { recognition?.abort(); } catch {}
    }
  };

  const startListening = (onResult: (text: string) => void) => {
    if (!isSupported) return;
    // Stop any in-progress session first
    stopListening();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        onResult(finalTranscript);
      }
    };

    recognition.onerror = () => {
      stopListening();
    };

    recognition.onend = () => {
      // Only update state if this instance is still the active one
      if (recognitionRef.current === recognition) {
        stopListening();
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      // Safety timeout: auto-stop after 60s to prevent permanent freeze
      timeoutRef.current = setTimeout(() => stopListening(), 60000);
    } catch {
      setIsListening(false);
    }
  };

  const resetTranscript = () => {
    setTranscript('');
  };

  return { isListening, isSupported, transcript, startListening, stopListening, resetTranscript };
}
