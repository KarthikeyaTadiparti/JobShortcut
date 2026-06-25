import { pgTable, varchar, timestamp, bigint, bigserial, text } from "drizzle-orm/pg-core";
import { admins } from "./admins-schema.js";

export const jobs = pgTable("jobs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  company: varchar("company", { length: 255 }),
  jobRole: varchar("job_role", { length: 255 }),
  experience: varchar("experience", { length: 255 }),
  location: varchar("location", { length: 255 }),
  applyLink: text("apply_link").notNull().unique(),
  
  addedBy: bigint("added_by", { mode: "number" }).notNull().references(() => admins.id, { onDelete: "cascade" }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
