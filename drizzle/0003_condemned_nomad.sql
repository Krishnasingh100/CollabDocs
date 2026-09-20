ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "template_id" text;--> statement-breakpoint
CREATE INDEX "documents_user_updated_idx" ON "documents" USING btree ("user_id","updatedAt" desc);