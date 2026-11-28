import { sql } from "drizzle-orm";
import {
  boolean, customType, index, integer, jsonb, pgEnum, pgTable, primaryKey, smallint, text, timestamp, uniqueIndex, type AnyPgColumn,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });
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
  bio: text("bio"),
  buzzMode: text("buzz_mode").$type<"instant" | "digest" | "off">().notNull().default("instant"), // how Buzz emails reach you
  lastDigestAt: timestamp("last_digest_at", { withTimezone: true }), // last daily Buzz digest sent
});

// Profile picture and banner, already resized and re-encoded to WebP on upload (small enough for Postgres).
export const imageKind = pgEnum("image_kind", ["avatar", "banner"]);
export const userImage = pgTable("user_image", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  kind: imageKind("kind").notNull(),
  data: bytea("data").notNull(),
  updatedAt: updated(),
}, (t) => [primaryKey({ columns: [t.userId, t.kind] })]);

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
export const taskStatus = pgEnum("task_status", ["todo", "doing", "review", "done"]); // review: waiting for the leader to approve

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
  joinCode: text("join_code").unique(), // shareable join link; null = switched off
  importanceColors: jsonb("importance_colors").$type<Record<string, string>>(), // overrides for Low/Medium/High
  colonyId: text("colony_id").references((): AnyPgColumn => colony.id, { onDelete: "set null" }), // a Swarm inside a class
  kind: text("kind").$type<"blank" | "hackathon" | "competition" | "project">().notNull().default("blank"), // the template it started from
  archivedAt: timestamp("archived_at", { withTimezone: true }), // finished hives become read-only
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
  importance: smallint("importance").notNull().default(0), // 0 none, 1 low, 2 medium, 3 high
  subjectId: text("subject_id").references((): AnyPgColumn => subject.id, { onDelete: "set null" }), // personal tasks: e.g. "ASE 111"
  isExam: boolean("is_exam").notNull().default(false), // pinned as a countdown in My Cell
  doneAt: timestamp("done_at", { withTimezone: true }), // when it was finished (feeds Nectar)
  type: text("type").$type<"task" | "bug" | "feature" | "decision">().notNull().default("task"), // team tasks
  severity: text("severity").$type<"low" | "medium" | "high" | "critical">(), // bugs
  steps: text("steps"), // bugs: steps to reproduce
  testRunId: text("test_run_id").references((): AnyPgColumn => testRun.id, { onDelete: "set null" }), // bugs: the run that showed it
  decision: text("decision"), // decisions: what we chose
  rationale: text("rationale"), // decisions: why
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
  // accounts: invited by email (userId null) until they sign up with that address or use the join link
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  nickname: text("nickname"),
  roleId: text("role_id").references((): AnyPgColumn => teamRole.id, { onDelete: "set null" }),
  perms: jsonb("perms").$type<string[]>().notNull().default([]), // "Hive control" for this person; starts as their role's set
  isAdmin: boolean("is_admin").notNull().default(false), // the leader: top of the hierarchy, every power
  parentId: text("parent_id").references((): AnyPgColumn => teamMember.id, { onDelete: "set null" }), // who they sit under
  position: integer("position").notNull().default(0), // order among people under the same person
  access: text("access").$type<"member" | "adviser" | "guest">().notNull().default("member"), // adviser: view + comment; guest: view tasks and The Comb
  createdAt: created(),
}, (t) => [uniqueIndex("member_team_email_uq").on(t.teamId, t.email)]);

export const assignment = pgTable("assignment", {
  id: id(),
  taskId: text("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => teamMember.id, { onDelete: "cascade" }),
  doneTokenHash: text("done_token_hash").notNull().unique(),
  doneAt: timestamp("done_at", { withTimezone: true }),
  notifiedAt: timestamp("notified_at", { withTimezone: true }), // when the assignment email went out
  progress: smallint("progress").notNull().default(0), // 0-100, the member's own slider
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }), // "Snooze" in an email: no reminders before this
  createdAt: created(),
}, (t) => [uniqueIndex("assignment_task_member_uq").on(t.taskId, t.memberId)]);

// A dated progress note on someone's part of a team task ("40%: set up the simulator").
export const progressLog = pgTable("progress_log", {
  id: id(),
  assignmentId: text("assignment_id").notNull().references(() => assignment.id, { onDelete: "cascade" }),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  progress: smallint("progress").notNull(),
  done: boolean("done").notNull().default(false),
  note: text("note"),
  createdAt: created(),
}, (t) => [index("progress_log_assignment_idx").on(t.assignmentId), index("progress_log_team_idx").on(t.teamId, t.createdAt)]);

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

