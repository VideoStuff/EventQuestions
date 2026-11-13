import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export type QuestionStatus = "new" | "approved" | "dismissed";
export const STATUSES: QuestionStatus[] = ["new", "approved", "dismissed"];

export interface EventRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  event_date: string | null;
  is_open: number;
  created_at: string;
}

export interface QuestionRow {
  id: number;
  event_id: number;
  name: string;
  email: string;
  body: string;
  status: QuestionStatus;
  created_at: string;
}

const globalForDb = globalThis as unknown as { __eqDb?: DatabaseSync };

function open(): DatabaseSync {
  const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "eventquestions.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT NOT NULL UNIQUE,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      event_date  TEXT,
      is_open     INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS questions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name       TEXT NOT NULL DEFAULT '',
      email      TEXT NOT NULL DEFAULT '',
      body       TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','approved','dismissed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_questions_event ON questions(event_id, created_at);
  `);
  return db;
}

export function db(): DatabaseSync {
  globalForDb.__eqDb ??= open();
  return globalForDb.__eqDb;
}

// ---- events ----

export function listEvents(): (EventRow & { question_count: number; new_count: number })[] {
  return db()
    .prepare(
      `SELECT e.*,
              COUNT(q.id) AS question_count,
              COALESCE(SUM(q.status = 'new'), 0) AS new_count
         FROM events e LEFT JOIN questions q ON q.event_id = e.id
        GROUP BY e.id
        ORDER BY e.created_at DESC, e.id DESC`
    )
    .all() as unknown as (EventRow & { question_count: number; new_count: number })[];
}

export function getEventById(id: number): EventRow | undefined {
  return db().prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow | undefined;
}

export function getEventBySlug(slug: string): EventRow | undefined {
  return db().prepare("SELECT * FROM events WHERE slug = ?").get(slug) as EventRow | undefined;
}

export function createEvent(input: { slug: string; title: string; description: string; event_date: string | null }): number {
  const r = db()
    .prepare("INSERT INTO events (slug, title, description, event_date) VALUES (?, ?, ?, ?)")
    .run(input.slug, input.title, input.description, input.event_date);
  return Number(r.lastInsertRowid);
}

export function setEventOpen(id: number, open: boolean) {
  db().prepare("UPDATE events SET is_open = ? WHERE id = ?").run(open ? 1 : 0, id);
}

export function deleteEvent(id: number) {
  db().prepare("DELETE FROM events WHERE id = ?").run(id);
}

// ---- questions ----

export function addQuestion(input: { event_id: number; name: string; email: string; body: string }) {
  db()
    .prepare("INSERT INTO questions (event_id, name, email, body) VALUES (?, ?, ?, ?)")
    .run(input.event_id, input.name, input.email, input.body);
}

export function listQuestions(eventId: number, status?: QuestionStatus): QuestionRow[] {
  if (status) {
    return db()
      .prepare("SELECT * FROM questions WHERE event_id = ? AND status = ? ORDER BY created_at, id")
      .all(eventId, status) as unknown as QuestionRow[];
  }
  return db()
    .prepare("SELECT * FROM questions WHERE event_id = ? ORDER BY created_at, id")
    .all(eventId) as unknown as QuestionRow[];
}

export function setQuestionStatus(id: number, eventId: number, status: QuestionStatus) {
  db().prepare("UPDATE questions SET status = ? WHERE id = ? AND event_id = ?").run(status, id, eventId);
}
