import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ListChecks, ChevronDown, ChevronUp, LogOut, User, Shield, Mail, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { VoiceOption } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SEO } from '../components/SEO';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from '../components/AuthModal';
import { useLoginPrompt } from '../components/LoginPrompt';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

interface SettingsPageProps {
  userId: string;
}

const HOTKEYS = [
  { action: 'Next step', phrases: ['next', 'next step', 'go next', 'skip'] },
  { action: 'Previous step', phrases: ['back', 'previous', 'go back', 'last step'] },
  { action: 'Repeat step', phrases: ['repeat', 'again', 'say again', 'read'] },
  { action: 'List ingredients', phrases: ['list ingredients', 'read ingredients', 'ingredients', 'what are the ingredients'] },
  { action: 'Pause / Stop', phrases: ['stop', 'pause', 'quiet', 'hush'] },
  { action: 'Play / Resume', phrases: ['play', 'start', 'go', 'begin'] },
  { action: 'Toggle auto-play', phrases: ['auto play', 'autoplay', 'toggle auto play', 'turn on auto play', 'turn off auto play'] },
];

export function SettingsPage({ userId }: SettingsPageProps) {
  const { isAuthenticated, user, logout, anonymousUserId } = useAuth();
  const { shouldShow: loginPromptEnabled, resetPrompt: resetLoginPrompt } = useLoginPrompt();
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [currentVoice, setCurrentVoice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingVoiceId, setSavingVoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showHotwords, setShowHotwords] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function bootstrap() {
      try {
        const [voiceResponse, userVoice] = await Promise.all([
          api.getVoices(),
          api.getUserVoice(userId),
        ]);

        if (!isMounted) return;
        setVoices(voiceResponse.voices);
        setCurrentVoice(userVoice.voice_id);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load voices.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!success) {
      return;
    }
    const timer = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const resolveSampleUrl = (path?: string | null) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  };

  const playVoiceSample = async (voice: VoiceOption) => {
    const sampleUrl = resolveSampleUrl(voice.sample_url);
    if (!sampleUrl) {
      setError('Preview is not available for this voice yet.');
      return;
    }

    try {
      setError(null);
      audioRef.current?.pause();
      const audio = new Audio(sampleUrl);
      audioRef.current = audio;
      setPreviewingVoiceId(voice.id);
      audio.onended = () => setPreviewingVoiceId((prev) => (prev === voice.id ? null : prev));
      await audio.play();
    } catch (err) {
      setPreviewingVoiceId(null);
      setError(err instanceof Error ? err.message : 'Unable to play preview audio.');
    }
  };

  const persistVoiceSelection = async (voice: VoiceOption) => {
    if (voice.id === currentVoice || savingVoiceId === voice.id) {
      return;
    }
    setSavingVoiceId(voice.id);
    setError(null);
    try {
      await api.setUserVoice(userId, voice.id);
      setCurrentVoice(voice.id);
      setSuccess('Voice preference updated!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save voice preference.');
    } finally {
      setSavingVoiceId(null);
    }
  };

  const handleVoiceCardClick = (voice: VoiceOption) => {
    void playVoiceSample(voice);
    void persistVoiceSelection(voice);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <SEO title="Settings - Foodly" description="Configure app and voice settings for Foodly." />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white">
          Settings
        </h1>
        <p className="text-charcoal-500 dark:text-charcoal-300">
          Configure app preferences and voice options for your cooking sessions.
        </p>
      </div>

      {/* Account Section */}
      <div className="bg-white dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-cream-200 dark:border-charcoal-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-charcoal-900 dark:text-white">Account</h2>
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
                {isAuthenticated ? 'Manage your account' : 'Sign in to sync your recipes'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {isAuthenticated ? (
            <div className="space-y-4">
              {/* User info */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-cream-50 dark:bg-charcoal-800/50">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                  {user?.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-charcoal-400" />
                    <p className="text-charcoal-900 dark:text-white font-medium truncate">
                      {user?.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      Recipes synced across devices
                    </p>
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  You're using Foodly as a guest. Your recipes are stored locally on this device. 
                  Sign in to sync them across all your devices and keep them safe!
                </p>
              </div>

              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20 transition-all"
              >
                Sign in or Create Account
              </button>

              {/* Device info for non-authenticated users */}
              <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-charcoal-800/30 border border-gray-200 dark:border-charcoal-800">
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400 mb-1">Device ID</p>
                <p className="text-sm font-mono text-charcoal-700 dark:text-charcoal-300 truncate">
                  {anonymousUserId}
                </p>
              </div>

              {/* Reset login prompt */}
              {!loginPromptEnabled && (
                <button
                  onClick={() => {
                    resetLoginPrompt();
                    setSuccess('Login prompt will show again');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-charcoal-600 dark:text-charcoal-400 bg-gray-100 dark:bg-charcoal-800 hover:bg-gray-200 dark:hover:bg-charcoal-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset login reminder
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hotwords Card */}
      <div className="bg-white dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-800 rounded-2xl shadow-sm">
        <button
          type="button"
          onClick={() => setShowHotwords(!showHotwords)}
          className="w-full px-5 py-4 border-b border-cream-200 dark:border-charcoal-800 flex items-center justify-between gap-3 hover:bg-cream-50 dark:hover:bg-charcoal-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center text-sage-600">
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-charcoal-900 dark:text-white">Voice Hotwords</h2>
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Available voice commands while cooking</p>
            </div>
          </div>
          {showHotwords ? <ChevronUp className="w-5 h-5 text-charcoal-400" /> : <ChevronDown className="w-5 h-5 text-charcoal-400" />}
        </button>

        {showHotwords && (
          <div className="grid md:grid-cols-2 gap-4 p-2">
            {HOTKEYS.map(({ action, phrases }) => (
              <div key={action} className="rounded-xl border border-cream-200 dark:border-charcoal-800 p-4 bg-cream-50/60 dark:bg-charcoal-800/40">
                <p className="text-sm font-semibold text-charcoal-900 dark:text-white mb-2">{action}</p>
                <div className="flex flex-wrap gap-2">
                  {phrases.map((p) => (
                    <span key={p} className="px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-700 text-charcoal-700 dark:text-charcoal-200">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voice Settings Section */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-charcoal-900 dark:text-white">Voice Settings</h2>
        <p className="text-charcoal-500 dark:text-charcoal-300">
          Preview each narrator, then choose the one you want Foodly to use when generating recipe audio.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner message="Loading voice options..." />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : (
        <>
          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200 rounded-2xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5" />
              <span>{success}</span>
            </div>
          )}

          {voices.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-charcoal-200 dark:border-charcoal-700 p-8 text-center text-charcoal-500 dark:text-charcoal-300">
              No voices are available right now. Please try again later.
            </div>
          ) : (
            <div className="grid gap-6">
              {voices.map((voice) => (
                <div
                  key={voice.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleVoiceCardClick(voice)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleVoiceCardClick(voice);
                    }
                  }}
                  className={`rounded-3xl border p-6 shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    currentVoice === voice.id
                      ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50/60 dark:bg-emerald-900/20'
                      : 'border-cream-200 dark:border-charcoal-800 bg-white/80 dark:bg-charcoal-900/40'
                  }`}
                >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-xl font-semibold text-charcoal-900 dark:text-white flex items-center gap-2">
                      {voice.name}
                      {currentVoice === voice.id && (
                        <span className="text-xs uppercase tracking-wide bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-charcoal-500 dark:text-charcoal-300">
                      {voice.gender} • {voice.locale}
                    </p>
                    <p className="mt-2 text-charcoal-600 dark:text-charcoal-200 text-sm">
                      {voice.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    {currentVoice === voice.id ? (
                      null
                    ) : savingVoiceId === voice.id ? (
                      <span className="text-xs text-charcoal-500 dark:text-charcoal-300">Saving…</span>
                    ) : previewingVoiceId === voice.id ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-300">Playing…</span>
                    ) : (
                      null
                    )}
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
    </div>
  );
}