export const emailKind = pgEnum("email_kind", ["assign", "remind3", "remind1", "digest", "invite", "announce", "remind0", "help", "daily", "subtask"]);
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


export const teamRole = pgTable("team_role", {
  id: id(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  perms: jsonb("perms").$type<string[]>().notNull().default([]),
  position: integer("position").notNull().default(0),
  isLeader: boolean("is_leader").notNull().default(false), // the admin's role: every power, can't be deleted
  createdAt: created(),
}, (t) => [
  uniqueIndex("team_role_name_uq").on(t.teamId, t.name),
  uniqueIndex("team_role_leader_uq").on(t.teamId).where(sql`${t.isLeader}`),
]);

// The Comb: a team's own feed. Posts by members; task activity is mixed in when the page is built.
export const combPost = pgTable("comb_post", {
  id: id(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => teamMember.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }), // hidden by someone with the "hide" power
  createdAt: created(),
}, (t) => [index("comb_team_idx").on(t.teamId, t.createdAt)]);

// Hive Vault: the team's shared links (Drive folders, GitHub repos, docs…)
export const teamLink = pgTable("team_link", {
  id: id(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => teamMember.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  note: text("note"),
  createdAt: created(),
}, (t) => [index("team_link_team_idx").on(t.teamId)]);

// Following: one row per "follower follows following".
export const follow = pgTable("follow", {
  followerId: text("follower_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  followingId: text("following_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.followerId, t.followingId] }), index("follow_following_idx").on(t.followingId)]);

