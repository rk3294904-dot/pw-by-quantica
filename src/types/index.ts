export interface Batch {
  _id: string;
  name: string;
  byName: string;
  startDate: string;
  endDate: string;
  language: string;
  previewImage: string;
  feeTotal: number;
  type: string;
  slug: string;
  subBatches: unknown[];
}

export interface BatchesResponse {
  success: boolean;
  batches: Batch[];
}

export interface Teacher {
  _id: string;
  firstName: string;
  lastName: string;
  experience?: string;
  qualification?: string;
  featuredLine?: string;
  subject?: string;
}

export interface Subject {
  _id: string;
  subject: string;
  subjectId: string;
  description: string;
  slug: string;
  tagCount: number;
  lectureCount: number;
  displayOrder: number;
  teacherIds: Teacher[];
  imageId?: {
    baseUrl: string;
    key: string;
    name: string;
  };
}

export interface BatchDetails {
  _id: string;
  name: string;
  batchName: string;
  byName: string;
  language: string;
  startDate: string;
  endDate: string;
  previewImage: string;
  exam: string;
  subjects: Subject[];
}

export interface BatchDetailsResponse {
  success: boolean;
  data: BatchDetails;
}

export interface Chapter {
  _id: string;
  name: string;
  type: string;
  typeId: string;
  displayOrder: number;
  notes: number;
  exercises: number;
  videos: number;
  lectureVideos: number;
  slug: string;
}

export interface ChaptersResponse {
  success: boolean;
  data: Chapter[];
}

export interface Attachment {
  _id: string;
  baseUrl: string;
  key: string;
  name: string;
}

export interface Homework {
  _id: string;
  topic: string;
  note: string;
  attachmentIds: Attachment[];
  slug: string;
  status: string;
  actions: string[];
}

export interface Exercise {
  _id: string;
  title: string;
  slug: string;
  dppId: string;
  isSubjective: boolean;
  totalMarks: number;
  totalQuestions: number;
}

export interface VideoDetails {
  _id: string;
  name: string;
  image: string;
  duration: string;
  status: string;
}

export interface Lecture {
  _id: string;
  type: string;
  data: {
    _id: string;
    topic: string;
    date: string;
    startTime: string;
    status: string;
    lectureType: string;
    isDPPNotes: boolean;
    isDPPVideos: boolean;
    isVideoLecture: boolean;
    hasAttachment: boolean;
    dppCount: number;
    slug: string;
    batchId: string;
    videoDetails?: VideoDetails;
    homeworkIds: Homework[];
    exerciseIds: Exercise[];
    tags?: { _id: string; name: string }[];
  };
}

export interface LecturesResponse {
  success: boolean;
  data: Lecture[];
}

export interface VideoApiResponse {
  success: boolean;
  dashurl: string;
  url: string;
  keys: Record<string, string>;
}

export interface LectureProgress {
  batchId: string;
  batchName: string;
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  lectureId: string;
  title: string;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: string;
}

export interface Library {
  favorites: string[];
  progress: LectureProgress[];
}
