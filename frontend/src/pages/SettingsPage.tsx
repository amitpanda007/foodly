import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { VoiceOption } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SEO } from '../components/SEO';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

interface SettingsPageProps {
  userId: string;
}

export function SettingsPage({ userId }: SettingsPageProps) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [currentVoice, setCurrentVoice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingVoiceId, setSavingVoiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <SEO title="Settings - Foodly" description="Configure voice settings and preferences for Foodly." />
      <div>
        <h1 className="text-3xl font-bold text-charcoal-900 dark:text-white mb-2">
          Voice Settings
        </h1>
        <p className="text-charcoal-500 dark:text-charcoal-300">
          Preview each narrator, then choose the one you want Foodly to use when generating
          recipe audio.
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
    </div>
  );
}


