# HIVE-WORKSPACE

Keep your goals visible and let the team reminders send themselves.

- **My Cell**: year → month → week goals with progress that rolls up, document-style tasks, quick add ("Submit lab report Fri 5pm"), calendar with drag-to-reschedule, a private calendar link for Google/Outlook/Apple.
- **The Hive**: teams as email rosters (teammates never sign up), team tasks with "How to do it", a status board, templates that can repeat.
- **Buzz**: assignment emails, reminders 3 days and 1 day before due, a weekly digest, one-click **Mark done** links with Undo, per-team unsubscribe, an email log.

Built with Next.js (App Router) + TypeScript + Tailwind, Neon Postgres + Drizzle, Better Auth (email magic links + Google), Resend + React Email, FullCalendar, Tiptap. Hosted on Vercel; the hourly scheduler runs on GitHub Actions.

## Run it on your computer

You need Node.js 20 or newer (`sudo pacman -S nodejs npm` on Arch).

```bash
git clone https://github.com/castillanoiananthony/hive-workspace.git
cd hive-workspace
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run db:migrate           # creates the tables
npm run dev                  # open http://localhost:3000
```

In development the sign-in link is also printed in the terminal, so you can sign in without checking email.

## Environment variables

| Name | What it is |
|---|---|
| `DATABASE_URL` | Neon connection string with `-pooler` in the host (used by the app) |
| `DATABASE_URL_UNPOOLED` | Neon connection string without `-pooler` (used for migrations) |
| `RESEND_API_KEY` | Resend API key (`re_…`) |
| `EMAIL_FROM` | Sender, e.g. `HIVE-WORKSPACE <hello@hive-workspace.com>` (domain must be verified in Resend) |
| `BETTER_AUTH_SECRET` | Long random string: `openssl rand -base64 32`. Also signs Mark-done links, so changing it breaks links already emailed |
| `BETTER_AUTH_URL`, `APP_URL` | The site's address: `http://localhost:3000` locally, `https://hive-workspace.com` live |
| `CRON_SECRET` | Long random string; the hourly job must send `Authorization: Bearer <CRON_SECRET>` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional. The "Continue with Google" button appears when both are set |

## Useful commands

```bash
npm test               # unit tests (themes/contrast, rollup, dates, quick add, roster, ics, emails, scheduling)
npm run lint
npm run build          # production build
npm run db:generate    # after editing src/db/schema.ts: create a migration
npm run db:migrate     # apply migrations
```

## Deploy

1. Push to GitHub and import the repository in Vercel (or `npx vercel --prod`).
2. Add every environment variable above in **Vercel → Project → Settings → Environment Variables** (Production), with `APP_URL`/`BETTER_AUTH_URL` set to the real domain.
3. Run `npm run db:migrate` against the production database.
4. **Vercel → Domains**: add `hive-workspace.com`, then at the DNS provider set an `A` record for `@` to `76.76.21.21` and a `CNAME` for `www` to `cname.vercel-dns.com`.
5. **GitHub → Settings → Secrets and variables → Actions**: add `APP_URL` and `CRON_SECRET` so `.github/workflows/hourly.yml` can run the scheduler.
6. Google sign-in: add `https://hive-workspace.com/api/auth/callback/google` to the OAuth client's redirect URIs.

## Where things live

- `src/app/(app)/` — signed-in pages (My Cell, tasks, calendar, The Hive, settings) and their server actions
- `src/app/done`, `src/app/unsubscribe` — pages teammates reach from email (no account)
- `src/lib/buzz.ts` — every Buzz email; each one claims a unique key in `email_log` before sending, so nothing is sent twice
- `src/emails/` — React Email templates
- `src/db/schema.ts`, `drizzle/` — database tables and migrations
