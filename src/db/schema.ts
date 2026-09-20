import { desc } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// CollabDocs documents. `content` stores the TipTap JSON document so the
// editor restores formatting, tables, images, lists, etc. `plainText` is a
// truncated text copy used for search and list previews without parsing JSON.
// `userId` is the Neon Auth (Better Auth) user id owning the document — or
// "local-dev" for workspaces created while auth is not configured.
// `templateId` records which gallery template the document was created from.
export const documentsTable = pgTable(
  "documents",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    templateId: text("template_id"),
    title: varchar({ length: 255 }).notNull().default("Untitled document"),
    content: jsonb().$type<unknown>().default(null),
    plainText: text().default(""),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Backs the "recent documents" query: WHERE user_id = ? ORDER BY updated_at DESC.
    index("documents_user_updated_idx").on(t.userId, desc(t.updatedAt)),
  ],
);

export type DocumentRow = typeof documentsTable.$inferSelect;
export type NewDocumentRow = typeof documentsTable.$inferInsert;
