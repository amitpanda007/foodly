import { useState } from 'react';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Recipe } from '../types';

interface SaveRecipeButtonProps {
  recipe: Recipe;
  onSaved?: (newRecipe: Recipe) => void;
  className?: string;
}

export function SaveRecipeButton({ recipe, onSaved, className = '' }: SaveRecipeButtonProps) {
  const { isAuthenticated, accessToken, anonymousUserId } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this is the user's own recipe
  const isOwnRecipe = isAuthenticated
    ? recipe.user_id !== null
    : recipe.anonymous_user_id === anonymousUserId;

  if (isOwnRecipe) {
    return null; // Don't show save button for own recipes
  }

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const newRecipe = await api.saveRecipe(
        { recipe_id: recipe.id },
        anonymousUserId,
        accessToken
      );
      setIsSaved(true);
      onSaved?.(newRecipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaved) {
    return (
      <button
        disabled
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium ${className}`}
      >
        <Check className="w-4 h-4" />
        Saved!
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <BookmarkPlus className="w-4 h-4" />
            Save to My Recipes
          </>
        )}
      </button>
      {error && (
        <p className="absolute top-full left-0 mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

