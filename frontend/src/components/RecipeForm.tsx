import { useState } from 'react';
import { Link2, Youtube, Loader2, Sparkles, ChefHat } from 'lucide-react';

interface RecipeFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export function RecipeForm({ onSubmit, isLoading }: RecipeFormProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onSubmit(url.trim());
    }
  };

  const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');

  return (
    <div className="card relative overflow-hidden p-6 md:p-10 animate-fade-in border border-cream-200 dark:border-charcoal-800 shadow-xl">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-sage-100 dark:bg-sage-900/20 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-terracotta-100 dark:bg-terracotta-900/20 rounded-full blur-3xl opacity-50"></div>

      <div className="relative z-10 text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-100 to-cream-100 dark:from-charcoal-800 dark:to-charcoal-700 mb-6 shadow-inner">
          <ChefHat className="w-8 h-8 text-sage-600 dark:text-sage-400" />
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-charcoal-900 to-charcoal-600 dark:from-cream-100 dark:to-cream-300">
          What are we cooking?
        </h2>
        <p className="text-charcoal-600 dark:text-charcoal-400 text-lg max-w-md mx-auto leading-relaxed">
          Paste a recipe URL or YouTube video link below to transform it into an interactive guide.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10 max-w-xl mx-auto">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {isYoutube ? (
              <Youtube className="h-6 w-6 text-red-500 transition-colors duration-300" />
            ) : (
              <Link2 className="h-6 w-6 text-sage-500 transition-colors duration-300" />
            )}
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/recipe or YouTube link..."
            className="block w-full pl-12 pr-4 py-4 text-lg bg-white dark:bg-charcoal-900/50 border-2 border-cream-200 dark:border-charcoal-700 rounded-2xl placeholder-charcoal-300 focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-400/10 transition-all duration-300 shadow-sm group-hover:border-sage-300 dark:group-hover:border-charcoal-600"
            disabled={isLoading}
            required
          />
        </div>

        <button
          type="submit"
          disabled={!url.trim() || isLoading}
          className="w-full py-4 px-6 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-400 hover:to-sage-500 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-sage-500/25 hover:shadow-sage-500/40 transition-all duration-300 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Processing Recipe...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              Generate Guide
            </>
          )}
        </button>
      </form>

      <div className="mt-8 flex flex-wrap justify-center gap-3 relative z-10">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-sage-50 text-sage-700 dark:bg-sage-900/30 dark:text-sage-300 border border-sage-100 dark:border-sage-900/50">
          <Link2 className="w-3 h-3 mr-1.5" />
          Any Recipe Website
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-100 dark:border-red-900/50">
          <Youtube className="w-3 h-3 mr-1.5" />
          YouTube Videos
        </span>
      </div>
    </div>
  );
}


