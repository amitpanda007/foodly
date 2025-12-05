import { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  ExternalLink, 
  Share2, 
  ChevronDown,
  Check
} from 'lucide-react';
import { Recipe, Step } from '../types';
import { StepNavigator } from './StepNavigator';
import { IngredientsList } from './IngredientsList';
import { SEO } from './SEO';
import { SaveRecipeButton } from './SaveRecipeButton';

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
      <main className="pb-28 lg:pb-12">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <div className="rounded-3xl bg-white dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-800 shadow-xl overflow-hidden">
            {/* Recipe Hero - Compact on mobile */}
            <div className="border-b border-cream-200 dark:border-charcoal-800">
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
              <div className="px-4 py-4 lg:px-6 lg:py-5">
                <h2 className="text-xl sm:text-2xl font-bold text-charcoal-900 dark:text-white mb-3 leading-tight">
                  {recipe.title}
                </h2>
                
                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
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
                  
                  {/* Save button for shared recipes */}
                  <SaveRecipeButton recipe={recipe} className="ml-auto" />
                </div>
              </div>
            </div>

            {/* Steps Area - mobile/tablet single column */}
            <div className="lg:hidden px-4 py-6">
              <StepNavigator steps={augmentedSteps} />
            </div>

            {/* Desktop layout: steps + ingredients side-by-side */}
            <div className="hidden lg:grid px-6 py-8 grid-cols-3 gap-6">
              <div className="col-span-2">
                <div className="rounded-2xl bg-white/90 dark:bg-charcoal-900/90 border border-cream-200 dark:border-charcoal-800 shadow-lg shadow-emerald-500/5">
                  <StepNavigator steps={augmentedSteps} />
                </div>
              </div>
              <div className="col-span-1">
                <div className="sticky top-24 space-y-4">
                  <div className="rounded-2xl bg-white dark:bg-charcoal-900 border border-cream-200 dark:border-charcoal-800 shadow-md p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🥗</span>
                        <div>
                          <p className="text-sm font-semibold text-charcoal-900 dark:text-white">Ingredients</p>
                          <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
                            {checkedIngredients.size} of {recipe.ingredients.length} ready
                          </p>
                        </div>
                      </div>
                      <div className="w-20 h-2 bg-cream-200 dark:bg-charcoal-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sage-500 transition-all duration-300"
                          style={{ width: `${ingredientProgress}%` }}
                        />
                      </div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                      <IngredientsList
                        ingredients={recipe.ingredients}
                        checkedItems={checkedIngredients}
                        onToggleItem={toggleIngredient}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Ingredients Toggle - minimized by default (mobile/tablet only) */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur border-t border-cream-200 dark:border-charcoal-800 shadow-lg transition-all duration-300 lg:hidden">
        <button
          onClick={() => setShowIngredients((v) => !v)}
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
            <div className="w-20 h-2 bg-cream-200 dark:bg-charcoal-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sage-500 transition-all duration-300"
                style={{ width: `${ingredientProgress}%` }}
              />
            </div>
            <ChevronDown className={`w-5 h-5 text-charcoal-400 transition-transform ${showIngredients ? '' : 'rotate-180'}`} />
          </div>
        </button>

        {showIngredients && (
          <div className="border-t border-cream-200 dark:border-charcoal-800 max-h-[45vh] overflow-y-auto px-4 pb-4">
            <div className="py-3">
              <IngredientsList
                ingredients={recipe.ingredients}
                checkedItems={checkedIngredients}
                onToggleItem={toggleIngredient}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
