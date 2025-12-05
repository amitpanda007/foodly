import { useEffect, useState, useCallback } from 'react';
import { Recipe } from '../types';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { RecipeList } from '../components/RecipeList';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { SEO } from '../components/SEO';

interface RecipesPageProps {
  onSelectRecipe: (recipe: Recipe) => void;
}

export function RecipesPage({ onSelectRecipe }: RecipesPageProps) {
  const { isAuthenticated, accessToken, anonymousUserId } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getRecipes(
        0,
        50,
        anonymousUserId,
        accessToken
      );
      setRecipes(response.recipes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, anonymousUserId]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      loadRecipes();
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await api.searchRecipes(
        query,
        anonymousUserId,
        accessToken
      );
      setRecipes(response.recipes);
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
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete recipe');
    }
  };

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
        <ErrorMessage message={error} onRetry={loadRecipes} />
      ) : (
        <RecipeList
          recipes={recipes}
          onSelect={onSelectRecipe}
          onDelete={handleDelete}
          onSearch={handleSearch}
        />
      )}
    </div>
  );
}
