import { ChefHat } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-cream-200 dark:border-charcoal-700" />
        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-sage-500 border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <ChefHat className="w-8 h-8 text-sage-500 animate-bounce-soft" />
        </div>
      </div>
      <p className="mt-6 text-charcoal-600 dark:text-charcoal-400 font-medium">
        {message}
      </p>
      <div className="mt-2 flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-sage-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

