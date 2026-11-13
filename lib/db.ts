import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SEED } from "./seed";
import { sanitizeWalls, type LedWall } from "./led";
import type { Answer, Category, Project, ProjectMeta, Question, QuestionKind } from "./types";

const globalForDb = globalThis as unknown as { __eqDb?: DatabaseSync };

function open(): DatabaseSync {
  const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "eventquestions.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS categories (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT NOT NULL,
      position INTEGER NOT NULL,
      special  TEXT
    );
    CREATE TABLE IF NOT EXISTS projects (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      op_number  TEXT NOT NULL DEFAULT '',
      name       TEXT NOT NULL DEFAULT '',
      client     TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      end_date   TEXT NOT NULL DEFAULT '',
      answers    TEXT NOT NULL DEFAULT '{}',
      led_walls  TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS questions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      text        TEXT NOT NULL,
      kind        TEXT NOT NULL CHECK (kind IN ('text','check')),
      position    INTEGER NOT NULL,
      project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      archived    INTEGER NOT NULL DEFAULT 0
    );
  `);
  seed(db);
  return db;
}

function seed(db: DatabaseSync) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM categories").get() as { n: number };
  if (n > 0) return;
  const addCat = db.prepare("INSERT INTO categories (name, position, special) VALUES (?, ?, ?)");
  const addQ = db.prepare("INSERT INTO questions (category_id, text, kind, position) VALUES (?, ?, ?, ?)");
  db.exec("BEGIN");
  SEED.forEach((c, ci) => {
    const catId = Number(addCat.run(c.name, (ci + 1) * 10, c.special ?? null).lastInsertRowid);
    c.items.forEach(([k, text], qi) => addQ.run(catId, text, k === "c" ? "check" : "text", (qi + 1) * 10));
  });
  db.exec("COMMIT");
}

export function db(): DatabaseSync {
  globalForDb.__eqDb ??= open();
  return globalForDb.__eqDb;
}

// node:sqlite returns null-prototype rows; copy them into plain objects so React can pass them to the browser.
const all = <T>(sql: string, ...args: (string | number | null)[]) =>
  db().prepare(sql).all(...args).map((r) => ({ ...r })) as unknown as T[];
const one = <T>(sql: string, ...args: (string | number | null)[]) => {
  const r = db().prepare(sql).get(...args);
  return (r ? { ...r } : undefined) as T | undefined;
};
const run = (sql: string, ...args: (string | number | null)[]) => db().prepare(sql).run(...args);

// ---------- categories ----------

export const listCategories = () => all<Category>("SELECT * FROM categories ORDER BY position, id");

export function addCategory(name: string): number {
  const { p } = one<{ p: number | null }>("SELECT MAX(position) AS p FROM categories")!;
  return Number(run("INSERT INTO categories (name, position) VALUES (?, ?)", name, (p ?? 0) + 10).lastInsertRowid);
}

export const renameCategory = (id: number, name: string) => run("UPDATE categories SET name = ? WHERE id = ?", name, id);

/** Deletes a category only if no questions use it. Returns false otherwise. */
export function deleteCategory(id: number): boolean {
  const { n } = one<{ n: number }>("SELECT COUNT(*) AS n FROM questions WHERE category_id = ?", id)!;
  if (n > 0) return false;
  run("DELETE FROM categories WHERE id = ?", id);
  return true;
}

function swapPositions(table: "categories" | "questions", a: { id: number; position: number }, b: { id: number; position: number }) {
  db().exec("BEGIN");
  run(`UPDATE ${table} SET position = ? WHERE id = ?`, b.position, a.id);
  run(`UPDATE ${table} SET position = ? WHERE id = ?`, a.position, b.id);
  db().exec("COMMIT");
}

export function moveCategory(id: number, dir: "up" | "down") {
  const list = listCategories();
  const i = list.findIndex((c) => c.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  swapPositions("categories", list[i], list[j]);
}

// ---------- questions ----------

/** Questions asked on every project (the question bank). */
export const listBankQuestions = () =>
  all<Question>("SELECT * FROM questions WHERE project_id IS NULL ORDER BY category_id, position, id");

/** Every question that can appear on this project, including archived ones (the page decides). */
export const listQuestionsForProject = (projectId: number) =>
  all<Question>(
    "SELECT * FROM questions WHERE project_id IS NULL OR project_id = ? ORDER BY category_id, position, id",
    projectId
  );

export const getQuestion = (id: number) => one<Question>("SELECT * FROM questions WHERE id = ?", id);

export function addQuestion(input: { category_id: number; text: string; kind: QuestionKind; project_id: number | null }): Question {
  const { p } = one<{ p: number | null }>("SELECT MAX(position) AS p FROM questions WHERE category_id = ?", input.category_id)!;
  const id = Number(
    run(
      "INSERT INTO questions (category_id, text, kind, position, project_id) VALUES (?, ?, ?, ?, ?)",
      input.category_id,
      input.text,
      input.kind,
      (p ?? 0) + 10,
      input.project_id
    ).lastInsertRowid
  );
  return getQuestion(id)!;
}

export function updateQuestion(id: number, input: { text: string; kind: QuestionKind; category_id: number }) {
  const q = getQuestion(id);
  if (!q) return;
  if (q.category_id !== input.category_id) {
    const { p } = one<{ p: number | null }>("SELECT MAX(position) AS p FROM questions WHERE category_id = ?", input.category_id)!;
    run("UPDATE questions SET position = ? WHERE id = ?", (p ?? 0) + 10, id);
  }
  run("UPDATE questions SET text = ?, kind = ?, category_id = ? WHERE id = ?", input.text, input.kind, input.category_id, id);
}

export const setQuestionArchived = (id: number, archived: boolean) =>
  run("UPDATE questions SET archived = ? WHERE id = ?", archived ? 1 : 0, id);

export const deleteProjectQuestion = (id: number, projectId: number) =>
  run("DELETE FROM questions WHERE id = ? AND project_id = ?", id, projectId);

export function moveQuestion(id: number, dir: "up" | "down") {
  const q = getQuestion(id);
  if (!q) return;
  const list = all<Question>(
    "SELECT * FROM questions WHERE category_id = ? AND project_id IS ? ORDER BY position, id",
    q.category_id,
    q.project_id
  );
  const i = list.findIndex((x) => x.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return;
  swapPositions("questions", list[i], list[j]);
}

// ---------- projects ----------

interface ProjectRow extends Omit<Project, "answers" | "led_walls"> {
  answers: string;
  led_walls: string;
}

function parse(row: ProjectRow): Project {
  let answers: Record<string, Answer> = {};
  let walls: LedWall[] = [];
  try { answers = JSON.parse(row.answers); } catch {}
  try { walls = sanitizeWalls(JSON.parse(row.led_walls)); } catch {}
  return { ...row, answers, led_walls: walls };
}

export const listProjects = () =>
  all<ProjectRow>("SELECT * FROM projects ORDER BY (start_date = ''), start_date DESC, id DESC").map(parse);

export function getProject(id: number): Project | undefined {
  const row = one<ProjectRow>("SELECT * FROM projects WHERE id = ?", id);
  return row && parse(row);
}

export function createProject(meta: ProjectMeta): number {
  return Number(
    run(
      "INSERT INTO projects (op_number, name, client, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
      meta.op_number,
      meta.name,
      meta.client,
      meta.start_date,
      meta.end_date
    ).lastInsertRowid
  );
}

export function saveProject(id: number, meta: ProjectMeta, answers: Record<string, Answer>, walls: LedWall[]) {
  run(
    `UPDATE projects SET op_number = ?, name = ?, client = ?, start_date = ?, end_date = ?,
            answers = ?, led_walls = ?, updated_at = datetime('now') WHERE id = ?`,
    meta.op_number,
    meta.name,
    meta.client,
    meta.start_date,
    meta.end_date,
    JSON.stringify(answers),
    JSON.stringify(walls),
    id
  );
}

export const deleteProject = (id: number) => run("DELETE FROM projects WHERE id = ?", id);
