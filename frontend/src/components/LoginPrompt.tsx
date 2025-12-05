import { useState } from 'react';
import { X, Cloud, Shield, CheckSquare, Square } from 'lucide-react';

const DONT_SHOW_KEY = 'foodly:hideLoginPrompt';

interface LoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignup: () => void;
}

export function LoginPrompt({ isOpen, onClose, onLogin, onSignup }: LoginPromptProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Check if we should show based on localStorage
  const isHidden = typeof window !== 'undefined' && localStorage.getItem(DONT_SHOW_KEY) === 'true';

  if (!isOpen || isHidden) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(DONT_SHOW_KEY, 'true');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden animate-slide-up border border-gray-200/60 dark:border-gray-800">

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative p-6 space-y-4">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Keep recipes synced
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sign in to back up and access anywhere.
              </p>
            </div>
          </div>

          {/* Short bullets */}
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-500" />
              <span>Sync across devices</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Secure backup</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                handleClose();
                onSignup();
              }}
              className="flex-1 py-3 px-5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md transition-all"
            >
              Create Account
            </button>
            <button
              onClick={() => {
                handleClose();
                onLogin();
              }}
              className="flex-1 py-3 px-5 rounded-xl font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Sign In
            </button>
          </div>

          {/* Don't show again checkbox */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => setDontShowAgain(!dontShowAgain)}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {dontShowAgain ? (
                <CheckSquare className="w-4 h-4 text-emerald-500" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Don't show this again
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Hook to check if login prompt should be shown
export function useLoginPrompt() {
  const [shouldShow, setShouldShow] = useState(() => {
    // Initialize based on localStorage immediately
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(DONT_SHOW_KEY) !== 'true';
  });

  const resetPrompt = () => {
    localStorage.removeItem(DONT_SHOW_KEY);
    setShouldShow(true);
  };

  return { shouldShow, resetPrompt };
}
