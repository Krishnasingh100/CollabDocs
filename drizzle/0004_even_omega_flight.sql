ALTER TABLE "documents" ADD COLUMN "org_id" text;--> statement-breakpoint
CREATE INDEX "documents_org_updated_idx" ON "documents" USING btree ("org_id","updatedAt" desc);