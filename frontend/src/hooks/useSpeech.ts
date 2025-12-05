import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface VoiceCommand {
  phrases: string[];
  action: () => void;
}

export function useSpeechRecognition(commands: VoiceCommand[]) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  // Store commands in a ref so the recognition instance doesn't need to be recreated when commands change
  const commandsRef = useRef<VoiceCommand[]>(commands);
  const lastCommandAtRef = useRef<number>(0);

  // Keep commandsRef up to date
  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  // Initialize recognition once
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const currentTranscript = finalTranscript + interimTranscript;
        setTranscript(currentTranscript);

        if (currentTranscript) {
          const lowerTranscript = currentTranscript.toLowerCase().trim();

          // Use commandsRef.current to always access the latest commands
          for (const command of commandsRef.current) {
            for (const phrase of command.phrases) {
              if (lowerTranscript.includes(phrase.toLowerCase())) {
                const now = Date.now();
                // Throttle commands to avoid double-trigger from interim/final duplicates
                if (now - lastCommandAtRef.current < 400) {
                  return;
                }
                lastCommandAtRef.current = now;

                console.log(`[Speech] Matched command: "${phrase}" in "${lowerTranscript}"`);
                command.action();
                // Clear transcript and restart recognition to clear buffer
                setTranscript('');
                try {
                  recognition.stop();
                } catch (e) {
                  // ignore
                }
                return;
              }
            }
          }
        }
      };

      recognition.onend = () => {
        // Restart if we should still be listening
        if (shouldListenRef.current) {
          setTimeout(() => {
            if (shouldListenRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // ignore - might already be started
              }
            }
          }, 100);
        }
      };

      recognition.onerror = (event) => {
        // @ts-ignore
        const errorType = event.error;
        // Ignore no-speech and aborted errors - these are expected
        if (errorType !== 'no-speech' && errorType !== 'aborted') {
          console.error("Speech Recognition Error", event);
          setIsListening(false);
          shouldListenRef.current = false;
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        shouldListenRef.current = false;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []); // Empty deps - only initialize once

  // Handle listening state changes
  useEffect(() => {
    shouldListenRef.current = isListening;
    
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // ignore if already started
      }
    } else if (!isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  }, [isListening]);

  const startListening = useCallback(() => {
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
  };
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, [isSupported]);

  const speakBrowser = useCallback((text: string, onEnd?: () => void) => {
    if (!isSupported) return;
    
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) =>
        voice.lang.startsWith('en') &&
        (voice.name.includes('Natural') ||
          voice.name.includes('Google') ||
          voice.name.includes('Microsoft'))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const speak = useCallback((text: string, onEnd?: () => void, audioUrl?: string | null) => {
    stop();

    if (audioUrl) {
      // Determine base URL for audio
      // If running locally, backend is likely at localhost:8001
      const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001' : '';
      const url = audioUrl.startsWith('http') ? audioUrl : `${baseUrl}${audioUrl}`;
      
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };
      audio.onerror = (e) => {
        console.error("Audio playback failed, falling back to browser TTS", e);
        speakBrowser(text, onEnd);
      };
      
      audio.play().catch(e => {
        console.error("Audio play error", e);
        speakBrowser(text, onEnd);
      });
      return;
    }

    speakBrowser(text, onEnd);
  }, [stop, speakBrowser]);

  const pause = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.pause();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.resume();
    }
    if (audioRef.current) {
      audioRef.current.play();
    }
  }, [isSupported]);

  return {
    isSpeaking,
    isSupported,
    speak,
    stop,
    pause,
    resume,
  };
}

