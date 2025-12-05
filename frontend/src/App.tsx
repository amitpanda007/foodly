import { useState, useCallback, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { RecipesPage } from './pages/RecipesPage';
import { CookingView } from './components/CookingView';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthModal } from './components/AuthModal';
import { LoginPrompt, useLoginPrompt } from './components/LoginPrompt';
import { api } from './services/api';
import { Recipe } from './types';

type Page = 'home' | 'recipes' | 'cook' | 'settings';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, accessToken, anonymousUserId, user, isLoading: isAuthLoading } = useAuth();
  const { shouldShow: shouldShowLoginPrompt } = useLoginPrompt();
  
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  
  // Login prompt state
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [hasShownPromptThisSession, setHasShownPromptThisSession] = useState(false);

  // Show login prompt after first recipe is processed (for anonymous users)
  useEffect(() => {
    // Show prompt when:
    // 1. User is not authenticated
    // 2. A recipe has been selected (just processed or viewing)
    // 3. Haven't shown this session
    // 4. User hasn't dismissed permanently
    if (!isAuthenticated && selectedRecipe && !hasShownPromptThisSession && shouldShowLoginPrompt) {
      const timer = setTimeout(() => {
        setShowLoginPrompt(true);
        setHasShownPromptThisSession(true);
      }, 1500); // Show after 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [selectedRecipe, isAuthenticated, hasShownPromptThisSession, shouldShowLoginPrompt]);

  // Also show login prompt when visiting recipes page for first time (if has recipes)
  useEffect(() => {
    if (!isAuthenticated && currentPage === 'recipes' && !hasShownPromptThisSession && shouldShowLoginPrompt) {
      const timer = setTimeout(() => {
        setShowLoginPrompt(true);
        setHasShownPromptThisSession(true);
      }, 3000); // Show after 3 seconds on recipes page
      return () => clearTimeout(timer);
    }
  }, [currentPage, isAuthenticated, hasShownPromptThisSession, shouldShowLoginPrompt]);

  // Use user ID or anonymous ID for API calls
  const userId = isAuthenticated ? String(user?.id) : anonymousUserId;

  // Handle deep-linking: check URL for /recipes/:id or static routes on mount
  useEffect(() => {
    const handleRouting = async () => {
      const path = window.location.pathname;
      const match = path.match(/^\/recipes\/(\d+)$/);
      
      if (match) {
        const recipeId = parseInt(match[1], 10);
        setIsLoadingRecipe(true);
        
        try {
          const recipe = await api.getRecipe(recipeId);
          setSelectedRecipe(recipe);
          setCurrentPage('cook');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load recipe');
          // Redirect to home if recipe not found
          window.history.replaceState({}, '', '/');
        } finally {
          setIsLoadingRecipe(false);
        }
        return;
      }

      // Static route handling
      if (path === '/recipes') {
        setCurrentPage('recipes');
        setSelectedRecipe(null);
        return;
      }
      if (path === '/settings') {
        setCurrentPage('settings');
        setSelectedRecipe(null);
        return;
      }

      // Default to home
      setCurrentPage('home');
      setSelectedRecipe(null);
    };

    handleRouting();

    // Listen for popstate (back/forward navigation)
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        setCurrentPage('home');
        setSelectedRecipe(null);
      } else if (path === '/recipes') {
        setCurrentPage('recipes');
        setSelectedRecipe(null);
      } else if (path === '/settings') {
        setCurrentPage('settings');
        setSelectedRecipe(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL when navigating to cook view
  useEffect(() => {
    if (currentPage === 'cook' && selectedRecipe) {
      window.history.pushState({}, '', `/recipes/${selectedRecipe.id}`);
    }
  }, [currentPage, selectedRecipe]);

  const handleProcessRecipe = useCallback(async (url: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const request = isAuthenticated
        ? { url, user_id: user?.id }
        : { url, anonymous_user_id: anonymousUserId };
      
      const recipe = await api.processRecipe(request, accessToken);
      setSelectedRecipe(recipe);
      setCurrentPage('cook');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process recipe');
    } finally {
      setIsProcessing(false);
    }
  }, [isAuthenticated, user, anonymousUserId, accessToken]);

  const handleSelectRecipe = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentPage('cook');
  }, []);

  const handleNavigate = useCallback((page: 'home' | 'recipes' | 'settings') => {
    setCurrentPage(page);
    setSelectedRecipe(null);
    setError(null);
    // Update URL
    if (page === 'home') {
      window.history.pushState({}, '', '/');
    } else {
      window.history.pushState({}, '', `/${page}`);
    }
  }, []);

  const handleBackFromCooking = useCallback(() => {
    setCurrentPage('recipes');
    setSelectedRecipe(null);
    window.history.pushState({}, '', '/recipes');
  }, []);

  const handleOpenAuth = useCallback((mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  }, []);

  // Loading state for auth or deep-linked recipe
  if (isAuthLoading || isLoadingRecipe) {
    return (
      <div className={theme}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
          <LoadingSpinner message={isAuthLoading ? "Loading..." : "Loading recipe..."} />
        </div>
      </div>
    );
  }

  return (
    <div className={theme}>
      <div className="min-h-screen flex flex-col pb-16 md:pb-0">
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          onNavigate={handleNavigate}
          currentPage={currentPage === 'cook' ? 'recipes' : currentPage}
          onOpenAuth={() => handleOpenAuth('login')}
        />

        <main className="flex-1">
          {isProcessing ? (
            <div className="max-w-3xl mx-auto px-4 py-16">
              <LoadingSpinner message="AI is analyzing the recipe..." />
              <div className="text-center mt-4">
                <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
                  This may take a moment while we extract and structure the recipe
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="max-w-3xl mx-auto px-4 py-16">
              <ErrorMessage
                title="Recipe Processing Failed"
                message={error}
                onRetry={() => setError(null)}
              />
            </div>
          ) : currentPage === 'home' ? (
            <HomePage
              onProcessRecipe={handleProcessRecipe}
              isProcessing={isProcessing}
            />
          ) : currentPage === 'recipes' ? (
            <RecipesPage onSelectRecipe={handleSelectRecipe} />
          ) : currentPage === 'cook' && selectedRecipe ? (
            <CookingView recipe={selectedRecipe} onBack={handleBackFromCooking} />
          ) : (
            <SettingsPage userId={userId} />
          )}
        </main>

        {/* Footer - Only show on desktop or if not covered by bottom nav */}
        <footer className="hidden md:block border-t border-cream-200 dark:border-charcoal-800 py-6 mt-auto">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-charcoal-500 dark:text-charcoal-400">
            <p>
              Made with 🍳 by Foodly •{' '}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-sage-600 dark:hover:text-sage-400 transition-colors"
              >
                Open Source
              </a>
            </p>
          </div>
        </footer>

        {/* Mobile Bottom Navigation */}
        <BottomNav
          currentPage={currentPage === 'cook' ? 'recipes' : currentPage}
          onNavigate={handleNavigate}
          onOpenAuth={() => handleOpenAuth('login')}
        />

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
        />

        {/* Login Prompt */}
        <LoginPrompt
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
          onLogin={() => handleOpenAuth('login')}
          onSignup={() => handleOpenAuth('signup')}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
