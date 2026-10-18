ALTER TABLE "documents" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "share_token" varchar(64);--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_share_token_unique" UNIQUE("share_token");