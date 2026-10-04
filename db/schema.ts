import { boolean, doublePrecision, index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export const favorites = pgTable('batch_favorites', {
  profileId: text('profile_id').notNull(),
  batchId: text('batch_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.profileId, table.batchId] })]);

export const lectureProgress = pgTable('lecture_progress', {
  profileId: text('profile_id').notNull(),
  batchId: text('batch_id').notNull(),
  batchName: text('batch_name').notNull(),
  subjectId: text('subject_id').notNull(),
  subjectName: text('subject_name').notNull(),
  chapterId: text('chapter_id').notNull(),
  chapterName: text('chapter_name').notNull(),
  lectureId: text('lecture_id').notNull(),
  title: text('title').notNull(),
  position: doublePrecision('position').default(0).notNull(),
  duration: doublePrecision('duration').default(0).notNull(),
  completed: boolean('completed').default(false).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.profileId, table.batchId, table.subjectId, table.lectureId] }),
  index('lecture_progress_profile_updated_idx').on(table.profileId, table.updatedAt),
]);
