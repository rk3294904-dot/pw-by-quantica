import type {
  BatchesResponse,
  BatchDetailsResponse,
  ChaptersResponse,
  LecturesResponse,
  VideoApiResponse,
} from '@/types';

const BASE_URL = 'https://devcoderz-backend.vercel.app/api';
const VIDEO_API_URL = 'https://player.examcrushers.in/api/videox';

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), 30000);

  // Link the caller's signal with our timeout signal
  if (signal) {
    signal.addEventListener('abort', () => timeoutCtrl.abort());
  }

  try {
    const res = await fetch(url, { signal: timeoutCtrl.signal });
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error('API returned unsuccessful response');
    }
    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function fetchBatches(signal?: AbortSignal): Promise<BatchesResponse> {
  return fetchJson<BatchesResponse>(`${BASE_URL}/batches`, signal);
}

export function fetchBatchDetails(
  batchId: string,
  signal?: AbortSignal
): Promise<BatchDetailsResponse> {
  return fetchJson<BatchDetailsResponse>(
    `${BASE_URL}/details?batch_id=${batchId}`,
    signal
  );
}

export function fetchChapters(
  batchId: string,
  subjectId: string,
  signal?: AbortSignal
): Promise<ChaptersResponse> {
  return fetchJson<ChaptersResponse>(
    `${BASE_URL}/chapters?batchId=${batchId}&subjectId=${subjectId}`,
    signal
  );
}

export function fetchLectures(
  batchSlug: string,
  subjectSlug: string,
  contentType: string,
  tag: string,
  page: number,
  signal?: AbortSignal
): Promise<LecturesResponse> {
  return fetchJson<LecturesResponse>(
    `${BASE_URL}/lectures?batchSlug=${batchSlug}&subjectSlug=${subjectSlug}&contentType=${contentType}&tag=${tag}&page=${page}`,
    signal
  );
}

export function fetchVideo(
  batchId: string,
  lectureId: string,
  subjectId: string,
  signal?: AbortSignal
): Promise<VideoApiResponse> {
  return fetchJson<VideoApiResponse>(
    `${VIDEO_API_URL}?batchId=${batchId}&lectureId=${lectureId}&subjectId=${subjectId}&key=Vinyl`,
    signal
  );
}
