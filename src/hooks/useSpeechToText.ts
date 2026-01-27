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
  continuous?: boolean;
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
  continuous = false,
  language = "en-GB",
}: UseSpeechToTextOptions = {}): UseSpeechToTextReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Check browser support
  const isSupported = getSpeechRecognition() !== null;

  // Initialize recognition
  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();

    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const errorMessage = event.error === "not-allowed" 
        ? "Microphone access denied. Please enable it in your browser settings."
        : event.error === "no-speech"
        ? "No speech detected. Try again."
        : `Speech recognition error: ${event.error}`;
      
      onError?.(errorMessage);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Show interim results while speaking
      setTranscript(interimTranscript || finalTranscript);

      // When we have a final result, call onResult
      if (finalTranscript) {
        onResult?.(finalTranscript);
        setTranscript("");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [continuous, language, onResult, onError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    setTranscript("");
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      // Recognition may already be running
      console.error("Speech recognition start error:", error);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    
    recognitionRef.current.stop();
  }, [isListening]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    transcript,
  };
};
