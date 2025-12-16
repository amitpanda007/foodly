import { useState } from 'react';
import { Check, ShoppingBasket, ShoppingCart, ExternalLink, Loader2 } from 'lucide-react';
import { Ingredient, ShoppingItem } from '../types';

interface IngredientsListProps {
  ingredients: Ingredient[];
  checkedItems: Set<number>;
  onToggleItem: (index: number) => void;
  shoppingList: ShoppingItem[];
  loadingShopping: boolean;
  viewMode?: 'list' | 'grid';
  variant?: 'card' | 'plain';
}

export function IngredientsList({ 
  ingredients, 
  checkedItems, 
  onToggleItem, 
  shoppingList,
  loadingShopping,
  viewMode = 'list',
  variant = 'card'
}: IngredientsListProps) {
  const [expandedShopping, setExpandedShopping] = useState<number | null>(null);

  const getProducts = (name: string) => {
    return shoppingList.find(item => item.ingredient_name === name)?.products || [];
  };

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-4">
        {ingredients.map((ingredient, index) => {
          const products = getProducts(ingredient.name);
          const hasProducts = products.length > 0;
          
          return (
            <div 
              key={index}
              onClick={() => onToggleItem(index)}
              className={`
                relative p-4 rounded-[2rem] border-2 transition-all cursor-pointer aspect-square flex flex-col items-center justify-center text-center gap-2
                ${checkedItems.has(index) 
                  ? 'border-charcoal-900 bg-cream-50 dark:border-white dark:bg-charcoal-800' 
                  : 'border-cream-100 bg-white hover:border-sage-500 hover:shadow-lg dark:border-charcoal-800 dark:bg-charcoal-900 dark:hover:border-sage-400'
                }
              `}
            >
              {/* Placeholder Icon */}
              <div className="w-12 h-12 mb-1">
                 {/* In a real app, map ingredient name to an icon/image. Using generic here */}
                 <ShoppingBasket className={`w-full h-full ${checkedItems.has(index) ? 'text-charcoal-900 dark:text-white' : 'text-charcoal-300 dark:text-charcoal-600'}`} strokeWidth={1.5} />
              </div>
              
              <h4 className="font-bold text-charcoal-900 dark:text-white leading-tight line-clamp-2">
                {ingredient.name}
              </h4>
              
              {ingredient.amount && (
                <span className="text-sm font-medium text-sage-600 dark:text-sage-400">
                  {ingredient.amount} {ingredient.unit}
                </span>
              )}

              {/* Shopping Indicator */}
              {hasProducts && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-sage-500 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const listContent = (
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
                ? 'bg-cream-50 border-cream-200 dark:bg-charcoal-800 dark:border-charcoal-700'
                : 'bg-white border-transparent hover:border-cream-100 hover:shadow-md dark:bg-charcoal-900 dark:hover:border-charcoal-700'
            }`}
          >
            <div className="flex items-start gap-4 p-4">
              <button 
                  onClick={() => onToggleItem(index)}
                  className="flex-shrink-0 mt-0.5 focus:outline-none"
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  isChecked 
                    ? 'bg-charcoal-900 border-charcoal-900 scale-110 dark:bg-white dark:border-white' 
                    : 'border-cream-300 group-hover:border-charcoal-900 dark:border-charcoal-600 dark:group-hover:border-white'
                }`}>
                  {isChecked && <Check className="w-3.5 h-3.5 text-white dark:text-charcoal-900 stroke-[3]" />}
                </div>
              </button>
              
              <div 
                  className={`flex-1 transition-all duration-300 cursor-pointer ${isChecked ? 'opacity-50 blur-[0.5px]' : ''}`}
                  onClick={() => onToggleItem(index)}
              >
                <span className={`text-lg font-medium ${isChecked ? 'line-through text-charcoal-500 dark:text-charcoal-500' : 'text-charcoal-900 dark:text-white'}`}>
                  {ingredient.amount && (
                    <span className="text-charcoal-900 dark:text-white font-bold mr-1.5">
                      {ingredient.amount}
                      {ingredient.unit && <span className="text-sm font-semibold ml-1 text-charcoal-700 dark:text-charcoal-300">{ingredient.unit}</span>}
                    </span>
                  )}
                  {!ingredient.amount && ingredient.name}
                </span>
                {ingredient.amount && <span className="text-charcoal-700 dark:text-charcoal-300"> {ingredient.name}</span>}
                
                {ingredient.notes && (
                  <p className="text-sm text-charcoal-500 dark:text-charcoal-400 mt-1 italic">
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
                      ? 'bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-400' 
                      : 'text-charcoal-400 hover:text-sage-600 hover:bg-sage-50 dark:text-charcoal-500 dark:hover:text-sage-400'
                   }`}
                   title="Buy ingredients"
                 >
                   <ShoppingCart className="w-5 h-5" />
                 </button>
               )}
            </div>

            {isExpanded && hasProducts && (
              <div className="px-4 pb-4 animate-in slide-in-from-top-2 fade-in-20 w-full">
                <div className="p-4 bg-cream-50/80 dark:bg-charcoal-800/80 rounded-2xl border border-cream-100 dark:border-charcoal-700 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-charcoal-500 dark:text-charcoal-400 uppercase tracking-wider">
                    <span>Buy ingredient</span>
                    <span className="text-[10px] opacity-60">Matches for your region</span>
                  </div>
                  <div className="space-y-2">
                    {products.map((product, i) => (
                      <a
                        key={i}
                        href={product.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-xl border border-cream-200 dark:border-charcoal-700 bg-white dark:bg-charcoal-900 hover:-translate-y-[1px] hover:shadow-md transition-all group/link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-charcoal-900 dark:text-white leading-snug truncate">
                              {product.title || 'View product'}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-charcoal-500 dark:text-charcoal-400">
                              {product.source && (
                                <span className="px-2 py-0.5 rounded-full bg-cream-100 dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300 border border-cream-200 dark:border-charcoal-700 font-medium">
                                  {product.source}
                                </span>
                              )}
                              {product.price && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {product.price}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-center">
                            <span className="text-xs font-bold text-sage-600 dark:text-sage-400 group-hover/link:underline">View</span>
                            <ExternalLink className="w-4 h-4 text-charcoal-400 group-hover/link:text-sage-600 transition-colors" />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (variant === 'plain') {
    return listContent;
  }

  return (
    <div className="bg-white dark:bg-charcoal-900 rounded-[2rem] p-6 shadow-sm border border-cream-100 dark:border-charcoal-800">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-2xl font-bold flex items-center gap-3 text-charcoal-900 dark:text-white">
          <div className="w-10 h-10 rounded-xl bg-sage-50 dark:bg-sage-900/20 flex items-center justify-center text-sage-600 dark:text-sage-400 shadow-sm">
            <ShoppingBasket className="w-5 h-5" />
          </div>
          Ingredients
          {loadingShopping && <Loader2 className="w-4 h-4 animate-spin text-charcoal-400 ml-2" />}
        </h3>
        <span className="px-3 py-1 rounded-full bg-cream-100 dark:bg-charcoal-800 text-sm font-medium text-charcoal-600 dark:text-charcoal-400 border border-cream-200 dark:border-charcoal-700">
          {checkedItems.size} / {ingredients.length}
        </span>
      </div>

      {listContent}
    </div>
  );
}
