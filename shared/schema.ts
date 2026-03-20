import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const destinations = pgTable("destinations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("MapPin"),
  color: text("color").notNull().default("#3b82f6"),
});

export const insertDestinationSchema = createInsertSchema(destinations).omit({ id: true });
export type InsertDestination = z.infer<typeof insertDestinationSchema>;
export type Destination = typeof destinations.$inferSelect;

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  destinationId: varchar("destination_id").references(() => destinations.id, { onDelete: "cascade" }),
  isGlobal: boolean("is_global").notNull().default(false),
  advanceDays: integer("advance_days").notNull().default(0),
  seasonStart: integer("season_start"),
  seasonEnd: integer("season_end"),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  arrivalDate: date("arrival_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTripSchema = createInsertSchema(trips).omit({ id: true, createdAt: true });
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

export const tripTasks = pgTable("trip_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  dueDate: date("due_date"),
});

export const insertTripTaskSchema = createInsertSchema(tripTasks).omit({ id: true });
export type InsertTripTask = z.infer<typeof insertTripTaskSchema>;
export type TripTask = typeof tripTasks.$inferSelect;

export const deadlineCategories = pgTable("deadline_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
});

export const insertDeadlineCategorySchema = createInsertSchema(deadlineCategories).omit({ id: true });
export type InsertDeadlineCategory = z.infer<typeof insertDeadlineCategorySchema>;
export type DeadlineCategory = typeof deadlineCategories.$inferSelect;

export const deadlines = pgTable("deadlines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category"),
  country: text("country"),
  frequency: text("frequency"),
  day: integer("day"),
  month: integer("month"),
  year: integer("year"),
  lastDone: date("last_done"),
  reminderDaysBefore: integer("reminder_days_before"),
  notes: text("notes"),
  autoPayment: boolean("auto_payment").notNull().default(false),
  snoozedUntil: date("snoozed_until"),
  deprioritized: boolean("deprioritized").notNull().default(false),
});

export const insertDeadlineSchema = createInsertSchema(deadlines).omit({ id: true });
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;
export type Deadline = typeof deadlines.$inferSelect;

export const friends = pgTable("friends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  lastSpoke: date("last_spoke").notNull().default("2023-12-01"),
  location: text("location"),
});

export const insertFriendSchema = createInsertSchema(friends).omit({ id: true });
export type InsertFriend = z.infer<typeof insertFriendSchema>;
export type Friend = typeof friends.$inferSelect;

export const tdlTasks = pgTable("tdl_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  priority: integer("priority").notNull().default(2),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTdlTaskSchema = createInsertSchema(tdlTasks).omit({ id: true, createdAt: true });
export type InsertTdlTask = z.infer<typeof insertTdlTaskSchema>;
export type TdlTask = typeof tdlTasks.$inferSelect;
