import { desc } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// Documents table stores TipTap JSON plus plainText for search and previews.
// Personal docs have null orgId; org docs share with every org member.
// deletedAt: trash (soft delete keeps rows so they can be restored).
// shareToken: present only while a public view-only link is active.
export const documentsTable = pgTable(
  "documents",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    orgId: text("org_id"),
    templateId: text("template_id"),
    title: varchar({ length: 255 }).notNull().default("Untitled document"),
    content: jsonb().$type().default(null),
    plainText: text().default(""),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    shareToken: varchar("share_token", { length: 64 }).unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Backs the "recent documents" query: WHERE user_id = ? ORDER BY updated_at DESC.
    index("documents_user_updated_idx").on(t.userId, desc(t.updatedAt)),
    // Backs the organization workspace query: WHERE org_id = ? ORDER BY updated_at DESC.
    index("documents_org_updated_idx").on(t.orgId, desc(t.updatedAt)),
  ],
);
