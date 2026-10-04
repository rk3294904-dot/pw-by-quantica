import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      {message && (
        <p className="mt-4 text-sm text-slate-400">{message}</p>
      )}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertCircle className="h-12 w-12 text-red-400" />
      <p className="mt-4 text-sm text-slate-300 max-w-md text-center">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="text-slate-600">{icon}</div>
      <p className="mt-4 text-lg font-medium text-slate-300">{title}</p>
      <p className="mt-1 text-sm text-slate-500 max-w-sm text-center">{message}</p>
    </div>
  );
}
