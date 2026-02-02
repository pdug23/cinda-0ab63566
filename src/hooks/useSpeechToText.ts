import { useState, useCallback, useRef, useEffect } from "react";

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

// Get the SpeechRecognition constructor from window
const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

interface UseSpeechToTextOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

interface UseSpeechToTextReturn {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
}

export const useSpeechToText = ({
  onResult,
  onError,
  language = "en-GB",
}: UseSpeechToTextOptions = {}): UseSpeechToTextReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  
  // Store callbacks in refs to prevent useEffect re-runs
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  
  // Track user intent to keep listening (for auto-restart on silence)
  const isListeningRef = useRef(false);
  // Accumulate all transcribed text during the session
  const accumulatedTextRef = useRef("");

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  // Check browser support
  const isSupported = getSpeechRecognition() !== null;

  // Initialize recognition
  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();

    // Enable continuous mode for push-to-talk
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      // If user still intends to listen, auto-restart (handles browser timeouts)
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (error) {
          // Recognition may already be running, ignore
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event) => {
      // Ignore aborted - this happens during cleanup or manual stop
      if (event.error === "aborted") return;
      
      // Ignore no-speech - we'll auto-restart via onend
      if (event.error === "no-speech") return;
      
      // For other errors, stop listening
      isListeningRef.current = false;
      setIsListening(false);
      
      const errorMessage = event.error === "not-allowed" 
        ? "Microphone access denied. Please enable it in your browser settings."
        : `Speech recognition error: ${event.error}`;
      
      onErrorRef.current?.(errorMessage);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Accumulate final results with space separator
          const text = result[0].transcript;
          if (accumulatedTextRef.current && text) {
            accumulatedTextRef.current += " " + text;
          } else {
            accumulatedTextRef.current += text;
          }
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Show live preview: accumulated + current interim
      const livePreview = accumulatedTextRef.current + (interimTranscript ? " " + interimTranscript : "");
      setTranscript(livePreview.trim());
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      recognition.abort();
    };
  }, [language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return;

    // Reset state for new session
    accumulatedTextRef.current = "";
    setTranscript("");
    isListeningRef.current = true;
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      // Recognition may already be running
      console.error("Speech recognition start error:", error);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListeningRef.current) return;
    
    // Mark that user wants to stop
    isListeningRef.current = false;
    
    // Stop recognition
    recognitionRef.current.stop();
    
    // Deliver accumulated text
    const finalText = accumulatedTextRef.current.trim();
    if (finalText) {
      onResultRef.current?.(finalText);
    }
    
    // Clear state
    setTranscript("");
    setIsListening(false);
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    transcript,
  };
};
