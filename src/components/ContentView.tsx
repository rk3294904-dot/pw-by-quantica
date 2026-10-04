import { useEffect, useState, useMemo } from 'react';
import {
  Video,
  FileText,
  PencilLine,
  PlayCircle,
  Download,
  ExternalLink,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import type { Lecture, Homework } from '@/types';
import { fetchLectures } from '@/services/api';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/States';

type TabKey = 'videos' | 'notes' | 'dpp_notes' | 'dpp_videos';

interface Props {
  batchId: string;
  subjectId: string;
  chapterId: string;
  chapterName: string;
  onPlay: (lecture: Lecture) => void;
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode; contentType: string }[] = [
  { key: 'videos', label: 'Videos', icon: <Video className="h-4 w-4" />, contentType: 'LECTURES' },
  { key: 'notes', label: 'Notes', icon: <FileText className="h-4 w-4" />, contentType: 'NOTES' },
  { key: 'dpp_notes', label: 'DPP Notes', icon: <PencilLine className="h-4 w-4" />, contentType: 'NOTES' },
  { key: 'dpp_videos', label: 'DPP Videos', icon: <ClipboardList className="h-4 w-4" />, contentType: 'LECTURES' },
];

export function ContentView({ batchId, subjectId, chapterId, chapterName, onPlay }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('videos');
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const tab = TABS.find((t) => t.key === activeTab)!;

  useEffect(() => {
    let cancelled = false;
    setLectures([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
    setError(null);

    fetchLectures(batchId, subjectId, tab.contentType, chapterId, 1)
      .then((res) => {
        if (cancelled) return;
        setLectures(res.data);
        setLoading(false);
        setHasMore(res.data.length >= 10);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load content');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [batchId, subjectId, chapterId, activeTab, tab.contentType]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    fetchLectures(batchId, subjectId, tab.contentType, chapterId, nextPage)
      .then((res) => {
        setLectures((prev) => [...prev, ...res.data]);
        setPage(nextPage);
        setHasMore(res.data.length >= 10);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  };

  const filteredLectures = useMemo(
    () => filterLectures(lectures, activeTab),
    [lectures, activeTab]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white sm:text-2xl line-clamp-2">
          {chapterName}
        </h1>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-800/30 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message={`Loading ${tab.label}...`} />
      ) : error ? (
        <ErrorState message={error} />
      ) : filteredLectures.length === 0 ? (
        <EmptyState
          icon={tab.icon}
          title={`No ${tab.label} available`}
          message={`There are no ${tab.label.toLowerCase()} for this chapter yet. Check other tabs for content.`}
        />
      ) : (
        <div className="space-y-2.5">
          {filteredLectures.map((lecture) => (
            <ContentRow
              key={lecture.data._id}
              lecture={lecture}
              tabKey={activeTab}
              onPlay={() => onPlay(lecture)}
            />
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/30 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800/60 disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-blue-400" />
                  Loading more...
                </>
              ) : (
                <>
                  Load More
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function filterLectures(lectures: Lecture[], tabKey: TabKey): Lecture[] {
  if (tabKey === 'videos') {
    return lectures.filter(
      (l) =>
        l.data.isVideoLecture &&
        !l.data.isDPPVideos &&
        !l.data.isDPPNotes
    );
  }
  if (tabKey === 'dpp_videos') {
    return lectures.filter((l) => l.data.isDPPVideos);
  }
  if (tabKey === 'dpp_notes') {
    return lectures.filter(
      (l) =>
        l.data.isDPPNotes ||
        (l.data.dppCount > 0 && l.data.exerciseIds.length > 0)
    );
  }
  return lectures.filter(
    (l) => !l.data.isDPPNotes && l.data.homeworkIds.length > 0
  );
}

function ContentRow({
  lecture,
  tabKey,
  onPlay,
}: {
  lecture: Lecture;
  tabKey: TabKey;
  onPlay: () => void;
}) {
  const data = lecture.data;
  const isVideo = tabKey === 'videos' || tabKey === 'dpp_videos';

  if (isVideo) {
    const videoDetails = data.videoDetails;
    return (
      <button
        onClick={onPlay}
        className="group flex w-full items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 p-3 text-left transition-all duration-200 hover:border-blue-500/50 hover:bg-slate-800/60 active:scale-[0.99] sm:gap-4"
      >
        <div className="relative flex-shrink-0">
          {videoDetails?.image ? (
            <img
              src={videoDetails.image}
              alt={data.topic}
              loading="lazy"
              className="h-14 w-20 rounded-lg object-cover sm:h-16 sm:w-24"
            />
          ) : (
            <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-slate-700 sm:h-16 sm:w-24">
              <Video className="h-6 w-6 text-slate-500" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 transition group-hover:bg-black/40">
            <PlayCircle className="h-7 w-7 text-white drop-shadow-lg sm:h-8 sm:w-8" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-blue-400 transition">
            {data.topic}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:gap-3">
            {videoDetails?.duration && (
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                {videoDetails.duration}
              </span>
            )}
            {data.lectureType && (
              <span className="rounded bg-slate-700/40 px-1.5 py-0.5">
                {data.lectureType}
              </span>
            )}
            {data.status && (
              <span className={`rounded px-1.5 py-0.5 ${data.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 'bg-slate-700/40 text-slate-400'}`}>
                {data.status}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 rounded-lg bg-blue-500/10 px-2.5 py-2 text-xs font-medium text-blue-400 transition group-hover:bg-blue-500/20 sm:px-3">
          Play
        </div>
      </button>
    );
  }

  const homeworks: Homework[] = data.homeworkIds || [];
  const exercises = data.exerciseIds || [];

  if (tabKey === 'dpp_notes') {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 transition hover:border-slate-600">
        <h3 className="text-sm font-medium text-white line-clamp-2 mb-3">
          {data.topic}
        </h3>
        {exercises.map((ex) => (
          <div
            key={ex._id}
            className="flex items-center justify-between rounded-lg bg-slate-700/30 p-3 mb-2 last:mb-0"
          >
            <div className="min-w-0">
              <p className="text-sm text-slate-200 line-clamp-1">{ex.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {ex.totalQuestions} questions | {ex.totalMarks} marks
              </p>
            </div>
            <span className="flex-shrink-0 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
              DPP
            </span>
          </div>
        ))}
        {homeworks
          .filter((h) => h.note !== 'Class Notes')
          .map((hw) => (
            <NoteAttachment key={hw._id} homework={hw} />
          ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 transition hover:border-slate-600">
      <h3 className="text-sm font-medium text-white line-clamp-2 mb-3">
        {data.topic}
      </h3>
      {homeworks.map((hw) => (
        <NoteAttachment key={hw._id} homework={hw} />
      ))}
    </div>
  );
}

function NoteAttachment({ homework }: { homework: Homework }) {
  const attachments = homework.attachmentIds || [];

  return (
    <div className="mb-2 last:mb-0">
      <p className="text-xs text-slate-500 mb-1.5">{homework.note}</p>
      <p className="text-sm text-slate-200 line-clamp-1 mb-2">{homework.topic}</p>
      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => {
          const url = att.baseUrl + att.key;
          const fileName = att.name;
          const hasKey = att.key && att.key.length > 0;
          if (hasKey) {
            return (
              <a
                key={att._id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20 hover:shadow-md hover:shadow-blue-500/10"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {fileName}
              </a>
            );
          }
          return (
            <a
              key={att._id}
              href={att.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/40 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700/60"
            >
              <Download className="h-3.5 w-3.5" />
              {fileName}
            </a>
          );
        })}
      </div>
    </div>
  );
}
