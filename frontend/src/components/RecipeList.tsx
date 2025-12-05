import { useState } from 'react';
import { Search, Clock, ChefHat, Youtube, Globe, Trash2, ExternalLink, Play, AlertCircle } from 'lucide-react';
import { Recipe } from '../types';

interface RecipeListProps {
  recipes: Recipe[];
  onSelect: (recipe: Recipe) => void;
  onDelete: (id: number) => void;
  onSearch: (query: string) => void;
}

export function RecipeList({ recipes, onSelect, onDelete, onSearch }: RecipeListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-charcoal-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your recipes..."
          className="block w-full pl-11 pr-20 py-3 sm:text-sm bg-white dark:bg-charcoal-800 border border-cream-200 dark:border-charcoal-700 rounded-2xl leading-5 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-sage-400 shadow-sm transition duration-150 ease-in-out"
        />
        <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
          <button 
            type="submit" 
            className="inline-flex items-center px-4 rounded-xl text-sm font-medium text-white bg-sage-500 hover:bg-sage-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sage-500 shadow-sm transition-all"
          >
            Search
          </button>
        </div>
      </form>

      {recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-20 h-20 bg-cream-100 dark:bg-charcoal-800 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
            <ChefHat className="w-10 h-10 text-sage-500" />
          </div>
          <h3 className="text-xl font-display font-bold mb-2">No recipes found</h3>
          <p className="text-charcoal-500 dark:text-charcoal-400 max-w-xs mx-auto mb-8">
            Get started by adding a recipe from any website or YouTube video!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe, index) => (
            <div
              key={recipe.id}
              onClick={() => onSelect(recipe)}
              className="group relative bg-white dark:bg-charcoal-900 rounded-3xl shadow-sm border border-cream-200 dark:border-charcoal-800 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Image Container */}
              <div className="aspect-[16/9] relative overflow-hidden">
                {recipe.image_url ? (
                  <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-sage-100 to-cream-100 dark:from-charcoal-800 dark:to-charcoal-900 flex items-center justify-center">
                    <ChefHat className="w-12 h-12 text-sage-300 dark:text-charcoal-600" />
                  </div>
                )}
                
                {/* Source Badge */}
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white/90 dark:bg-charcoal-900/90 backdrop-blur-sm shadow-sm">
                    {recipe.source_type === 'youtube' ? (
                      <>
                        <Youtube className="w-3.5 h-3.5 text-red-500 mr-1.5" />
                        YouTube
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5 text-sage-500 mr-1.5" />
                        Web
                      </>
                    )}
                  </span>
                </div>

                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur text-sage-600 flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-all duration-300">
                    <Play className="w-5 h-5 fill-current ml-1" />
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-3">
                  <h3 className="font-display text-lg font-bold leading-tight line-clamp-2 mb-2 group-hover:text-sage-600 dark:group-hover:text-sage-400 transition-colors">
                    {recipe.title}
                  </h3>
                  {recipe.description && (
                    <p className="text-sm text-charcoal-500 dark:text-charcoal-400 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-charcoal-500 dark:text-charcoal-400 mb-5">
                  {recipe.total_time && (
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-sage-500" />
                      {recipe.total_time}
                    </div>
                  )}
                  {recipe.servings && (
                    <div className="flex items-center">
                      <ChefHat className="w-3.5 h-3.5 mr-1.5 text-sage-500" />
                      {recipe.servings}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-cream-100 dark:border-charcoal-800/50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(recipe);
                    }}
                    className="flex-1 btn-primary py-2 text-sm shadow-none bg-sage-100 text-sage-700 hover:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-300 dark:hover:bg-sage-900/50"
                  >
                    Cook Now
                  </button>
                  
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-xl text-charcoal-400 hover:bg-cream-100 hover:text-sage-600 dark:hover:bg-charcoal-800 transition-colors"
                    title="View original"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(recipe.id);
                    }}
                    className="p-2 rounded-xl text-charcoal-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete recipe"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 animate-scale-up">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mb-4">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Recipe?</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                        Are you sure you want to delete this recipe? This action cannot be undone.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            onDelete(showDeleteConfirm);
                            setShowDeleteConfirm(null);
                        }}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}