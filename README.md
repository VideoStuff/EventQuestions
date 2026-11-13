# EventQuestions

Collect audience questions **before** an event, then review and export them.

- Organizers create an event and get a shareable link (`/e/<event-name>`).
- Attendees send questions through that link, with an optional name and email.
- Organizers review questions at `/admin/events/<id>`, mark each one **approved** or **dismissed**, close or reopen submissions, and export to CSV (all questions or one status).

Built with Next.js (App Router, server actions) and Node's built-in SQLite (`node:sqlite`), so there are no native modules to compile.

## Requirements

- Node.js 22.13 or newer

## Getting started

```bash
npm install
cp .env.example .env.local   # then set ADMIN_PASSWORD
npm run dev
```

Open http://localhost:3000/admin and sign in with `ADMIN_PASSWORD`.

## Configuration

| Variable         | Required | Default                    | Purpose                              |
| ---------------- | -------- | -------------------------- | ------------------------------------ |
| `ADMIN_PASSWORD` | yes      | none                       | Password for the organizer area      |
| `DATABASE_PATH`  | no       | `./data/eventquestions.db` | Location of the SQLite database file |

Changing `ADMIN_PASSWORD` signs out every organizer session.

## Production

```bash
npm run build
npm start
```

The database is a single file, so deploy to a host with a persistent disk (a VM, Fly.io volume, Railway volume, or similar). Serverless hosts with ephemeral filesystems such as Vercel would lose data.

## Notes

- Spam: the public form includes a hidden honeypot field. There is no rate limiting yet.
- CSV exports escape cells that start with `=`, `+`, `-` or `@`, so spreadsheet apps don't run submitted text as formulas.
- Node prints an `ExperimentalWarning` for SQLite. It is harmless.

## Project layout

```
app/
  e/[slug]/page.tsx                 public question form
  admin/page.tsx                    event list + create event
  admin/login/page.tsx              organizer sign-in
  admin/events/[id]/page.tsx        review questions, open/close, delete
  admin/events/[id]/export/route.ts CSV export
lib/
  db.ts        SQLite schema and queries
  auth.ts      password sign-in via an HMAC session cookie
  validate.ts  form helpers
```
