import { useEffect, useState, useCallback, useRef } from 'react';
import type { Lecture, LectureProgress } from '@/types';

interface NavigationState {
  view: 'batches' | 'subjects' | 'chapters' | 'content' | 'video';
  batchId: string | null;
  batchName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  chapterId: string | null;
  chapterName: string | null;
  playingLecture: { data: Pick<Lecture['data'], '_id' | 'topic'> } | null;
}

const initial: NavigationState = {
  view: 'batches',
  batchId: null,
  batchName: null,
  subjectId: null,
  subjectName: null,
  chapterId: null,
  chapterName: null,
  playingLecture: null,
};

export function useNavigation() {
  const [state, setState] = useState<NavigationState>(initial);

  const selectBatch = useCallback((id: string, name: string) => {
    setState({ ...initial, view: 'subjects', batchId: id, batchName: name });
  }, []);

  const selectSubject = useCallback((id: string, name: string) => {
    setState((prev) => ({
      ...prev,
      view: 'chapters',
      subjectId: id,
      subjectName: name,
      chapterId: null,
      chapterName: null,
    }));
  }, []);

  const selectChapter = useCallback((id: string, name: string) => {
    setState((prev) => ({
      ...prev,
      view: 'content',
      chapterId: id,
      chapterName: name,
    }));
  }, []);

  const playLecture = useCallback((lecture: Lecture) => {
    setState((prev) => ({
      ...prev,
      view: 'video',
      playingLecture: lecture,
    }));
  }, []);

  const closeVideo = useCallback(() => {
    setState((prev) => ({
      ...prev,
      view: 'content',
      playingLecture: null,
    }));
  }, []);

  const resumeLecture = useCallback((progress: LectureProgress) => {
    setState({
      view: 'video', batchId: progress.batchId, batchName: progress.batchName,
      subjectId: progress.subjectId, subjectName: progress.subjectName,
      chapterId: progress.chapterId, chapterName: progress.chapterName,
      playingLecture: { data: { _id: progress.lectureId, topic: progress.title } },
    });
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.view === 'video') {
        return { ...prev, view: 'content', playingLecture: null };
      }
      if (prev.view === 'content') {
        return { ...prev, view: 'chapters', chapterId: null, chapterName: null };
      }
      if (prev.view === 'chapters') {
        return { ...prev, view: 'subjects', subjectId: null, subjectName: null };
      }
      if (prev.view === 'subjects') {
        return initial;
      }
      return prev;
    });
  }, []);

  const goHome = useCallback(() => {
    setState(initial);
  }, []);

  return {
    state,
    selectBatch,
    selectSubject,
    selectChapter,
    playLecture,
    resumeLecture,
    closeVideo,
    goBack,
    goHome,
  };
}

export function useAsync<T>(
  asyncFn: (signal?: AbortSignal) => Promise<T>,
  deps: unknown[],
  skip = false
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (skip) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    asyncFn(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          if (err.name === 'AbortError') return;
          setError(err.message || 'Something went wrong');
          setLoading(false);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
