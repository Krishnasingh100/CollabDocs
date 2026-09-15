import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

// Starter table so `drizzle-kit generate` works out of the box.
// Replace/extend with your own tables (e.g. documents, collaborators).
export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});
