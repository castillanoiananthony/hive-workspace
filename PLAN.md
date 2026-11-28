# HIVE-WORKSPACE: plan for the student / team / class upgrade

Status: **draft, waiting for approval.** Nothing below has been built yet.

## 1. What's there today

| Layer | Now |
|---|---|
| App | Next.js 16.4.6 (App Router, `cacheComponents`, `src/proxy.ts` instead of middleware), React 19, TypeScript, Tailwind v4 (theme tokens as CSS variables in `globals.css`) |
| Data | Neon Postgres (production + `dev` branch), Drizzle ORM, SQL migrations in `drizzle/` (0000–0010) |
| Auth | Better Auth 1.7: magic link (Resend) + Google. `requireUser()` on every app page |
| Email | Resend + React Email (`src/emails/`), sent through `src/lib/buzz.ts`; hourly GitHub Actions ping → `/api/cron/hourly` |
| Hosting | Vercel (push to `main` deploys), domain at Hostinger |
| Tests | Vitest (44 unit tests), Playwright scripts + an axe accessibility audit (0 violations) |

**Tables:** `user`, `user_image`, `session` / `account` / `verification`, `goal` (year → month → week), `task` (personal or team; `status` enum todo / doing / done; `importance` 0–3), `checklist_item`, `task_link`, `team`, `team_member` (invite or joined; role, powers, hierarchy, nickname), `team_role`, `assignment` (one person's part of a team task: progress 0–100, done time, Buzz token), `progress_log`, `template`, `email_log` (once-only sending), `comb_post` (team feed), `team_link` (Hive Vault), `follow`.

**Already built that the brief asks for** (I'll reuse these, not rebuild):
- Links on tasks (`task_link`), shown in the task page and in Buzz emails.
- A contribution record: `assignment.doneAt` + `progress_log` (who, %, note, when), shown in Activity → "All recorded logs".
- Buzz reminders 3 days and 1 day before, plus a weekly team digest, with one-click **Mark done** and **Unsubscribe**.
- Roles: Leader (the admin) + renamable roles with per-power ticks ("Hive control").
- A web app manifest (`src/app/manifest.ts`) and app icons. There's no service worker yet.

## 2. Decisions I need from you before coding

1. **"Comb" is already taken.** The team feed is called **The Comb** today. Using "Comb" for a class would put two different things under one name. Options: keep The Comb as the team feed and call a class a **"Colony"** (Queen Bee + Swarms fits it), or rename the team feed. My recommendation is **Colony**, because you asked me not to rename existing things.
2. **Roles.** Today a team has Leader + any renamable roles (Leader, Co-lead, Assistant by default). The brief asks for Leader / Member / Adviser / Guest. My plan: add **Adviser** and **Guest** as two built-in *access levels* next to the roles you already have, so nothing existing changes:
   - Adviser: sees everything, can comment, can't edit.
   - Guest: sees the tasks and The Comb only, no comments.
   - "Member" = anyone without a special role, as it works now.

   Is that what you mean by Guest?
3. **Comments.** "Adviser = view + comment" needs task comments, which don't exist yet. I'll add a small comment thread to team tasks in Phase 2. OK?
4. **PDF export.** I'd use the browser's own **Print → Save as PDF** with a clean print layout (no new dependency), plus a real **CSV** download. OK, or do you want a PDF library?
5. **Email limits.** Resend's free plan allows **100 emails a day / 3,000 a month**. Phase 5's daily digest exists to stay under that. A class of 40 getting instant emails could hit the cap in one day. Batching keeps us free; Resend's paid plan is $20/month if you ever need more. I won't upgrade anything without asking.
6. **Offline (Phase 6).** Two ways:
   - (a) hand-write the service worker and offline queue: no new dependency, more code for me.
   - (b) add **Serwist** (the maintained successor to next-pwa): a new major dependency.

   My recommendation is **(a)**, kept small: cache the app shell + your task list, queue check-offs, sync when back online.

## 3. Phases

Each phase: build → run → Playwright test on phone and laptop sizes → accessibility audit → commit → I tell you what changed and how to test it. Database changes are new migrations only, nothing deleted; I'll ask before applying each one to the live database, as we've been doing.

### Phase 1: Public landing page
- **Routes:** `/` becomes a public landing page (signed-in visitors still go straight to `/home`). Sign-in moves to **`/signin`**; `/login` permanently redirects there, so every old link and every magic-link email keeps working. Update `proxy.ts`, Better Auth's `callbackURL` / error page, and all internal links.
- **Sections:**
  - Hero: "Keep your goals visible. Let the team reminders send themselves." with **Sign up** / **Sign in**.
  - My Cell, The Hive, Buzz, and the honeycomb progress, shown with **live mock components** (the real components fed sample data, so they stay accurate as the app changes).
  - A "For students / For teams / For teachers" row.
  - Footer: Privacy, Terms, Who made this?
- **"Try a demo hive":** `/demo` is a read-only workspace with fake data (a sample team, tasks, Comb posts, Activity charts, calendar). It's all in-memory fixtures, with no account and no database writes. Buttons that would change things show "Sign up to do this".
- **Schema:** none.

### Phase 2: Better tasks for teams
- **Subtasks.** New table `subtask`: task, title, **one owner** (member), due date, status, done time, position. Subtasks show under the task and on the owner's "Your progress" page, and each owner gets Buzz reminders for their own subtask. Existing whole-task assignments keep working as they are.
- **Statuses.** Add `review` to the `task_status` enum (To Do → Doing → **Needs Review** → Done). Members can move their work up to Needs Review; only the Leader, or anyone with a new "Approve work" power, can move it to Done. Done → Needs Review is logged.
- **Kanban.** A Board / List switch on the team's Tasks tab:
  - Board view has four columns, and you drag a card to change its status, using the same pointer-drag code as the Hierarchy (works with a finger).
  - Each card shows the importance border.
  - The keyboard alternative is a status menu on each card.
- **Links on tasks:** already exist. I'll show link chips on board cards and make "add link" one tap (auto-detects Drive / Canva / GitHub like the Hive Vault).
- **Contribution log.** New table `contribution` that records every completion automatically (subtask done, part done, review approved, with who and when). Per-member view under Activity, plus **Download CSV** and **Print / PDF**. Existing `progress_log` rows are shown alongside, not migrated.
- **Roles.** Adviser + Guest access levels (decision 2) and task comments (decision 3: new `task_comment` table).
- **Migrations:** enum value `review`, tables `subtask`, `contribution`, `task_comment`, a column on `team_member` for the access level, and a new power key `approve`.

### Phase 3: Class mode ("Colony", pending decision 1)
- **Queen Bee:** any user can create a class and become its Queen Bee.
- **Tables:**
  - `colony`: name, Queen Bee, unique 6-character join code (no look-alike letters such as O/0, I/1).
  - `colony_member`: student, joined time.
  - Each **Swarm** is a normal team with a new `colony_id` column, so every swarm gets The Comb, Tasks, Activity and so on for free.
- **Join and groups:**
  - Students join at `/colony/join`, or by typing the code.
  - The Queen Bee makes the swarms and assigns students, or switches on "students form their own swarms" (a student creates or joins one inside the class).
- **Project templates.** The Queen Bee builds a project (tasks + subtasks + links) and assigns it to **all swarms at once**. Each swarm gets its own copy, reusing the existing `template` / `createTeamTask` code.
- **Milestones.** New table `milestone` (colony, title, date). Milestones appear in every swarm's Tasks, Calendar and Activity as fixed checkpoints.
- **Class dashboard** (`/colony/[id]`):
  - A table of swarms with honeycomb progress, % done, overdue counts and last activity.
  - A **"Quiet for 5+ days"** flag, computed from the newest progress log / contribution / post.
- **Announcements:** a Queen Bee post goes on every swarm's Comb and is emailed through Buzz (respecting each student's notification setting from Phase 5).
- **Peer evaluation:** new tables `peer_eval_form` and `peer_eval_response`. When the Queen Bee closes a project, each student rates teammates (1–5 on a few criteria + a comment). Results show next to the contribution log. Only the Queen Bee sees individual answers; students see their own averages if the Queen Bee allows it.
- **Privacy:** every Queen Bee query goes through one helper, `colonyAccess()`, that only reads swarm (team) tasks. My Cell queries already filter on `team_id IS NULL` + owner. I'll add a test that a Queen Bee requesting a student's personal task gets "not found".

### Phase 4: Student life in My Cell
- **Subject tags:**
  - New table `subject` (owner, code like "ASE 111", colour) and a `task.subject_id` column.
  - A coloured chip on tasks, plus filter chips in My Cell and All tasks.
  - Each colour is checked for text contrast on both themes.
- **Semester templates:**
  - New table `semester` (owner, name like "1st Sem A.Y. 2026–2027", start and end, periods as JSON: prelim, midterm, finals).
  - Picking a semester can create a goal per period, nested under that year's goal (the existing goal ladder).
- **Class schedule:** new table `class_slot` (subject, weekday, start and end time, room). Slots show as recurring blocks on the calendar (FullCalendar recurring events), separate from tasks.
- **Exam countdowns:** a task with a new `is_exam` flag (or the subject's exam date) pins to the top of My Cell and Home: "Midterm ASE 111 in 6 days".
- **Today's 3:** a new `focus` table (user, date, up to 3 task ids). A "Today's 3" card on Home and My Cell, picked from your tasks; it clears itself the next day.
- **Nectar (gentle streaks):** computed from completed-task dates, no new table. It shows "3-day Nectar" with a honeycomb. A missed day just starts a new one quietly, with no "you broke your streak" messages.
- **Migrations:** tables `subject`, `semester`, `class_slot`, `focus`; columns `task.subject_id`, `task.is_exam`.

### Phase 5: Buzz improvements
- **Per-user settings:** new column `user.buzz_mode` (instant / daily digest / off), set in Settings → Buzz. Off still shows everything in the app.
- **Daily digest:**
  - The hourly job collects each person's pending Buzz items (new `buzz_queue` table) and sends **one email per person per day** at 8:00 in their time zone.
  - The existing claim-then-send `email_log` keeps it once-only.
  - Instant mode stays for people who want it.
- **Escalation:** 3 days before (exists), 1 day before (exists), and **on the due day** (new `remind0`), which **CCs the team Leader** if the part still isn't done.
- **Snooze / Need help** buttons in emails, next to Mark done, using the same signed one-click tokens:
  - **Snooze** pushes that person's reminders back a day. It doesn't move the due date.
  - **Need help** posts on the team's Comb ("Ana needs help with Lab report") and notifies the Leader.
- **"Copy update for GC" (Waggle):** a button on the team Tasks tab and the class dashboard. It copies a short plain-text summary (done this week, in progress, due soon, who needs help) that pastes cleanly into Messenger. No links or formatting that break in GC.
- **Migrations:** `user.buzz_mode`, table `buzz_queue`, enum values `remind0`, `snooze`, `help`, columns `assignment.snoozed_until`, `subtask.snoozed_until`.

### Phase 6: Mobile and offline
- **Installable PWA:** finish the manifest (name, theme colours, maskable icons, shortcuts to My Cell / The Hive) and add a service worker (`public/sw.js`, decision 6). It gives an **Install** prompt on Android/Chrome, plus "Add to Home Screen" instructions for iPhone.
- **Offline:**
  - The service worker caches the app shell.
  - Your tasks (My Cell + your team parts) are saved in IndexedDB after every visit, so they open offline.
  - Checking a task off while offline is queued and synced automatically when you're back online, with an "Offline, changes will sync" bar.
  - Conflicts: the newest change wins, and the user is told.
- **Schema:** none (each change carries the time it was made, so "newest wins" is decided on the server).

## 4. Order and size (rough)
Phase 1: small. Phase 2: large. Phase 3: large (depends on Phase 2's subtasks and contribution log). Phase 4: medium. Phase 5: medium (the daily digest affects Phase 3 announcements). Phase 6: medium.
I'll do them in the order you gave, and stop after each phase for you to try it.

---

# Phase 1.5: Dev Team & Competition Mode (plan, waiting for approval)

Phases 1–6 are live, so this phase builds on what exists. A "hive" here is a team in The Hive.

## Already there (reused, not rebuilt)
| Ask | Existing piece it builds on |
|---|---|
| Mentor / Adviser: read-only, can comment | **Adviser** access level + task comments (Phase 2). I'll check advisers see the test log and charts too. |
| Pinned resource library | **Hive Vault** (links grouped by Drive / GitHub / Docs…). Adding: **pin**, and categories (Rules, API docs, Starter code, Judging criteria, Other). |
| Sprint board | **Kanban board** (Phase 2). Adding a time filter: **This week** / **Next 6 hours** (hackathons). |
| Owners per checklist item, reminders | Subtasks have one owner and a due date, and Buzz reminds owners (Phase 5). |
| Export for portfolios | Contribution log + print-to-PDF page (Phase 2). Extending it into a project summary. |
| Milestones + countdown | Class milestones exist (Phase 3). This adds milestones per hive. |

## New
1. **Hive templates** at "New team": Hackathon (24–72 hrs), Coding Competition (multi-round), Software Project (sprints), Blank.
   - Each comes with editable milestones; the Software Project template asks how many sprints.
   - Hackathon milestones use **date + time** (hour-level).
   - Table: `hive_milestone` (team, title, due date and time, done time, position) plus `team.kind`.
2. **Countdown banner** on The Comb to the next milestone: days, or hours and minutes for hackathons. It ticks live on the page.
3. **Checklists with an owner per item:** a team-level `team_checklist` / `team_checklist_item` (text, owner, done).
   - Two presets: **Submission** (repo public, README done, demo video uploaded, form submitted) and, for hackathons, **Pitch / demo prep** (problem, solution, demo flow, tech stack slide, team slide).
   - Fully editable.
4. **Test & Results Log** (new tab):
   - Each entry has date, member, version or commit link, pass/fail and notes, plus the hive's own **numeric fields** (e.g. Score, Time (s), Accuracy %), defined in the tab.
   - Line chart of any field over time, with a **Best version** pin.
   - Tables: `test_field`, `test_run` (values in JSON).
5. **Task types:** Task / **Bug** (steps to reproduce, severity, linked test run) / **Feature** / **Decision** (what we chose and why).
   - Columns on `task`; type icons on the board and list; a Decisions list.
   - GitHub/GitLab links on a task (branch, commit, PR, issue) are **detected and labelled** automatically.
6. **Workstreams:** the hive defines tags (Frontend, Backend, AI/Vision…). Tasks and members get them, and there's a "My stream" filter on the board and list. Tables: `team_stream`, plus `task.stream_id` and `team_member.streams`.
7. **Standup / meeting notes** (new tab). Write notes, and lines like `@Ian fix login bug by Friday` become a task assigned to that person, due on that date, with the normal Buzz email.
   - The parser matches names and nicknames and uses the same date understanding as quick add.
   - You see a preview of the tasks it will create before anything is made.
   - Table: `meeting_note`.
8. **Judging criteria:** paste the criteria (one per line), then link tasks to each criterion. Criteria with nothing linked are flagged. Tables: `criterion`, `task_criterion`.
9. **Who's working now:** a "Working now" switch with an optional status line ("debugging the vision model"). It shows on the hive page and in the Comb sidebar.
   - It switches itself off after 3 hours with no activity.
   - It refreshes about every minute rather than instantly, so no extra paid service is needed.
   - Columns on `team_member`.
10. **Archive + project summary:**
    - The Leader archives a finished hive: it becomes read-only and moves to an "Archived" list, and can be un-archived.
    - **Project summary** page: milestones hit (and when), contributions per person, test results with the best version, decisions made. Printable to PDF, made for portfolios and resumes.
    - Column: `team.archived_at`.

## Decisions I need from you
1. **Files in the Resource Library.** Storing uploaded files (PDF rules, starter code zips) needs file storage. Vercel Blob is the natural choice and has a small free allowance, but it's a new service. My recommendation: **links only for now** (Drive / GitHub links cover most cases), and add file uploads later if you OK Vercel Blob.
2. **Who's working now:** OK with "updates about every minute" rather than instant? Instant would need a real-time service.
3. **Size:** I'd build this in **three steps**, stopping after each for you to try:
   - **1.5a:** templates, milestones and countdown, checklists, archive and summary.
   - **1.5b:** Test & Results Log with chart, task types (Bug, Feature, Decision) and git links.
   - **1.5c:** workstreams, sprint / next-6-hours board, standup notes → tasks, judging criteria, working-now status, Resource Library pins.

Every step: new migrations only, nothing deleted, works on phones, accessibility checked, and your OK before each live database change.
