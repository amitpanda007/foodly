import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ title = 'Oops!', message, onRetry }: ErrorMessageProps) {
  return (
    <div className="card p-8 text-center animate-fade-in">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-charcoal-600 dark:text-charcoal-400 mb-6">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          <RefreshCw className="w-5 h-5" />
          Try Again
        </button>
      )}
    </div>
  );
}

