import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type Highlight = {
  id: string;
  verseId: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'red' | 'cyan' | 'gray';
  text: string;
  wordIndex?: number;
  wordText?: string;
};

export type Note = {
  id: string;
  verseId: string;
  content: string;
  timestamp: number;
  wordIndex?: number;
  wordText?: string;
};

export type BibleVerse = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  strongsNumbers?: string[];
  hebrew?: string;
  greek?: string;
};
