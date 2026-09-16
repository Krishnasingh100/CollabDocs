import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Starter table so `drizzle-kit generate` works out of the box.
// Replace/extend with your own tables (e.g. documents, collaborators).
export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

// Google-Docs-style documents. `content` stores the TipTap JSON document,
// so the editor can restore formatting, tables, images, lists, etc.
export const documentsTable = pgTable("documents", {
  id: uuid().primaryKey().defaultRandom(),
  title: varchar({ length: 255 }).notNull().default("Untitled document"),
  content: jsonb().$type<unknown>().default(null),
  plainText: text().default(""),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type DocumentRow = typeof documentsTable.$inferSelect;
export type NewDocumentRow = typeof documentsTable.$inferInsert;
