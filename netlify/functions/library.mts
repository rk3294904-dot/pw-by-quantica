import { createHash, randomUUID } from 'node:crypto';
import type { Config } from '@netlify/functions';
import { and, desc, eq, lte } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { favorites, lectureProgress } from '../../db/schema.js';

function validText(value: unknown, max = 512): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function validSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 604800;
}

export default async (request: Request) => {
  const headers = new Headers({ 'Cache-Control': 'private, no-store', Vary: 'Cookie' });
  const respond = (body: unknown, status = 200) => Response.json(body, { status, headers });
  if (!['GET', 'POST'].includes(request.method)) {
    headers.set('Allow', 'GET, POST');
    return respond({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  if (request.method === 'POST' && request.headers.get('origin') !== url.origin) {
    return respond({ error: 'Request origin not allowed' }, 403);
  }
  const cookie = request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith('quantica_profile='))?.slice('quantica_profile='.length);
  const validCookie = cookie && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cookie);
  if (!validCookie && request.method === 'POST') {
    return respond({ error: 'Load your library before saving changes' }, 401);
  }
  const profile = validCookie ? cookie : randomUUID();
  if (!validCookie) {
    headers.set('Set-Cookie', `quantica_profile=${profile}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${url.protocol === 'https:' ? '; Secure' : ''}`);
  }
  const profileId = createHash('sha256').update(profile).digest('hex');

  try {
    const db = getDb();
    if (request.method === 'GET') {
      const [savedFavorites, progress] = await Promise.all([
        db.select({ batchId: favorites.batchId }).from(favorites).where(eq(favorites.profileId, profileId)),
        db.select({
          batchId: lectureProgress.batchId, batchName: lectureProgress.batchName,
          subjectId: lectureProgress.subjectId, subjectName: lectureProgress.subjectName,
          chapterId: lectureProgress.chapterId, chapterName: lectureProgress.chapterName,
          lectureId: lectureProgress.lectureId, title: lectureProgress.title,
          position: lectureProgress.position, duration: lectureProgress.duration,
          completed: lectureProgress.completed, updatedAt: lectureProgress.updatedAt,
        }).from(lectureProgress).where(eq(lectureProgress.profileId, profileId)).orderBy(desc(lectureProgress.updatedAt)),
      ]);
      return respond({ favorites: savedFavorites.map((favorite) => favorite.batchId), progress });
    }

    if (!request.headers.get('content-type')?.includes('application/json')) {
      return respond({ error: 'JSON body required' }, 415);
    }
    const text = await request.text();
    if (text.length > 12000) return respond({ error: 'Request too large' }, 413);
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      body = parsed as Record<string, unknown>;
    } catch {
      return respond({ error: 'Invalid JSON body' }, 400);
    }

    if (body.action === 'favorite') {
      if (!validText(body.batchId, 160) || typeof body.saved !== 'boolean') {
        return respond({ error: 'Invalid favorite' }, 400);
      }
      if (body.saved) {
        await db.insert(favorites).values({ profileId, batchId: body.batchId }).onConflictDoNothing();
      } else {
        await db.delete(favorites).where(and(eq(favorites.profileId, profileId), eq(favorites.batchId, body.batchId)));
      }
      return respond({ success: true });
    }

    if (body.action === 'progress') {
      const { batchId, batchName, subjectId, subjectName, chapterId, chapterName, lectureId, title, position, duration, completed, recordedAt } = body;
      if (!validText(batchId, 160) || !validText(subjectId, 160) || !validText(chapterId, 160) || !validText(lectureId, 160)
        || !validText(batchName) || !validText(subjectName) || !validText(chapterName) || !validText(title)
        || !validSeconds(position) || !validSeconds(duration) || (duration > 0 && position > duration + 1)
        || typeof completed !== 'boolean' || typeof recordedAt !== 'number' || !Number.isFinite(recordedAt)
        || Math.abs(Date.now() - recordedAt) > 86400000) {
        return respond({ error: 'Invalid lecture progress' }, 400);
      }
      const values = { profileId, batchId, batchName, subjectId, subjectName, chapterId, chapterName, lectureId, title, position, duration, completed, updatedAt: new Date(recordedAt) };
      await db.insert(lectureProgress).values(values).onConflictDoUpdate({
        target: [lectureProgress.profileId, lectureProgress.batchId, lectureProgress.subjectId, lectureProgress.lectureId],
        set: values,
        setWhere: lte(lectureProgress.updatedAt, values.updatedAt),
      });
      return respond({ success: true });
    }
    return respond({ error: 'Unknown action' }, 400);
  } catch {
    return respond({ error: 'Your library could not be saved or loaded. Please try again.' }, 503);
  }
};

export const config: Config = { path: '/api/library' };
