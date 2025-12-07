import { useEffect, useState, useCallback } from 'react';
import { Recipe } from '../types';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { RecipeList } from '../components/RecipeList';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { SEO } from '../components/SEO';
import { ChevronDown } from 'lucide-react';

interface RecipesPageProps {
  onSelectRecipe: (recipe: Recipe) => void;
}

const ITEMS_PER_PAGE = 10;

export function RecipesPage({ onSelectRecipe }: RecipesPageProps) {
  const { isAuthenticated, accessToken, anonymousUserId } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRecipes = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      // If searching, use search endpoint
      if (searchQuery.trim()) {
         const response = await api.searchRecipes(
            searchQuery,
            anonymousUserId,
            accessToken
          );
          setRecipes(response.recipes);
          setTotalCount(response.total);
          // Search endpoint currently returns all matches, so no pagination logic needed for now
          // If search pagination is added later, we'd handle it similarly to getRecipes
      } else {
        // Standard list with pagination
        const currentSkip = isLoadMore ? recipes.length : 0;
        const response = await api.getRecipes(
          currentSkip,
          ITEMS_PER_PAGE,
          anonymousUserId,
          accessToken
        );
        
        if (isLoadMore) {
          setRecipes(prev => [...prev, ...response.recipes]);
        } else {
          setRecipes(response.recipes);
        }
        setTotalCount(response.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [accessToken, anonymousUserId, searchQuery, recipes.length]);

  // Initial load when auth state settles
  useEffect(() => {
    // Reset state when auth changes or search query is cleared
    if (!searchQuery.trim()) {
        loadRecipes(false);
    }
  }, [accessToken, anonymousUserId]); // Intentionally excluded loadRecipes to avoid loops, relying on specific triggers

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    // The actual fetch happens in the effect or immediate call
    // For search we can call immediately to be responsive
    setIsLoading(true);
    setError(null);
    try {
        if (!query.trim()) {
            // Reset to normal list
            const response = await api.getRecipes(0, ITEMS_PER_PAGE, anonymousUserId, accessToken);
            setRecipes(response.recipes);
            setTotalCount(response.total);
        } else {
             const response = await api.searchRecipes(query, anonymousUserId, accessToken);
             setRecipes(response.recipes);
             setTotalCount(response.total);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
        setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteRecipe(id, anonymousUserId, accessToken);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      setTotalCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete recipe');
    }
  };

  const hasMore = !searchQuery.trim() && recipes.length < totalCount;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SEO title="My Recipes - Foodly" description="View and manage your saved recipes on Foodly." />
      <div className="mb-8 animate-fade-in">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
          My Recipes
        </h1>
        <p className="text-charcoal-600 dark:text-charcoal-400">
          {isAuthenticated 
            ? 'Your saved recipes, synced across devices'
            : 'Your saved recipes on this device'}
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading your recipes..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={() => loadRecipes(false)} />
      ) : (
        <>
          <RecipeList
            recipes={recipes}
            onSelect={onSelectRecipe}
            onDelete={handleDelete}
            onSearch={handleSearch}
          />
          
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => loadRecipes(true)}
                disabled={isLoadingMore}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-charcoal-800 hover:bg-gray-50 dark:hover:bg-charcoal-700 text-charcoal-900 dark:text-white rounded-full shadow-sm border border-cream-200 dark:border-charcoal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                    <ChevronDown className="w-5 h-5" />
                )}
                {isLoadingMore ? 'Loading...' : 'Load More Recipes'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
