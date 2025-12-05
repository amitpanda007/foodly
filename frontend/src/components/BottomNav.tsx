import { Home, BookOpen, Settings, User, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface BottomNavProps {
  currentPage: 'home' | 'recipes' | 'settings';
  onNavigate: (page: 'home' | 'recipes' | 'settings') => void;
  onOpenAuth?: () => void;
}

export function BottomNav({ currentPage, onNavigate, onOpenAuth }: BottomNavProps) {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)] md:hidden z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
      <nav className="flex justify-around items-center h-16">
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 ${
            currentPage === 'home'
              ? 'text-emerald-600 dark:text-emerald-400 scale-105'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Home className={`w-6 h-6 ${currentPage === 'home' ? 'drop-shadow-sm' : ''}`} />
          <span className="text-[10px] font-bold tracking-wide">Home</span>
        </button>

        <button
          onClick={() => onNavigate('recipes')}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 ${
            currentPage === 'recipes'
              ? 'text-emerald-600 dark:text-emerald-400 scale-105'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <BookOpen className={`w-6 h-6 ${currentPage === 'recipes' ? 'drop-shadow-sm' : ''}`} />
          <span className="text-[10px] font-bold tracking-wide">Recipes</span>
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 ${
            currentPage === 'settings'
              ? 'text-emerald-600 dark:text-emerald-400 scale-105'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <Settings className={`w-6 h-6 ${currentPage === 'settings' ? 'drop-shadow-sm' : ''}`} />
          <span className="text-[10px] font-bold tracking-wide">Settings</span>
        </button>

        {/* Auth button - only visible if onOpenAuth is provided */}
        {isAuthenticated ? (
          <button
            onClick={() => onNavigate('settings')}
            className="flex flex-col items-center justify-center w-full h-full gap-1 text-emerald-600 dark:text-emerald-400"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold tracking-wide truncate max-w-[50px]">
              {user?.email.split('@')[0]}
            </span>
          </button>
        ) : onOpenAuth ? (
          <button
            onClick={onOpenAuth}
            className="flex flex-col items-center justify-center w-full h-full gap-1 text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <LogIn className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wide">Sign In</span>
          </button>
        ) : null}
      </nav>
    </div>
  );
}
