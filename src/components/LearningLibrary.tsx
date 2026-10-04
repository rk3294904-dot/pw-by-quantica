import { useState } from 'react';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import type { LectureProgress } from '@/types';

export function LearningLibrary({ progress, onResume }: {
  progress: LectureProgress[];
  onResume: (entry: LectureProgress) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  if (progress.length === 0) return null;
  const completed = progress.filter((entry) => entry.completed).length;
  const inProgress = progress.filter((entry) => !entry.completed);
  const displayed = showAll ? progress : inProgress.slice(0, 4);

  return (
    <section aria-labelledby="learning-library-title" className="mb-8 rounded-2xl border border-slate-700/50 bg-slate-800/20 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="learning-library-title" className="text-lg font-semibold text-white">Your learning</h2>
          <p className="mt-1 text-xs text-slate-400">{inProgress.length} in progress · {completed} completed</p>
        </div>
        <button type="button" onClick={() => setShowAll((current) => !current)} aria-expanded={showAll}
          className="rounded-lg px-3 py-2 text-sm text-cyan-300 transition hover:bg-slate-700/40">
          {showAll ? 'Show continue learning' : 'View all saved lectures'}
        </button>
      </div>
      {displayed.length === 0 ? (
        <p className="text-sm text-slate-400">All your saved lectures are completed. Choose a new lecture to keep learning.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {displayed.map((entry) => {
            const percent = entry.duration > 0 ? Math.min(100, Math.round(entry.position / entry.duration * 100)) : 0;
            return (
              <button type="button" key={`${entry.batchId}:${entry.subjectId}:${entry.lectureId}`}
                onClick={() => onResume(entry)}
                className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4 text-left transition hover:border-cyan-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">
                <p className="line-clamp-1 text-xs text-slate-400">{entry.batchName} · {entry.subjectName}</p>
                <h3 className="mt-1.5 line-clamp-2 text-sm font-medium text-white">{entry.title}</h3>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  <span className={entry.completed ? 'text-emerald-400' : 'text-slate-400'}>
                    {entry.completed ? 'Completed' : `${Math.floor(entry.position / 60)} min watched · ${percent}%`}
                  </span>
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    {entry.completed ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    {entry.completed ? 'Watch again' : 'Resume'}
                  </span>
                </div>
                <div role="progressbar" aria-label={entry.title} aria-valuemin={0} aria-valuemax={100}
                  aria-valuenow={entry.completed ? 100 : percent} className="mt-3 h-1 overflow-hidden rounded-full bg-slate-700">
                  <div className={entry.completed ? 'h-full bg-emerald-400' : 'h-full bg-cyan-400'}
                    style={{ width: `${entry.completed ? 100 : percent}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
