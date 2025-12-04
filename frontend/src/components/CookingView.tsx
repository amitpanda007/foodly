import { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  ExternalLink, 
  Share2, 
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import { Recipe, Step } from '../types';
import { StepNavigator } from './StepNavigator';
import { IngredientsList } from './IngredientsList';
import { SEO } from './SEO';

interface CookingViewProps {
  recipe: Recipe;
  onBack: () => void;
}

export function CookingView({ recipe, onBack }: CookingViewProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [showCopied, setShowCopied] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);

  // Augment steps with Intro and Outro (no tips for these)
  const augmentedSteps = useMemo(() => {
    const stepsList: Step[] = [];
    
    if (recipe.intro_text || recipe.intro_audio_url) {
      stepsList.push({
        number: 0,
        instruction: recipe.intro_text || recipe.description || "Welcome to this recipe! Let's get started.",
        audio_url: recipe.intro_audio_url,
      });
    }

    stepsList.push(...recipe.steps);

    if (recipe.outro_text || recipe.outro_audio_url) {
      stepsList.push({
        number: recipe.steps.length + 1,
        instruction: recipe.outro_text || "Serve hot and enjoy your meal!",
        audio_url: recipe.outro_audio_url,
      });
    }
    
    return stepsList.length > 0 ? stepsList : recipe.steps;
  }, [recipe]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/recipes/${recipe.id}`;
    
    const shareData = {
      title: `${recipe.title} - Foodly`,
      text: `Cook "${recipe.title}" step-by-step with Foodly!`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const ingredientProgress = recipe.ingredients.length > 0 
    ? Math.round((checkedIngredients.size / recipe.ingredients.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-charcoal-950">
      <SEO 
        title={`${recipe.title} - Foodly`}
        description={`Follow step-by-step cooking instructions for ${recipe.title}.`}
        image={recipe.image_url || ''}
      />

      {/* Copied Toast */}
      {showCopied && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
          <div className="flex items-center gap-2 bg-sage-600 text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium">
            <Check className="w-4 h-4" />
            Link copied!
          </div>
          </div>
        )}
        
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-sm border-b border-cream-200 dark:border-charcoal-800">
        <div className="flex items-center justify-between px-4 h-14">
              <button
                onClick={onBack}
            className="flex items-center gap-2 text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-white transition-colors"
              >
            <ArrowLeft className="w-5 h-5" />
            <span className="sr-only sm:not-sr-only text-sm font-medium">Back</span>
              </button>
          
          <h1 className="flex-1 text-center text-sm font-semibold text-charcoal-900 dark:text-white truncate px-4">
            {recipe.title}
          </h1>

          <div className="flex items-center gap-1">
             <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-charcoal-500 hover:text-sage-600 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg text-charcoal-500 hover:text-sage-600 hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-all"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-24 lg:pb-8">
        {/* Recipe Hero - Compact on mobile */}
        <div className="bg-white dark:bg-charcoal-900 border-b border-cream-200 dark:border-charcoal-800">
          {recipe.image_url && (
            <div className="relative h-40 sm:h-52 lg:h-64">
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}
          
          {/* Recipe Meta */}
          <div className="px-4 py-4">
            <h2 className="text-xl sm:text-2xl font-bold text-charcoal-900 dark:text-white mb-3 leading-tight">
              {recipe.title}
            </h2>
            
            {/* Stats Row */}
            <div className="flex flex-wrap gap-3 text-sm">
              {recipe.total_time && (
                <div className="flex items-center gap-1.5 text-charcoal-600 dark:text-charcoal-400">
                  <Clock className="w-4 h-4 text-sage-600" />
                  <span>{recipe.total_time}</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-1.5 text-charcoal-600 dark:text-charcoal-400">
                  <Users className="w-4 h-4 text-sage-600" />
                  <span>{recipe.servings}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4 py-6">
          {/* Ingredients Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-white dark:bg-charcoal-900 rounded-2xl border border-cream-200 dark:border-charcoal-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-cream-200 dark:border-charcoal-800">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-charcoal-900 dark:text-white">Ingredients</h3>
                  <span className="text-sm text-sage-600 font-medium">{ingredientProgress}%</span>
                </div>
                <div className="mt-2 h-1.5 bg-cream-200 dark:bg-charcoal-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-sage-500 transition-all duration-300 rounded-full"
                    style={{ width: `${ingredientProgress}%` }}
                  />
                </div>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <IngredientsList
                  ingredients={recipe.ingredients}
                  checkedItems={checkedIngredients}
                  onToggleItem={toggleIngredient}
                />
              </div>
            </div>
          </div>

          {/* Steps Main Area */}
          <div className="lg:col-span-2">
            <StepNavigator steps={augmentedSteps} />
          </div>
        </div>

        {/* Mobile Layout - Steps Only */}
        <div className="lg:hidden px-4 py-4">
          <StepNavigator steps={augmentedSteps} />
        </div>
      </main>

      {/* Mobile Bottom Bar - Ingredients Toggle */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-charcoal-900 border-t border-cream-200 dark:border-charcoal-800 safe-area-bottom">
        <button
          onClick={() => setShowIngredients(true)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center">
              <span className="text-lg">🥗</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-charcoal-900 dark:text-white">Ingredients</p>
              <p className="text-xs text-charcoal-500">{checkedIngredients.size} of {recipe.ingredients.length} ready</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-2 bg-cream-200 dark:bg-charcoal-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sage-500 transition-all duration-300"
                style={{ width: `${ingredientProgress}%` }}
              />
            </div>
            <ChevronDown className="w-5 h-5 text-charcoal-400 rotate-180" />
          </div>
        </button>
      </div>

      {/* Mobile Ingredients Modal */}
      {showIngredients && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowIngredients(false)}
          />
          
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-charcoal-900 rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up safe-area-bottom">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-charcoal-300 dark:bg-charcoal-700 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-cream-200 dark:border-charcoal-800">
              <div>
                <h3 className="text-lg font-semibold text-charcoal-900 dark:text-white">Ingredients</h3>
                <p className="text-sm text-charcoal-500">{checkedIngredients.size} of {recipe.ingredients.length} ready</p>
              </div>
              <button
                onClick={() => setShowIngredients(false)}
                className="p-2 rounded-lg hover:bg-cream-100 dark:hover:bg-charcoal-800 transition-colors"
              >
                <X className="w-5 h-5 text-charcoal-500" />
              </button>
            </div>
            
            {/* Progress */}
            <div className="px-4 py-3 bg-cream-50 dark:bg-charcoal-800/50">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-charcoal-600 dark:text-charcoal-400">Progress</span>
                <span className="font-semibold text-sage-600">{ingredientProgress}%</span>
              </div>
              <div className="h-2 bg-cream-200 dark:bg-charcoal-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sage-500 transition-all duration-300 rounded-full"
                  style={{ width: `${ingredientProgress}%` }}
                />
                  </div>
               </div>
               
            {/* List */}
            <div className="flex-1 overflow-y-auto p-4">
              <IngredientsList
                ingredients={recipe.ingredients}
                checkedItems={checkedIngredients}
                onToggleItem={toggleIngredient}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
