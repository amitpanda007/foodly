import { useState } from 'react';
import { Check, ShoppingBasket, ShoppingCart, ExternalLink, Loader2 } from 'lucide-react';
import { Ingredient, ShoppingItem } from '../types';

interface IngredientsListProps {
  ingredients: Ingredient[];
  checkedItems: Set<number>;
  onToggleItem: (index: number) => void;
  shoppingList: ShoppingItem[];
  loadingShopping: boolean;
}

export function IngredientsList({ 
  ingredients, 
  checkedItems, 
  onToggleItem, 
  shoppingList,
  loadingShopping 
}: IngredientsListProps) {
  const [expandedShopping, setExpandedShopping] = useState<number | null>(null);

  const getProducts = (name: string) => {
    return shoppingList.find(item => item.ingredient_name === name)?.products || [];
  };

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm">
            <ShoppingBasket className="w-5 h-5" />
          </div>
          Ingredients
          {loadingShopping && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-2" />}
        </h3>
        <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          {checkedItems.size} / {ingredients.length}
        </span>
      </div>

      <div className="space-y-3">
        {ingredients.map((ingredient, index) => {
          const isChecked = checkedItems.has(index);
          const products = getProducts(ingredient.name);
          const hasProducts = products.length > 0;
          const isExpanded = expandedShopping === index;

          return (
            <div
              key={index}
              className={`group w-full rounded-2xl text-left transition-all duration-200 border ${
                isChecked
                  ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
                  : 'bg-white/50 dark:bg-gray-800/50 border-transparent hover:bg-white dark:hover:bg-gray-800 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4 p-4">
                <button 
                    onClick={() => onToggleItem(index)}
                    className="flex-shrink-0 mt-0.5 focus:outline-none"
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    isChecked 
                      ? 'bg-emerald-500 border-emerald-500 scale-110' 
                      : 'border-gray-300 dark:border-gray-600 group-hover:border-emerald-400'
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                </button>
                
                <div 
                    className={`flex-1 transition-all duration-300 cursor-pointer ${isChecked ? 'opacity-50 blur-[0.5px]' : ''}`}
                    onClick={() => onToggleItem(index)}
                >
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

                {hasProducts && (
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       setExpandedShopping(isExpanded ? null : index);
                     }}
                     className={`p-2 rounded-full transition-all ${
                        isExpanded 
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' 
                        : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                     }`}
                     title="Buy ingredients"
                   >
                     <ShoppingCart className="w-5 h-5" />
                   </button>
                 )}
              </div>

              {isExpanded && hasProducts && (
                <div className="px-4 pb-4 pl-14 animate-in slide-in-from-top-2 fade-in-20">
                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-orange-100 dark:border-orange-900/20 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-orange-800 dark:text-orange-200 mb-2 uppercase tracking-wider">
                        <span>Available Online</span>
                        <span className="text-[10px] opacity-60">Auto-detected</span>
                      </div>
                      {products.map((product, i) => (
                        <a
                          key={i}
                          href={product.link || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg hover:shadow-sm border border-transparent hover:border-orange-200 dark:hover:border-orange-800 transition-all group/link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex-1 min-w-0 mr-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {product.title}
                              </div>
                              {product.source && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                    via {product.source}
                                </div>
                              )}
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover/link:text-orange-500 transition-colors" />
                        </a>
                      ))}
                    </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
