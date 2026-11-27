import {
  boolean, index, integer, jsonb, pgEnum, pgTable, smallint, text, timestamp, uniqueIndex, type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { ThemeSettings } from "@/lib/themes";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

// ---- Better Auth tables (shape required by its Drizzle adapter) + our user fields ----
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: created(),
  updatedAt: updated(),
  timezone: text("timezone").notNull().default("Asia/Manila"),
  theme: jsonb("theme").$type<ThemeSettings>(),
  icsToken: text("ics_token").unique(),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: created(),
  updatedAt: updated(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: created(),
  updatedAt: updated(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: created(),
  updatedAt: updated(),
});

// ---- My Cell ----
export const goalLevel = pgEnum("goal_level", ["year", "month", "week"]);
export const taskStatus = pgEnum("task_status", ["todo", "doing", "done"]);

export const goal = pgTable("goal", {
  id: id(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  level: goalLevel("level").notNull(),
  parentId: text("parent_id").references((): AnyPgColumn => goal.id, { onDelete: "set null" }),
  period: text("period").notNull(), // "2027", "2027-03", "2027-W12"
  manualProgress: smallint("manual_progress").notNull().default(0),
  done: boolean("done").notNull().default(false),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("goal_owner_idx").on(t.ownerId), index("goal_parent_idx").on(t.parentId)]);

export const team = pgTable("team", {
  id: id(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  digestEnabled: boolean("digest_enabled").notNull().default(false),
  digestDay: smallint("digest_day").notNull().default(1), // 0 = Sunday
  createdAt: created(),
  updatedAt: updated(),
});

export const task = pgTable("task", {
  id: id(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
  goalId: text("goal_id").references(() => goal.id, { onDelete: "set null" }),
  templateId: text("template_id").references((): AnyPgColumn => template.id, { onDelete: "set null" }),
  title: text("title").notNull().default(""),
  notes: jsonb("notes"), // Tiptap document
  howTo: jsonb("how_to"), // team tasks: "How to do it"
  status: taskStatus("status").notNull().default("todo"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  hasTime: boolean("has_time").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("task_owner_idx").on(t.ownerId), index("task_team_idx").on(t.teamId), index("task_goal_idx").on(t.goalId), index("task_due_idx").on(t.dueAt)]);

export const checklistItem = pgTable("checklist_item", {
  id: id(),
  taskId: text("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  position: integer("position").notNull().default(0),
});

export const taskLink = pgTable("task_link", {
  id: id(),
  taskId: text("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
});

// ---- The Hive ----
export const teamMember = pgTable("team_member", {
  id: id(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(), // stored lowercase
  unsubscribeTokenHash: text("unsubscribe_token_hash").notNull().unique(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => [uniqueIndex("member_team_email_uq").on(t.teamId, t.email)]);

export const assignment = pgTable("assignment", {
  id: id(),
  taskId: text("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => teamMember.id, { onDelete: "cascade" }),
  doneTokenHash: text("done_token_hash").notNull().unique(),
  doneAt: timestamp("done_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => [uniqueIndex("assignment_task_member_uq").on(t.taskId, t.memberId)]);

export const recurrence = pgEnum("recurrence", ["none", "weekly", "monthly"]);

export type TemplateContent = { checklist: string[]; links: { title: string; url: string }[] };

export const template = pgTable("template", {
  id: id(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  howTo: jsonb("how_to"),
  content: jsonb("content").$type<TemplateContent>().notNull().default({ checklist: [], links: [] }),
  recurrence: recurrence("recurrence").notNull().default("none"),
  weekday: smallint("weekday"), // weekly: 0 = Sunday
  monthDay: smallint("month_day"), // monthly: 1–28
  dueTime: text("due_time"), // "17:00" in the owner's timezone
  assignAll: boolean("assign_all").notNull().default(true),
  memberIds: jsonb("member_ids").$type<string[]>().notNull().default([]),
  lastRunPeriod: text("last_run_period"), // e.g. "2027-W12" — stops a period being created twice
  createdAt: created(),
  updatedAt: updated(),
});

export const emailKind = pgEnum("email_kind", ["assign", "remind3", "remind1", "digest"]);
export const emailStatus = pgEnum("email_status", ["queued", "sent", "failed"]);

export const emailLog = pgTable("email_log", {
  id: id(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => teamMember.id, { onDelete: "set null" }),
  taskId: text("task_id").references(() => task.id, { onDelete: "set null" }),
  kind: emailKind("kind").notNull(),
  recipient: text("recipient").notNull(),
  // claimed before sending; a unique key makes a second scheduler run a no-op
  dedupeKey: text("dedupe_key").notNull().unique(),
  status: emailStatus("status").notNull().default("queued"),
  providerId: text("provider_id"),
  error: text("error"),
  createdAt: created(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
}, (t) => [index("email_log_team_idx").on(t.teamId, t.createdAt)]);

