CREATE TABLE "batch_favorites" (
	"profile_id" text,
	"batch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "batch_favorites_pkey" PRIMARY KEY("profile_id","batch_id")
);
--> statement-breakpoint
CREATE TABLE "lecture_progress" (
	"profile_id" text,
	"batch_id" text,
	"batch_name" text NOT NULL,
	"subject_id" text,
	"subject_name" text NOT NULL,
	"chapter_id" text NOT NULL,
	"chapter_name" text NOT NULL,
	"lecture_id" text,
	"title" text NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"duration" double precision DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lecture_progress_pkey" PRIMARY KEY("profile_id","batch_id","subject_id","lecture_id")
);
--> statement-breakpoint
CREATE INDEX "lecture_progress_profile_updated_idx" ON "lecture_progress" ("profile_id","updated_at");