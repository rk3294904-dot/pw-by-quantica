import { useMemo, useState, useEffect } from 'react';
import { Search, BookOpen, X, ChevronDown } from 'lucide-react';
import type { Batch } from '@/types';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/States';

interface Props {
  batches: Batch[];
  loading: boolean;
  error: string | null;
  onSelect: (id: string, name: string) => void;
  onRetry: () => void;
}

const PAGE_SIZE = 24;

export function BatchesView({ batches, loading, error, onSelect, onRetry }: Props) {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!query.trim()) return batches;
    const q = query.toLowerCase();
    return batches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.byName || '').toLowerCase().includes(q)
    );
  }, [batches, query]);

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  if (loading) return <LoadingSpinner message="Loading study batches..." />;
  if (error)
    return (
      <ErrorState message={`Failed to load batches: ${error}`} onRetry={onRetry} />
    );

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Study Batches
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          {batches.length} batches available — find your course and start learning
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search batches by name or category..."
          className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="No batches found"
          message={`No batches match "${query}". Try a different search term.`}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((batch) => (
              <BatchCard key={batch._id} batch={batch} onSelect={onSelect} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/40 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800/70 hover:text-white"
              >
                Load More
                <ChevronDown className="h-4 w-4" />
              </button>
              <p className="text-xs text-slate-600">
                Showing {visible.length} of {filtered.length}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BatchCard({
  batch,
  onSelect,
}: {
  batch: Batch;
  onSelect: (id: string, name: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(batch._id, batch.name)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/30 text-left transition-all duration-300 hover:border-blue-500/50 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.98]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-800">
        {batch.previewImage ? (
          <img
            src={batch.previewImage}
            alt={batch.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <BookOpen className="h-10 w-10 text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm">
          {batch.language}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-white text-base leading-snug line-clamp-2 group-hover:text-blue-400 transition">
          {batch.name}
        </h3>
        {batch.byName && (
          <p className="mt-1 text-sm text-slate-400 line-clamp-1">{batch.byName}</p>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <span className="rounded-md bg-slate-700/40 px-2 py-0.5">
            {batch.type}
          </span>
          <span>Starts {batch.startDate}</span>
        </div>
      </div>
    </button>
  );
}
