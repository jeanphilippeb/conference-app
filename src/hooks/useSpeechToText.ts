import { useState, useRef, useCallback } from 'react';

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false); // tracks whether user wants mic on
  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  const stopListening = useCallback(() => {
    activeRef.current = false;
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
  }, []);

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!isSupported) return;
    stopListening();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    activeRef.current = true;

    const launch = () => {
      if (!activeRef.current) return;

      const recognition = new SpeechRecognition();
      // continuous=false is more reliable on iOS Safari — we auto-restart on end
      recognition.continuous = false;
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

      recognition.onerror = (event: any) => {
        // 'no-speech' and 'audio-capture' are recoverable — restart silently
        if (activeRef.current && event.error !== 'not-allowed') {
          setTimeout(() => launch(), 300);
        } else {
          stopListening();
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        // Auto-restart to give a continuous feel (user must tap mic to stop)
        if (activeRef.current) {
          setTimeout(() => launch(), 100);
        } else {
          setIsListening(false);
          recognitionRef.current = null;
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
        // Safety timeout: auto-stop after 20s of silence/stuck state
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => stopListening(), 20000);
      } catch {
        if (activeRef.current) {
          setTimeout(() => launch(), 300);
        } else {
          setIsListening(false);
        }
      }
    };

    launch();
  }, [isSupported, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return { isListening, isSupported, transcript, startListening, stopListening, resetTranscript };
}
