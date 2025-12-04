import { Sparkles, ChefHat, Mic, Clock, BookOpen } from 'lucide-react';
import { RecipeForm } from '../components/RecipeForm';
import { SEO } from '../components/SEO';

interface HomePageProps {
  onProcessRecipe: (url: string) => void;
  isProcessing: boolean;
}

export function HomePage({ onProcessRecipe, isProcessing }: HomePageProps) {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      <SEO />
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8 md:py-16">
        <div className="max-w-3xl mx-auto w-full">
          {/* Hero Text */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Recipe Assistant
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 leading-tight">
              Cook with
              <span className="text-gradient"> Confidence</span>
            </h1>
            <p className="text-lg md:text-xl text-charcoal-600 dark:text-charcoal-400 max-w-2xl mx-auto">
              Transform any recipe URL or YouTube video into an interactive, 
              step-by-step cooking guide with voice control and audio narration.
            </p>
          </div>

          {/* Recipe Form */}
          <RecipeForm onSubmit={onProcessRecipe} isLoading={isProcessing} />

          {/* Features */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            {[
              { icon: ChefHat, label: 'Step-by-Step', desc: 'Clear instructions' },
              { icon: Mic, label: 'Voice Control', desc: 'Hands-free cooking' },
              { icon: Clock, label: 'Screen Lock', desc: 'Keep display on' },
              { icon: BookOpen, label: 'Save Recipes', desc: 'Build collection' },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="text-center p-4 rounded-xl bg-white/50 dark:bg-charcoal-900/50 border border-cream-200 dark:border-charcoal-800"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-sage-100 to-sage-200 dark:from-sage-900/50 dark:to-sage-800/50 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-sage-600 dark:text-sage-400" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{label}</h3>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 bg-pattern opacity-50" />
    </div>
  );
}

