import { Check, ShoppingBasket } from 'lucide-react';
import { Ingredient } from '../types';

interface IngredientsListProps {
  ingredients: Ingredient[];
  checkedItems: Set<number>;
  onToggleItem: (index: number) => void;
}

export function IngredientsList({ ingredients, checkedItems, onToggleItem }: IngredientsListProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm">
            <ShoppingBasket className="w-5 h-5" />
          </div>
          Ingredients
        </h3>
        <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          {checkedItems.size} / {ingredients.length}
        </span>
      </div>

      <div className="space-y-3">
        {ingredients.map((ingredient, index) => {
          const isChecked = checkedItems.has(index);
          return (
            <button
              key={index}
              onClick={() => onToggleItem(index)}
              className={`group w-full flex items-start gap-4 p-4 rounded-2xl text-left transition-all duration-200 border ${
                isChecked
                  ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
                  : 'bg-white/50 dark:bg-gray-800/50 border-transparent hover:bg-white dark:hover:bg-gray-800 hover:shadow-md'
              }`}
            >
              <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                isChecked 
                  ? 'bg-emerald-500 border-emerald-500 scale-110' 
                  : 'border-gray-300 dark:border-gray-600 group-hover:border-emerald-400'
              }`}>
                {isChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </div>
              
              <div className={`flex-1 transition-all duration-300 ${isChecked ? 'opacity-50 blur-[0.5px]' : ''}`}>
                <span className={`text-lg font-medium ${isChecked ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                  {ingredient.amount && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold mr-1.5">
                      {ingredient.amount}
                      {ingredient.unit && <span className="text-sm font-semibold ml-1 text-emerald-600/80">{ingredient.unit}</span>}
                    </span>
                  )}
                  {!ingredient.amount && ingredient.name}
                </span>
                {ingredient.amount && <span className="text-gray-700 dark:text-gray-300"> {ingredient.name}</span>}
                
                {ingredient.notes && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                    {ingredient.notes}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


