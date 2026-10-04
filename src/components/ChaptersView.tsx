import { useState, useMemo } from 'react';
import {
  Search,
  FolderOpen,
  X,
  FileText,
  Video,
  PencilLine,
  PlayCircle,
} from 'lucide-react';
import type { Chapter } from '@/types';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/States';

interface Props {
  chapters: Chapter[];
  loading: boolean;
  error: string | null;
  subjectName: string;
  onSelect: (id: string, name: string) => void;
  onRetry: () => void;
}

export function ChaptersView({
  chapters,
  loading,
  error,
  subjectName,
  onSelect,
  onRetry,
}: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return chapters;
    const q = query.toLowerCase();
    return chapters.filter((c) => c.name.toLowerCase().includes(q));
  }, [chapters, query]);

  if (loading) return <LoadingSpinner message="Loading chapters..." />;
  if (error)
    return (
      <ErrorState message={`Failed to load chapters: ${error}`} onRetry={onRetry} />
    );

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{subjectName}</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          {chapters.length} chapters — select a chapter to view its content
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chapters..."
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
          icon={<FolderOpen className="h-12 w-12" />}
          title="No chapters found"
          message={
            query
              ? `No chapters match "${query}". Try a different search.`
              : 'This subject has no chapters available yet.'
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((chapter, idx) => (
            <ChapterRow
              key={chapter._id}
              chapter={chapter}
              index={idx}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterRow({
  chapter,
  index,
  onSelect,
}: {
  chapter: Chapter;
  index: number;
  onSelect: (id: string, name: string) => void;
}) {
  const hasContent = chapter.videos > 0 || chapter.notes > 0 || chapter.exercises > 0;

  return (
    <button
      onClick={() => onSelect(chapter._id, chapter.name)}
      className="group flex w-full items-center gap-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 text-left transition-all duration-200 hover:border-blue-500/50 hover:bg-slate-800/60 active:scale-[0.99]"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-700/50 text-sm font-semibold text-slate-400 transition group-hover:bg-blue-500/20 group-hover:text-blue-400">
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white text-sm leading-snug line-clamp-1 group-hover:text-blue-400 transition">
          {chapter.name}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {chapter.videos > 0 && (
            <span className="flex items-center gap-1">
              <Video className="h-3.5 w-3.5" />
              {chapter.videos} videos
            </span>
          )}
          {chapter.notes > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {chapter.notes} notes
            </span>
          )}
          {chapter.exercises > 0 && (
            <span className="flex items-center gap-1">
              <PencilLine className="h-3.5 w-3.5" />
              {chapter.exercises} DPPs
            </span>
          )}
          {!hasContent && (
            <span className="text-slate-600">No content available</span>
          )}
        </div>
      </div>

      <PlayCircle className="h-5 w-5 flex-shrink-0 text-slate-600 transition group-hover:text-blue-400" />
    </button>
  );
}
