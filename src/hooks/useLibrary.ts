import { useCallback, useEffect, useRef, useState } from 'react';
import type { Library, LectureProgress } from '@/types';

async function libraryRequest(body?: unknown, signal?: AbortSignal): Promise<Library> {
  const response = await fetch('/api/library', {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    keepalive: Boolean(body),
    signal,
  });
  if (!response.ok) throw new Error('Your saved library is unavailable. Please try again.');
  return response.json();
}

export function useLibrary() {
  const [library, setLibrary] = useState<Library>({ favorites: [], progress: [] });
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFavorites, setPendingFavorites] = useState<string[]>([]);
  const pendingRef = useRef(new Set<string>());
  const lastRecordedAt = useRef(0);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setReady(false);
    libraryRequest(undefined, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      setLibrary(data);
      setReady(true);
      setError(null);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Your saved library could not be loaded. Retry to enable saving.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [retry]);

  const toggleFavorite = useCallback(async (batchId: string, saved: boolean) => {
    if (!ready || pendingRef.current.has(batchId)) return;
    pendingRef.current.add(batchId);
    setPendingFavorites([...pendingRef.current]);
    try {
      await libraryRequest({ action: 'favorite', batchId, saved });
      setLibrary((current) => ({ ...current, favorites: saved
        ? [...new Set([...current.favorites, batchId])]
        : current.favorites.filter((id) => id !== batchId) }));
      setError(null);
    } catch {
      setError('Could not update this favorite. Please try again.');
    } finally {
      pendingRef.current.delete(batchId);
      setPendingFavorites([...pendingRef.current]);
    }
  }, [ready]);

  const saveProgress = useCallback((progress: Omit<LectureProgress, 'updatedAt'>) => {
    if (!ready) return;
    const recordedAt = Math.max(Date.now(), lastRecordedAt.current + 1);
    lastRecordedAt.current = recordedAt;
    return libraryRequest({ action: 'progress', ...progress, recordedAt }).then(() => {
      const saved = { ...progress, updatedAt: new Date(recordedAt).toISOString() };
      setLibrary((current) => {
        const sameLecture = (entry: LectureProgress) => entry.batchId === saved.batchId
          && entry.subjectId === saved.subjectId && entry.lectureId === saved.lectureId;
        const existing = current.progress.find(sameLecture);
        if (existing && existing.updatedAt > saved.updatedAt) return current;
        return { ...current, progress: [saved, ...current.progress.filter((entry) => !sameLecture(entry))]
          .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)) };
      });
      setError(null);
    }).catch(() => {
      setError('Could not save lecture progress. Playback is still available; saving retries as you watch.');
    });
  }, [ready]);

  const retryLoad = useCallback(() => setRetry((current) => current + 1), []);
  return { ...library, loading, ready, error, pendingFavorites, toggleFavorite, saveProgress, retryLoad };
}
