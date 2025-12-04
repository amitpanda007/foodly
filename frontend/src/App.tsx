import { useState, useCallback, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { RecipesPage } from './pages/RecipesPage';
import { CookingView } from './components/CookingView';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { Recipe } from './types';
import { useUserId } from './hooks/useUserId';

type Page = 'home' | 'recipes' | 'cook' | 'settings';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = useUserId();

  // Handle deep-linking: check URL for /recipes/:id on mount
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
      }
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
      const recipe = await api.processRecipe({ url, user_id: userId });
      setSelectedRecipe(recipe);
      setCurrentPage('cook');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process recipe');
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

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

  // Loading state for deep-linked recipe
  if (isLoadingRecipe) {
    return (
      <div className={theme}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
          <LoadingSpinner message="Loading recipe..." />
        </div>
      </div>
    );
  }

  // Cooking View has its own full-screen layout
  if (currentPage === 'cook' && selectedRecipe) {
    return (
      <div className={theme}>
        <CookingView recipe={selectedRecipe} onBack={handleBackFromCooking} />
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
          currentPage={currentPage}
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
        />
      </div>
    </div>
  );
}

export default App;
