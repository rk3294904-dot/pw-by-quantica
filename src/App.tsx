import { lazy, Suspense, useCallback } from 'react';
import { Send, GraduationCap } from 'lucide-react';
import { Header } from '@/components/Header';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BatchesView } from '@/components/BatchesView';
import { SubjectsView } from '@/components/SubjectsView';
import { ChaptersView } from '@/components/ChaptersView';
import { ContentView } from '@/components/ContentView';
import { LoadingSpinner } from '@/components/States';
import { useNavigation, useAsync } from '@/hooks/useNavigation';
import { useLibrary } from '@/hooks/useLibrary';
import { LearningLibrary } from '@/components/LearningLibrary';
import {
  fetchBatches,
  fetchBatchDetails,
  fetchChapters,
} from '@/services/api';

const VideoPlayer = lazy(() =>
  import('@/components/VideoPlayer').then((module) => ({ default: module.VideoPlayer }))
);

function App() {
  const {
    state,
    selectBatch,
    selectSubject,
    selectChapter,
    playLecture,
    resumeLecture,
    closeVideo,
    goBack,
    goHome,
  } = useNavigation();
  const library = useLibrary();

  const isVideoPage = state.view === 'video';

  const batchesQuery = useAsync(
    (signal?: AbortSignal) => fetchBatches(signal),
    [],
    state.view !== 'batches'
  );

  const batchDetailsQuery = useAsync(
    (signal?: AbortSignal) => fetchBatchDetails(state.batchId!, signal),
    [state.batchId, state.view],
    state.view !== 'subjects' && state.view !== 'chapters' && state.view !== 'content'
  );

  const chaptersQuery = useAsync(
    (signal?: AbortSignal) => fetchChapters(state.batchId!, state.subjectId!, signal),
    [state.subjectId, state.view],
    state.view !== 'chapters' && state.view !== 'content'
  );

  const retryBatches = useCallback(() => {
    window.location.reload();
  }, []);

  const goToBatch = useCallback(() => {
    if (state.view === 'subjects') {
      goBack();
    } else {
      goHome();
      if (state.batchId && state.batchName) {
        selectBatch(state.batchId, state.batchName);
      }
    }
  }, [state.view, state.batchId, state.batchName, goBack, goHome, selectBatch]);

  const goToSubject = useCallback(() => {
    if (state.view === 'content' && state.subjectId && state.subjectName) {
      selectSubject(state.subjectId, state.subjectName);
    }
  }, [state.view, state.subjectId, state.subjectName, selectSubject]);

  const breadcrumbItems = [
    { label: 'Home', onClick: goHome },
    ...(state.batchName
      ? [{ label: state.batchName, onClick: state.view !== 'subjects' && !isVideoPage ? goToBatch : undefined }]
      : []),
    ...(state.subjectName
      ? [{ label: state.subjectName, onClick: (state.view === 'content' || isVideoPage) ? goToSubject : undefined }]
      : []),
    ...(state.chapterName ? [{ label: state.chapterName, onClick: undefined as (() => void) | undefined }] : []),
  ];

  // Video page is fullscreen — render outside the main layout
  if (isVideoPage && state.playingLecture && state.batchId && state.subjectId) {
    if (library.loading) return <LoadingSpinner message="Loading saved lecture progress..." />;
    const savedProgress = library.progress.find((entry) => entry.batchId === state.batchId
      && entry.subjectId === state.subjectId && entry.lectureId === state.playingLecture?.data._id);
    return (
      <Suspense fallback={<LoadingSpinner message="Loading video player..." />}>
        <VideoPlayer
          key={`${state.batchId}:${state.subjectId}:${state.playingLecture.data._id}`}
          batchId={state.batchId}
          lectureId={state.playingLecture.data._id}
          subjectId={state.subjectId}
          title={state.playingLecture.data.topic}
          onBack={closeVideo}
          initialPosition={savedProgress?.completed ? 0 : savedProgress?.position ?? 0}
          initiallyCompleted={savedProgress?.completed ?? false}
          saveEnabled={library.ready}
          saveError={library.error}
          onProgress={(position, duration, completed) => library.saveProgress({
            batchId: state.batchId!, batchName: state.batchName || 'Study batch',
            subjectId: state.subjectId!, subjectName: state.subjectName || 'Subject',
            chapterId: state.chapterId!, chapterName: state.chapterName || 'Chapter',
            lectureId: state.playingLecture!.data._id, title: state.playingLecture!.data.topic,
            position, duration, completed,
          })}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header onHome={goHome} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {library.error && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <p>{library.error}</p>
            <button type="button" onClick={library.retryLoad} disabled={library.loading}
              className="rounded-lg px-3 py-2 font-medium hover:bg-amber-500/10 disabled:opacity-50">Retry</button>
          </div>
        )}
        {state.view !== 'batches' && <Breadcrumbs items={breadcrumbItems} />}

        {state.view === 'batches' && (
          <>
          {library.loading && <p role="status" className="mb-4 text-sm text-slate-400">Loading your favorites and progress...</p>}
          <LearningLibrary progress={library.progress} onResume={resumeLecture} />
          <BatchesView
            batches={batchesQuery.data?.batches ?? []}
            loading={batchesQuery.loading}
            error={batchesQuery.error}
            onSelect={selectBatch}
            onRetry={retryBatches}
            favorites={library.favorites}
            pendingFavorites={library.pendingFavorites}
            libraryReady={library.ready}
            onFavorite={library.toggleFavorite}
          />
          </>
        )}

        {state.view === 'subjects' && (
          <SubjectsView
            details={batchDetailsQuery.data?.data ?? null}
            loading={batchDetailsQuery.loading}
            error={batchDetailsQuery.error}
            onSelect={selectSubject}
            onRetry={goBack}
          />
        )}

        {state.view === 'chapters' && (
          <ChaptersView
            chapters={chaptersQuery.data?.data ?? []}
            loading={chaptersQuery.loading}
            error={chaptersQuery.error}
            subjectName={state.subjectName ?? ''}
            onSelect={selectChapter}
            onRetry={goBack}
          />
        )}

        {state.view === 'content' && state.batchId && state.subjectId && state.chapterId && (
          <ContentView
            batchId={state.batchId}
            subjectId={state.subjectId}
            chapterId={state.chapterId}
            chapterName={state.chapterName ?? ''}
            onPlay={playLecture}
            progress={library.progress}
          />
        )}
      </main>

      <footer className="border-t border-slate-700/50 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Quantica Digital</p>
                <p className="text-[10px] text-slate-500">Learning Platform</p>
              </div>
            </div>

            <a
              href="https://t.me/studytrackerpro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-sky-400 hover:to-blue-400 active:scale-95"
            >
              <Send className="h-4 w-4" />
              Join Telegram Channel
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
