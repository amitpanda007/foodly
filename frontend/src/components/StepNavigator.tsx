import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Clock,
  Maximize2,
  List
} from 'lucide-react';
import { Step } from '../types';
import { useSpeechRecognition, useSpeechSynthesis, VoiceCommand } from '../hooks/useSpeech';
import { useWakeLock } from '../hooks/useWakeLock';

interface StepNavigatorProps {
  steps: Step[];
  ingredientsAudioUrl?: string | null;
}

export function StepNavigator({ steps, ingredientsAudioUrl }: StepNavigatorProps) {
  const AUTO_PLAY_KEY = 'foodly:autoPlay';

  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [autoAdvance, setAutoAdvance] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTO_PLAY_KEY) === 'true';
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lastHeardCommand, setLastHeardCommand] = useState<string | null>(null);
  
  // Refs to track playback state
  const lastPlayedStepRef = useRef<number | null>(null);
  const ignorePauseRef = useRef(false);

  const {
    isSupported: ttsSupported,
    speak,
    stop: stopSpeaking,
    pause,
    resume
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

  const playIngredients = useCallback(() => {
    if (ingredientsAudioUrl) {
       setIsPlaying(false);
       stopSpeaking();
       // Reset ref so we don't try to resume ingredients as a step
       lastPlayedStepRef.current = null;
       // Flag to prevent the useEffect from pausing this new playback immediately
       ignorePauseRef.current = true;
       // We pass a placeholder text because the audio URL takes precedence in our tts service wrapper usually
       // or if text is fallback. The prompt says "play the audio which lists out the ingredients".
       speak("Here are the ingredients.", undefined, ingredientsAudioUrl);
    } else {
       speak("Sorry, I don't have audio for the ingredients list.");
    }
  }, [ingredientsAudioUrl, speak, stopSpeaking]);

  const playStepAtIndex = useCallback((index: number) => {
    const step = steps[index];
    if (step) {
      const displayNumber = index + 1;
      let text = `Step ${displayNumber}. ${step.instruction}`;
      if (step.duration) text += `. Duration: ${step.duration}.`;
      if (step.tips) text += `. Pro tip: ${step.tips}.`;
      
      stopSpeaking();
      setIsPlaying(false);
      // Reset ref so main player doesn't think we are midway through a step
      lastPlayedStepRef.current = null;
      ignorePauseRef.current = true;
      speak(text, undefined, step.audio_url);
    }
  }, [steps, speak, stopSpeaking]);

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
      phrases: ['list ingredients', 'read ingredients', 'ingredients', 'what are the ingredients'], 
      action: () => { setLastHeardCommand('ingredients'); playIngredients(); } 
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
  ], [goToNext, goToPrev, readCurrentStep, stopSpeaking, playIngredients]);

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
      // Check if we are resuming the same step
      if (lastPlayedStepRef.current === currentStep) {
        resume();
      } else {
        // Start fresh
        lastPlayedStepRef.current = currentStep;
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
            lastPlayedStepRef.current = null; // Reset
          }
        });
      }
    } else if (!isPlaying) {
       if (ignorePauseRef.current) {
          ignorePauseRef.current = false;
          // Don't stop or pause, as we just started something else (ingredients or specific step view)
       } else if (lastPlayedStepRef.current === currentStep) {
          // If we paused on the current step, just pause
          pause();
       } else {
          // Otherwise stop completely
          stopSpeaking();
          lastPlayedStepRef.current = null;
       }
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
        
        <button 
          onClick={() => setShowAllSteps(true)}
          className="mt-3 w-full py-2 text-xs font-semibold uppercase tracking-wider text-sage-600 dark:text-sage-400 hover:bg-sage-50 dark:hover:bg-sage-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <List className="w-4 h-4" />
          View All Steps
        </button>
      </div>

      {/* Main Step Card */}
      <div className="relative">
        {currentStepData && (
          <div className="bg-white dark:bg-charcoal-900 rounded-2xl p-5 sm:p-6 border border-cream-200 dark:border-charcoal-800 min-h-[280px] sm:min-h-[320px] flex flex-col">
            
            {/* Step Header */}
            <div className="flex items-start justify-between mb-4">
              <div />
              <div className="flex items-center gap-2 ml-auto">
                {currentStepData.duration && (
                  <div className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {currentStepData.duration}
                  </div>
                )}
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-2 rounded-lg text-charcoal-400 hover:text-charcoal-600 hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors"
                  title="Expand View"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Instruction */}
            <div className="flex-1">
              <p className={`text-lg sm:text-xl leading-relaxed text-charcoal-800 dark:text-charcoal-100 transition-opacity ${
                completedSteps.has(currentStep) ? 'opacity-50' : ''
              }`}>
                {currentStepData.instruction}
              </p>
              
              {currentStepData.ingredients && currentStepData.ingredients.length > 0 && (
                <div className="mt-6 mb-2">
                   <p className="text-xs font-bold uppercase tracking-wider text-sage-600 dark:text-sage-400 mb-3 flex items-center gap-2">
                      <span className="text-base">🥗</span> Ingredients for this step
                   </p>
                   <div className="flex flex-wrap gap-2">
                      {currentStepData.ingredients.map((ing, i) => (
                         <span 
                            key={i} 
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-sage-50 dark:bg-sage-900/20 border border-sage-100 dark:border-sage-800 text-sm font-medium text-sage-800 dark:text-sage-200"
                         >
                            {ing}
                         </span>
                      ))}
                   </div>
                </div>
              )}

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
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all lg:hidden ${
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
        <div className="fixed inset-0 z-[110]" onClick={() => setShowSettings(false)}>
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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
      <div className="relative">
        <div className="overflow-x-auto p-1.5 scrollbar-hide mask-gradient-x">
          <div className="flex gap-2 min-w-max px-6 justify-start sm:justify-center">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => { setCurrentStep(index); setIsPlaying(false); }}
                className={`flex-shrink-0 w-10 h-10 rounded-full font-bold text-sm transition-all duration-300 flex items-center justify-center border-2 ${
                  index === currentStep
                    ? 'bg-sage-500 border-sage-500 text-white shadow-lg shadow-sage-500/30 scale-110'
                    : completedSteps.has(index)
                    ? 'bg-sage-50 border-sage-200 text-sage-600 dark:bg-sage-900/20 dark:border-sage-800 dark:text-sage-400'
                    : 'bg-white border-cream-200 text-charcoal-400 hover:border-sage-300 hover:text-sage-500 dark:bg-charcoal-800 dark:border-charcoal-700 dark:hover:border-charcoal-600'
                }`}
              >
                {completedSteps.has(index) && index !== currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showAllSteps && (
        <div className="fixed inset-0 z-[120] bg-white dark:bg-charcoal-900 flex flex-col animate-fade-in">
           {/* Header */}
           <div className="flex items-center justify-between p-4 border-b border-cream-200 dark:border-charcoal-800">
              <h3 className="font-semibold text-lg text-charcoal-900 dark:text-white">All Steps</h3>
              <button onClick={() => setShowAllSteps(false)} className="p-2 rounded-full hover:bg-cream-100 dark:hover:bg-charcoal-800 text-charcoal-500 transition-colors">
                 <X className="w-6 h-6" />
              </button>
           </div>
           
           {/* List */}
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {steps.map((step, index) => (
                 <div key={index} className={`p-4 rounded-xl border transition-all ${currentStep === index ? 'border-sage-500 ring-1 ring-sage-500 bg-sage-50 dark:bg-sage-900/10' : 'border-cream-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-800'}`}>
                    <div className="flex gap-4">
                       <span className={`font-bold text-lg ${currentStep === index ? 'text-sage-600 dark:text-sage-400' : 'text-charcoal-400 dark:text-charcoal-500'}`}>
                          {index + 1}
                       </span>
                       <div className="flex-1">
                          <p className="text-charcoal-900 dark:text-white leading-relaxed">{step.instruction}</p>
                          
                          {step.ingredients && step.ingredients.length > 0 && (
                             <div className="mt-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-100 dark:border-amber-900/20">
                                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-500 mb-1.5 flex items-center gap-1.5">
                                   <span className="text-sm">🥗</span> Step Ingredients
                                </p>
                                <div className="flex flex-wrap gap-2">
                                   {step.ingredients.map((ing, i) => (
                                      <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-white dark:bg-charcoal-800 border border-amber-200 dark:border-amber-900/30 text-xs font-medium text-charcoal-700 dark:text-charcoal-300 shadow-sm">
                                         {ing}
                                      </span>
                                   ))}
                                </div>
                             </div>
                          )}

                          {step.tips && (
                             <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                                Pro Tip: <span className="text-charcoal-600 dark:text-charcoal-400 font-normal">{step.tips}</span>
                             </p>
                          )}
                          {step.duration && (
                             <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-500">
                                <Clock className="w-3.5 h-3.5" />
                                {step.duration}
                             </div>
                          )}
                       </div>
                       <button 
                          onClick={() => playStepAtIndex(index)}
                          className="self-start p-3 rounded-full bg-sage-100 text-sage-600 hover:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-400 dark:hover:bg-sage-900/50 transition-colors"
                          title="Play this step"
                       >
                          <Play className="w-5 h-5 fill-current" />
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {isExpanded && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-charcoal-900 flex flex-col animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-cream-200 dark:border-charcoal-800">
             <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-charcoal-500">Step {currentStep + 1}/{steps.length}</span>
             </div>
             <button
                onClick={() => setIsExpanded(false)}
                className="p-2 rounded-full hover:bg-cream-100 dark:hover:bg-charcoal-800 text-charcoal-500 transition-colors"
             >
                <X className="w-6 h-6" />
             </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center text-center">
              <div className="w-full max-w-3xl flex flex-col justify-center min-h-min space-y-8 py-4">
                  <p className="text-2xl md:text-4xl font-medium leading-relaxed text-charcoal-900 dark:text-white">
                     {currentStepData.instruction}
                  </p>
                  
                  {currentStepData.ingredients && currentStepData.ingredients.length > 0 && (
                    <div className="flex flex-col items-center">
                       <p className="text-xs font-bold uppercase tracking-wider text-sage-600 dark:text-sage-400 mb-3 flex items-center gap-2">
                          <span className="text-base">🥗</span> Ingredients for this step
                       </p>
                       <div className="flex flex-wrap justify-center gap-2">
                          {currentStepData.ingredients.map((ing, i) => (
                             <span key={i} className="px-4 py-2 rounded-full bg-sage-50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-300 font-medium border border-sage-100 dark:border-sage-800">
                                {ing}
                             </span>
                          ))}
                       </div>
                    </div>
                  )}

                  {currentStepData.tips && (
                     <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl text-indigo-800 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/30">
                        <p className="font-bold uppercase text-xs mb-3 opacity-70 tracking-widest">Pro Tip</p>
                        <p className="text-lg md:text-xl font-medium leading-relaxed">{currentStepData.tips}</p>
                     </div>
                  )}
              </div>
          </div>

          {/* Controls */}
          <div className="p-6 pb-10 border-t border-cream-200 dark:border-charcoal-800 bg-white dark:bg-charcoal-900">
             <div className="flex items-center justify-between mb-6 max-w-md mx-auto w-full">
                <button
                   onClick={() => { setIsPlaying(false); goToPrev(); }}
                   disabled={currentStep === 0}
                   className="p-4 rounded-full bg-cream-100 dark:bg-charcoal-800 text-charcoal-900 dark:text-white disabled:opacity-30"
                >
                   <ChevronLeft className="w-6 h-6" />
                </button>

                 {ttsSupported && (
                    <button
                       onClick={() => setIsPlaying(!isPlaying)}
                       className="w-16 h-16 rounded-full bg-sage-500 text-white flex items-center justify-center shadow-lg hover:bg-sage-600 transition-colors"
                    >
                       {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                    </button>
                 )}

                <button
                   onClick={() => { setIsPlaying(false); goToNext(); }}
                   disabled={currentStep === steps.length - 1}
                   className="p-4 rounded-full bg-cream-100 dark:bg-charcoal-800 text-charcoal-900 dark:text-white disabled:opacity-30"
                >
                   <ChevronRight className="w-6 h-6" />
                </button>
             </div>

             <div className="flex justify-center gap-4">
                 {sttSupported && (
                     <button
                        onClick={toggleListening}
                        className={`p-3 rounded-full ${isListening ? 'bg-red-500 text-white' : 'bg-cream-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300'}`}
                     >
                        {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                     </button>
                 )}

                 {wakeLockSupported && (
                    <button
                      onClick={toggleWakeLock}
                      className={`p-3 rounded-full lg:hidden ${
                        wakeLockActive
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-cream-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300'
                      }`}
                      title="Keep Screen On"
                    >
                      <Smartphone className="w-5 h-5" />
                    </button>
                 )}

                 <button
                    onClick={() => setShowResetConfirm(true)}
                    className="p-3 rounded-full bg-cream-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300"
                    title="Restart"
                 >
                    <RotateCcw className="w-5 h-5" />
                 </button>

                 <button
                     onClick={() => setShowSettings(true)}
                     className="p-3 rounded-full bg-cream-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300"
                 >
                    <Settings className="w-5 h-5" />
                 </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}