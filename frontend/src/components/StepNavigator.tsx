import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Check,
  RotateCcw,
  Smartphone,
  Play,
  Pause,
  Settings,
  X,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Step } from '../types';
import { useSpeechRecognition, useSpeechSynthesis, VoiceCommand } from '../hooks/useSpeech';
import { useWakeLock } from '../hooks/useWakeLock';

interface StepNavigatorProps {
  steps: Step[];
}

export function StepNavigator({ steps }: StepNavigatorProps) {
  const AUTO_PLAY_KEY = 'foodly:autoPlay';

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [autoAdvance, setAutoAdvance] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTO_PLAY_KEY) === 'true';
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lastHeardCommand, setLastHeardCommand] = useState<string | null>(null);
  
  const {
    isSpeaking,
    isSupported: ttsSupported,
    speak,
    stop: stopSpeaking,
  } = useSpeechSynthesis();

  const {
    isSupported: wakeLockSupported,
    isActive: wakeLockActive,
    toggleWakeLock,
  } = useWakeLock();

  const goToNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev: number) => prev + 1);
    }
  }, [currentStep, steps.length]);

  const goToPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev: number) => prev - 1);
    }
  }, [currentStep]);

  const readCurrentStep = useCallback((onComplete?: () => void) => {
    const step = steps[currentStep];
    if (step) {
      const displayNumber = currentStep + 1;
      let text = `Step ${displayNumber}. ${step.instruction}`;
      // Narrate duration if available
      if (step.duration) {
        text += `. Duration: ${step.duration}.`;
      }
      // Narrate tips if available
      if (step.tips) {
        text += `. Pro tip: ${step.tips}.`;
      }
      speak(text, onComplete, step.audio_url);
    }
  }, [currentStep, steps, speak]);

  // Voice Commands
  const voiceCommands: VoiceCommand[] = useMemo(() => [
    { 
      phrases: ['next', 'next step', 'go next', 'skip'], 
      action: () => { setLastHeardCommand('next'); setIsPlaying(false); stopSpeaking(); goToNext(); } 
    },
    { 
      phrases: ['back', 'previous', 'go back', 'last step'], 
      action: () => { setLastHeardCommand('back'); setIsPlaying(false); stopSpeaking(); goToPrev(); } 
    },
    { 
      phrases: ['repeat', 'again', 'say again', 'read'], 
      action: () => { setLastHeardCommand('repeat'); readCurrentStep(); } 
    },
    { 
      phrases: ['stop', 'pause', 'quiet', 'hush'], 
      action: () => { setLastHeardCommand('stop'); setIsPlaying(false); stopSpeaking(); } 
    },
    { 
      phrases: ['play', 'start', 'go', 'begin'], 
      action: () => { setLastHeardCommand('play'); setIsPlaying(true); } 
    },
    { 
      phrases: ['auto play', 'autoplay', 'toggle auto play', 'toggle autoplay'], 
      action: () => { setLastHeardCommand('auto play toggle'); setAutoAdvance((prev) => !prev); } 
    },
    { 
      phrases: ['turn on auto play', 'enable auto play', 'turn on autoplay', 'enable autoplay'], 
      action: () => { setLastHeardCommand('auto play on'); setAutoAdvance(true); setIsPlaying(true); } 
    },
    { 
      phrases: ['turn off auto play', 'disable auto play', 'turn off autoplay', 'disable autoplay'], 
      action: () => { setLastHeardCommand('auto play off'); setAutoAdvance(false); } 
    },
  ], [goToNext, goToPrev, readCurrentStep, stopSpeaking]);

  const {
    isListening,
    isSupported: sttSupported,
    toggleListening,
    transcript
  } = useSpeechRecognition(voiceCommands);

  // Persist auto-play preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTO_PLAY_KEY, autoAdvance ? 'true' : 'false');
  }, [autoAdvance]);

  // Handle Auto-Play Sequence
  useEffect(() => {
    if (isPlaying && ttsSupported) {
      // Read current step
      readCurrentStep(() => {
        // When done reading
        if (autoAdvance && currentStep < steps.length - 1) {
          // Wait a bit then advance
          setTimeout(() => {
            if (isPlaying) { // Check if still playing
               goToNext();
            }
          }, 3000); // 3s pause
        } else {
          setIsPlaying(false); // Stop if end reached or auto-advance off
        }
      });
    } else if (!isPlaying && isSpeaking) {
       // If paused/stopped manually, stop speech
       stopSpeaking();
    }
  }, [currentStep, isPlaying, autoAdvance, ttsSupported]); // Depend on currentStep to trigger next loop

  const toggleStepComplete = (stepIndex: number) => {
    setCompletedSteps((prev: Set<number>) => {
      const newSet = new Set(prev);
      if (newSet.has(stepIndex)) {
        newSet.delete(stepIndex);
      } else {
        newSet.add(stepIndex);
      }
      return newSet;
    });
  };

  const resetRecipe = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setIsPlaying(false);
    setShowResetConfirm(false);
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="space-y-4 pb-8">
      {/* Progress Bar & Stats */}
      <div className="bg-white dark:bg-charcoal-900 rounded-2xl p-4 border border-cream-200 dark:border-charcoal-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sage-600 dark:text-sage-400">Progress</span>
            <p className="text-sm font-bold text-charcoal-900 dark:text-white">
              Step {currentStep + 1} <span className="text-charcoal-400 font-normal">of {steps.length}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-400">Done</span>
            <p className="text-sm font-bold text-charcoal-900 dark:text-white">
              {Math.round((completedSteps.size / steps.length) * 100)}%
            </p>
          </div>
        </div>
        <div className="h-2 bg-cream-200 dark:bg-charcoal-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-sage-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Main Step Card */}
      <div className="relative">
        {currentStepData && (
          <div className="bg-white dark:bg-charcoal-900 rounded-2xl p-5 sm:p-6 border border-cream-200 dark:border-charcoal-800 min-h-[280px] sm:min-h-[320px] flex flex-col">
            
            {/* Step Header */}
            <div className="flex items-start justify-between mb-4">
              {/* <button
                onClick={() => toggleStepComplete(currentStep)}
                className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold transition-all duration-200 ${
                  completedSteps.has(currentStep)
                    ? 'bg-sage-500 text-white'
                    : 'bg-cream-100 dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-300'
                }`}
              >
                {completedSteps.has(currentStep) ? (
                  <Check className="w-5 h-5" />
                ) : currentStep + 1}
              </button> */}
              
              {currentStepData.duration && (
                <div className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {currentStepData.duration}
                </div>
              )}
            </div>

            {/* Instruction */}
            <div className="flex-1">
              <p className={`text-lg sm:text-xl leading-relaxed text-charcoal-800 dark:text-charcoal-100 transition-opacity ${
                completedSteps.has(currentStep) ? 'opacity-50' : ''
              }`}>
                {currentStepData.instruction}
              </p>
              
              {currentStepData.tips && (
                <div className="mt-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4">
                  <div className="flex gap-3">
                    <span className="text-xl flex-shrink-0">💡</span>
                  <div>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Pro Tip</span>
                      <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-1">
                      {currentStepData.tips}
                    </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-5 pt-4 border-t border-cream-200 dark:border-charcoal-800 flex items-center gap-3">
               <button
                 onClick={() => { setIsPlaying(false); goToPrev(); }}
                 disabled={currentStep === 0}
                className="w-11 h-11 rounded-xl flex items-center justify-center bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-30 transition-colors"
               >
                <ChevronLeft className="w-5 h-5" />
               </button>

               <button
                  onClick={() => toggleStepComplete(currentStep)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    completedSteps.has(currentStep)
                    ? 'text-sage-700 bg-sage-50 dark:bg-sage-900/30 border border-sage-200 dark:border-sage-800'
                    : 'bg-charcoal-900 text-white hover:bg-charcoal-800 dark:bg-white dark:text-charcoal-900'
                  }`}
                >
                {completedSteps.has(currentStep) ? '✓ Done' : 'Mark Done'}
               </button>

               <button
                 onClick={() => { setIsPlaying(false); goToNext(); }}
                 disabled={currentStep === steps.length - 1}
                className="w-11 h-11 rounded-xl flex items-center justify-center bg-sage-500 text-white hover:bg-sage-600 disabled:opacity-30 transition-colors"
               >
                <ChevronRight className="w-5 h-5" />
               </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 bg-charcoal-900 dark:bg-white rounded-full p-1.5 shadow-lg">
          {sttSupported && (
            <button
              onClick={toggleListening}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 text-white'
                  : 'text-white/70 dark:text-charcoal-600 hover:text-white dark:hover:text-charcoal-900'
              }`}
              title="Voice Control"
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
          )}

          {ttsSupported && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isPlaying
                  ? 'bg-sage-500 text-white'
                  : 'text-white/70 dark:text-charcoal-600 hover:text-white dark:hover:text-charcoal-900'
              }`}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          )}

          <div className="w-px h-5 bg-white/20 dark:bg-charcoal-300 mx-1" />

          {wakeLockSupported && (
            <button
              onClick={toggleWakeLock}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                wakeLockActive
                  ? 'text-amber-400'
                  : 'text-white/40 dark:text-charcoal-400 hover:text-white/70 dark:hover:text-charcoal-600'
              }`}
              title="Keep Screen On"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/40 dark:text-charcoal-400 hover:text-white/70 dark:hover:text-charcoal-600 transition-all"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all relative ${
              showSettings || autoAdvance
                ? 'text-sage-400'
                : 'text-white/40 dark:text-charcoal-400 hover:text-white/70 dark:hover:text-charcoal-600'
            }`}
            title="Settings"
          >
            <Settings className={`w-4 h-4 ${showSettings ? 'rotate-45' : ''} transition-transform`} />
          </button>
        </div>
      </div>

          {/* Settings Popover */}
          {showSettings && (
        <div className="fixed inset-0 z-50" onClick={() => setShowSettings(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div 
            className="absolute bottom-32 left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-charcoal-900 rounded-2xl shadow-xl border border-cream-200 dark:border-charcoal-800 p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-charcoal-900 dark:text-white">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-charcoal-400 hover:text-charcoal-600">
                <X className="w-4 h-4" />
                    </button>
                </div>
                
                    <div className="flex items-center justify-between">
                        <div>
                <p className="text-sm font-medium text-charcoal-700 dark:text-charcoal-300">Auto-Advance</p>
                <p className="text-xs text-charcoal-500">Next step after audio</p>
                        </div>
                        <button 
                        onClick={() => setAutoAdvance(!autoAdvance)}
                className={`w-11 h-6 rounded-full transition-all relative ${autoAdvance ? 'bg-sage-500' : 'bg-cream-300 dark:bg-charcoal-700'}`}
                        >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoAdvance ? 'left-5' : 'left-0.5'}`} />
                        </button>
                    </div>
                </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-charcoal-900 rounded-2xl p-5 max-w-xs w-full shadow-xl border border-cream-200 dark:border-charcoal-800">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="w-6 h-6" />
                    </div>
              <h3 className="text-lg font-bold text-charcoal-900 dark:text-white mb-1">Restart?</h3>
              <p className="text-sm text-charcoal-500">This will clear all progress.</p>
                </div>
            <div className="flex gap-2">
                    <button 
                        onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-charcoal-600 dark:text-charcoal-300 bg-cream-100 dark:bg-charcoal-800 hover:bg-cream-200 dark:hover:bg-charcoal-700 transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={resetRecipe}
                className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors text-sm"
                    >
                        Restart
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Voice Feedback Toast */}
      {isListening && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-charcoal-900 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>{transcript ? `"${transcript}"` : 'Listening...'}</span>
            </div>
            {lastHeardCommand && (
              <span className="text-xs text-emerald-400 font-mono">
                Matched: {lastHeardCommand}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Step Pills */}
      <div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
        <div className="flex gap-1.5 min-w-max">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => { setCurrentStep(index); setIsPlaying(false); }}
              className={`flex-shrink-0 w-9 h-9 rounded-full font-semibold text-xs transition-all flex items-center justify-center ${
                index === currentStep
                  ? 'bg-sage-500 text-white scale'
                  : completedSteps.has(index)
                  ? 'bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-400'
                  : 'bg-cream-100 dark:bg-charcoal-800 text-charcoal-400 hover:bg-cream-200 dark:hover:bg-charcoal-700'
              }`}
            >
              {completedSteps.has(index) && index !== currentStep ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                index + 1
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}