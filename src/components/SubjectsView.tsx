import { useState, useMemo } from 'react';
import { Search, BookOpen, X, User } from 'lucide-react';
import type { BatchDetails, Subject } from '@/types';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/States';

interface Props {
  details: BatchDetails | null;
  loading: boolean;
  error: string | null;
  onSelect: (id: string, name: string) => void;
  onRetry: () => void;
}

export function SubjectsView({ details, loading, error, onSelect, onRetry }: Props) {
  const [query, setQuery] = useState('');

  const subjects = details?.subjects ?? [];

  const filtered = useMemo(() => {
    if (!query.trim()) return subjects;
    const q = query.toLowerCase();
    return subjects.filter(
      (s) =>
        s.subject.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
    );
  }, [subjects, query]);

  if (loading) return <LoadingSpinner message="Loading subjects..." />;
  if (error)
    return (
      <ErrorState message={`Failed to load subjects: ${error}`} onRetry={onRetry} />
    );
  if (!details) return null;

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{details.name}</h1>
        {details.byName && (
          <p className="mt-1.5 text-sm text-slate-400">{details.byName}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="rounded-md bg-slate-700/40 px-2.5 py-1 text-slate-300">
            {details.language}
          </span>
          {details.exam && (
            <span className="rounded-md bg-slate-700/40 px-2.5 py-1 text-slate-300">
              {details.exam}
            </span>
          )}
          <span className="rounded-md bg-slate-700/40 px-2.5 py-1 text-slate-300">
            {subjects.length} subjects
          </span>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search subjects..."
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
          icon={<BookOpen className="h-12 w-12" />}
          title="No subjects found"
          message={
            query
              ? `No subjects match "${query}". Try a different search.`
              : 'This batch has no subjects available yet.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((subject) => (
            <SubjectCard
              key={subject._id}
              subject={subject}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectCard({
  subject,
  onSelect,
}: {
  subject: Subject;
  onSelect: (id: string, name: string) => void;
}) {
  const teacher = subject.teacherIds?.[0];
  const imgUrl = subject.imageId
    ? `${subject.imageId.baseUrl}${subject.imageId.key}`
    : null;

  return (
    <button
      onClick={() => onSelect(subject._id, subject.subject)}
      className="group flex items-start gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4 text-left transition-all duration-300 hover:border-blue-500/50 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.98]"
    >
      <div className="flex-shrink-0">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={subject.subject}
            loading="lazy"
            className="h-14 w-14 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-slate-700">
            <BookOpen className="h-7 w-7 text-blue-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 group-hover:text-blue-400 transition">
          {subject.subject}
        </h3>
        {teacher && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <User className="h-3 w-3" />
            {teacher.firstName} {teacher.lastName}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span>{subject.lectureCount} lectures</span>
          <span>{subject.tagCount} chapters</span>
        </div>
      </div>
    </button>
  );
}
