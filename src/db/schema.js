import { desc } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
// CollabDocs documents. `content` stores the TipTap JSON document so the
// editor restores formatting, tables, images, lists, etc. `plainText` is a
// truncated text copy used for search and list previews without parsing JSON.
// `userId` is the Neon Auth (Better Auth) user id that created the document.
// Personal documents have `orgId = null` and stay visible only to the
// creator. Organization documents have `orgId` set to the Better Auth
// organization id and are visible to every member of that organization.
// `templateId` records which gallery template the document was created from.
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