// A slice of a team task with exactly one owner and its own due date.
export const subtask = pgTable("subtask", {
  id: id(),
  taskId: text("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  ownerId: text("owner_id").references(() => teamMember.id, { onDelete: "set null" }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  hasTime: boolean("has_time").notNull().default(false),
  status: taskStatus("status").notNull().default("todo"),
  doneAt: timestamp("done_at", { withTimezone: true }),
  position: integer("position").notNull().default(0),
  createdAt: created(),
}, (t) => [index("subtask_task_idx").on(t.taskId), index("subtask_owner_idx").on(t.ownerId)]);

// Who finished what, and when: written automatically, never edited. Read by the contribution log and its CSV.
export const contribution = pgTable("contribution", {
  id: id(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => task.id, { onDelete: "set null" }),
  subtaskId: text("subtask_id").references(() => subtask.id, { onDelete: "set null" }),
  memberId: text("member_id").references(() => teamMember.id, { onDelete: "set null" }),
  kind: text("kind").$type<"part_done" | "subtask_done" | "sent_for_review" | "approved">().notNull(),
  what: text("what").notNull(), // the task / subtask title at the time, so the record survives renames and deletes
  createdAt: created(),
}, (t) => [index("contribution_team_idx").on(t.teamId, t.createdAt), index("contribution_member_idx").on(t.memberId)]);

// Comments on a team task (members and advisers; guests only read).
export const taskComment = pgTable("task_comment", {
  id: id(),
  taskId: text("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => teamMember.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: created(),
}, (t) => [index("task_comment_task_idx").on(t.taskId, t.createdAt)]);

// ---------- class mode: a Colony (class) run by a Queen Bee (teacher), with Swarms (groups = teams) inside ----------

export const colony = pgTable("colony", {
  id: id(),
  name: text("name").notNull(),
  queenId: text("queen_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  joinCode: text("join_code").notNull().unique(), // 6 characters, no look-alikes
  selfSwarm: boolean("self_swarm").notNull().default(false), // students may form their own swarms
  createdAt: created(),
});

export const colonyMember = pgTable("colony_member", {
  colonyId: text("colony_id").notNull().references(() => colony.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  joinedAt: created(),
}, (t) => [primaryKey({ columns: [t.colonyId, t.userId] }), index("colony_member_user_idx").on(t.userId)]);

// Checkpoints the Queen Bee sets; every swarm in the class sees them.
export const milestone = pgTable("milestone", {
  id: id(),
  colonyId: text("colony_id").notNull().references(() => colony.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  createdAt: created(),
}, (t) => [index("milestone_colony_idx").on(t.colonyId, t.dueAt)]);

export const colonyPost = pgTable("colony_post", {
  id: id(),
  colonyId: text("colony_id").notNull().references(() => colony.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: created(),
}, (t) => [index("colony_post_idx").on(t.colonyId, t.createdAt)]);

// Peer evaluation at the end of a project: each student rates their swarm-mates 1–5 on a few criteria.
export const peerEval = pgTable("peer_eval", {
  id: id(),
  colonyId: text("colony_id").notNull().references(() => colony.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  criteria: jsonb("criteria").$type<string[]>().notNull(),
  open: boolean("open").notNull().default(true),
  showToStudents: boolean("show_to_students").notNull().default(false), // students see their own averages
  createdAt: created(),
});

export const peerResponse = pgTable("peer_response", {
  id: id(),
  evalId: text("eval_id").notNull().references(() => peerEval.id, { onDelete: "cascade" }),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  raterId: text("rater_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  rateeId: text("ratee_id").notNull().references(() => teamMember.id, { onDelete: "cascade" }),
  scores: jsonb("scores").$type<number[]>().notNull(),
  comment: text("comment"),
  createdAt: created(),
}, (t) => [uniqueIndex("peer_response_uq").on(t.evalId, t.raterId, t.rateeId), index("peer_response_eval_idx").on(t.evalId)]);

// ---------- student life in My Cell ----------

export const subject = pgTable("subject", {
  id: id(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // "ASE 111"
  color: text("color").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: created(),
}, (t) => [index("subject_owner_idx").on(t.ownerId)]);

export type TermPeriod = { name: string; start: string; end: string }; // dates as YYYY-MM-DD
export const semester = pgTable("semester", {
  id: id(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "1st Sem A.Y. 2026–2027"
  start: text("start").notNull(),
  end: text("end").notNull(),
  periods: jsonb("periods").$type<TermPeriod[]>().notNull(),
  createdAt: created(),
}, (t) => [index("semester_owner_idx").on(t.ownerId)]);

// A weekly class meeting, shown as a repeating block on the calendar.
export const classSlot = pgTable("class_slot", {
  id: id(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").references(() => subject.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  weekday: smallint("weekday").notNull(), // 0 Sunday … 6 Saturday
  start: text("start").notNull(), // "08:00"
  end: text("end").notNull(),
  room: text("room"),
}, (t) => [index("class_slot_owner_idx").on(t.ownerId)]);

// "Today's 3": up to three tasks picked for one day (the user's own date).
export const focus = pgTable("focus", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  taskIds: jsonb("task_ids").$type<string[]>().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.date] })]);

// ---------- dev team & competition mode ----------

// A hive's own milestones (hackathons use hour-level times).
export const hiveMilestone = pgTable("hive_milestone", {
  id: id(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  hasTime: boolean("has_time").notNull().default(false),
  doneAt: timestamp("done_at", { withTimezone: true }),
  position: integer("position").notNull().default(0),
  createdAt: created(),
}, (t) => [index("hive_milestone_team_idx").on(t.teamId)]);

// Team checklists (submission, pitch prep, anything) where every item can have one owner.
export const teamChecklist = pgTable("team_checklist", {
  id: id(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: created(),
}, (t) => [index("team_checklist_team_idx").on(t.teamId)]);

export const teamChecklistItem = pgTable("team_checklist_item", {
  id: id(),
  checklistId: text("checklist_id").notNull().references(() => teamChecklist.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  ownerId: text("owner_id").references(() => teamMember.id, { onDelete: "set null" }),
  doneAt: timestamp("done_at", { withTimezone: true }),
  doneById: text("done_by_id").references(() => teamMember.id, { onDelete: "set null" }),
  position: integer("position").notNull().default(0),
}, (t) => [index("team_checklist_item_idx").on(t.checklistId)]);

// Test & Results Log: the hive's own numeric fields, and one row per test run / build / attempt.
export const testField = pgTable("test_field", {
  id: id(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Score", "Time", "Accuracy"
  unit: text("unit"), // "s", "%", "ms"
  higherIsBetter: boolean("higher_is_better").notNull().default(true),
  position: integer("position").notNull().default(0),
}, (t) => [index("test_field_team_idx").on(t.teamId)]);

export const testRun = pgTable("test_run", {
  id: id(),
  teamId: text("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => teamMember.id, { onDelete: "set null" }),
  ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
  version: text("version"), // a tag, or a commit / PR / branch link
  result: text("result").$type<"pass" | "fail">(),
  notes: text("notes"),
  values: jsonb("values").$type<Record<string, number>>().notNull().default({}), // test_field id → number
  isBest: boolean("is_best").notNull().default(false),
  createdAt: created(),
}, (t) => [index("test_run_team_idx").on(t.teamId, t.ranAt)]);
