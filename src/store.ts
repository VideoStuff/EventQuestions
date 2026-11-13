// Everything is kept in this browser (localStorage) and can be saved to / opened from files.
import { useCallback, useEffect, useRef, useState } from "react";
import { migrateBank, seedBank } from "./seed";
import { newWall, sanitizeWalls } from "./led";
import { newScreen, sanitizeScreens } from "./projection";
import { groupOf, newId, type GroupId, type Answer, type Bank, type Category, type Question, type Show, type ShowMeta } from "./types";

const KEY = "show-sheets:v1";

export interface Data {
  bank: Bank;
  shows: Show[];
}

export type StorageState = "ok" | "unavailable";

function load(): { data: Data; storage: StorageState } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Data;
      if (d?.bank?.categories && Array.isArray(d.shows)) return { data: { bank: migrateBank(d.bank), shows: d.shows.map((s) => ({ ...s, screens: s.screens ?? [] })) }, storage: "ok" };
    }
    localStorage.setItem("show-sheets:probe", "1");
    localStorage.removeItem("show-sheets:probe");
    return { data: { bank: seedBank(), shows: [] }, storage: "ok" };
  } catch {
    return { data: { bank: seedBank(), shows: [] }, storage: "unavailable" };
  }
}

export function useData() {
  const [{ data, storage }, setState] = useState(load);
  const skipSave = useRef(true);

  useEffect(() => {
    if (skipSave.current) { skipSave.current = false; return; }
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      if (storage !== "ok") setState((s) => ({ ...s, storage: "ok" }));
    } catch {
      setState((s) => (s.storage === "unavailable" ? s : { ...s, storage: "unavailable" }));
    }
  }, [data, storage]);

  // Keep several open tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        skipSave.current = true;
        setState((s) => ({ ...s, data: JSON.parse(e.newValue!) }));
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (d: Data) => Data) => setState((s) => ({ ...s, data: fn(s.data) })), []);
  return { data, storage, update };
}

export type Update = (fn: (d: Data) => Data) => void;
const now = () => new Date().toISOString();

// ---------- shows ----------

export function createShow(update: Update, meta: ShowMeta): string {
  const id = newId("show");
  const t = now();
  update((d) => ({ ...d, shows: [{ id, meta, answers: {}, walls: [], screens: [], extra: [], createdAt: t, updatedAt: t }, ...d.shows] }));
  return id;
}

export function patchShow(update: Update, id: string, patch: Partial<Pick<Show, "meta" | "answers" | "walls" | "screens" | "extra" | "notUsed">>) {
  update((d) => ({
    ...d,
    shows: d.shows.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: now() } : s)),
  }));
}

export const markDownloaded = (update: Update, ids: string[]) =>
  update((d) => ({ ...d, shows: d.shows.map((s) => (ids.includes(s.id) ? { ...s, downloadedAt: now() } : s)) }));

export const deleteShow = (update: Update, id: string) => update((d) => ({ ...d, shows: d.shows.filter((s) => s.id !== id) }));

export function duplicateShow(update: Update, show: Show): string {
  const id = newId("show");
  const t = now();
  update((d) => ({
    ...d,
    shows: [
      {
        ...structuredClone(show),
        id,
        meta: { ...show.meta, name: `${show.meta.name} (copy)` },
        walls: show.walls.map((w) => ({ ...w, id: newWall(0).id })),
        screens: show.screens.map((s) => ({ ...s, id: newScreen(0).id })),
        createdAt: t,
        updatedAt: t,
        downloadedAt: undefined,
      },
      ...d.shows,
    ],
  }));
  return id;
}

// ---------- question list ----------

export function addQuestion(update: Update, q: Omit<Question, "id">, showId?: string): Question {
  const question = { ...q, id: newId("q") };
  update((d) =>
    showId
      ? { ...d, shows: d.shows.map((s) => (s.id === showId ? { ...s, extra: [...s.extra, question], updatedAt: now() } : s)) }
      : { ...d, bank: { ...d.bank, questions: [...d.bank.questions, question] } }
  );
  return question;
}

export const editQuestion = (update: Update, id: string, patch: Partial<Omit<Question, "id">>) =>
  update((d) => {
    const q = d.bank.questions.find((x) => x.id === id);
    if (!q) return d;
    const moved = patch.categoryId && patch.categoryId !== q.categoryId;
    const others = d.bank.questions.filter((x) => x.id !== id);
    const next = { ...q, ...patch };
    // Moving to another category puts it at the end of that category.
    return { ...d, bank: { ...d.bank, questions: moved ? [...others, next] : d.bank.questions.map((x) => (x.id === id ? next : x)) } };
  });

export const removeShowQuestion = (update: Update, showId: string, qid: string) =>
  update((d) => ({
    ...d,
    shows: d.shows.map((s) => {
      if (s.id !== showId) return s;
      const answers = { ...s.answers };
      delete answers[qid];
      return { ...s, extra: s.extra.filter((q) => q.id !== qid), answers, updatedAt: now() };
    }),
  }));

/** Swap a question with its neighbour in the same category. */
export const moveQuestion = (update: Update, id: string, dir: -1 | 1) =>
  update((d) => {
    const list = [...d.bank.questions];
    const i = list.findIndex((q) => q.id === id);
    if (i < 0) return d;
    let j = i + dir;
    while (j >= 0 && j < list.length && list[j].categoryId !== list[i].categoryId) j += dir;
    if (j < 0 || j >= list.length) return d;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...d, bank: { ...d.bank, questions: list } };
  });

export function addCategory(update: Update, name: string, group: GroupId = "general"): Category {
  const c: Category = { id: newId("c"), name, group };
  update((d) => ({ ...d, bank: { ...d.bank, categories: [...d.bank.categories, c] } }));
  return c;
}

export const renameCategory = (update: Update, id: string, name: string) =>
  update((d) => ({ ...d, bank: { ...d.bank, categories: d.bank.categories.map((c) => (c.id === id ? { ...c, name } : c)) } }));

export const setCategoryGroup = (update: Update, id: string, group: GroupId) =>
  update((d) => {
    const c = d.bank.categories.find((x) => x.id === id);
    if (!c) return d;
    // Moving to another group puts it at the end of that group.
    return { ...d, bank: { ...d.bank, categories: [...d.bank.categories.filter((x) => x.id !== id), { ...c, group }] } };
  });

/** Swap a category with its neighbour in the same group. */
export const moveCategory = (update: Update, id: string, dir: -1 | 1) =>
  update((d) => {
    const list = [...d.bank.categories];
    const i = list.findIndex((c) => c.id === id);
    if (i < 0) return d;
    let j = i + dir;
    while (j >= 0 && j < list.length && groupOf(list[j]) !== groupOf(list[i])) j += dir;
    if (j < 0 || j >= list.length) return d;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...d, bank: { ...d.bank, categories: list } };
  });

/** Only empty categories can be deleted (no shared or show-only questions use it). */
export const canDeleteCategory = (d: Data, id: string) =>
  !d.bank.questions.some((q) => q.categoryId === id) && !d.shows.some((s) => s.extra.some((q) => q.categoryId === id));

export const deleteCategory = (update: Update, id: string) =>
  update((d) => (canDeleteCategory(d, id) ? { ...d, bank: { ...d.bank, categories: d.bank.categories.filter((c) => c.id !== id) } } : d));

// ---------- cleaning data from files ----------

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export function cleanMeta(m: unknown): ShowMeta {
  const r = (m ?? {}) as Record<string, unknown>;
  return {
    op_number: str(r.op_number, 50),
    name: str(r.name, 200),
    client: str(r.client, 200),
    start_date: str(r.start_date, 10),
    end_date: str(r.end_date, 10),
  };
}

export function cleanAnswers(input: unknown): Record<string, Answer> {
  const out: Record<string, Answer> = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, raw] of Object.entries(input as Record<string, Answer>).slice(0, 5000)) {
    if (!raw || typeof raw !== "object") continue;
    const a: Answer = {};
    if (raw.text) a.text = str(raw.text, 20000);
    if (raw.checked) a.checked = true;
    if (raw.note) a.note = str(raw.note, 2000);
    if (Object.keys(a).length) out[str(k, 60)] = a;
  }
  return out;
}

export function cleanQuestion(raw: unknown): Question | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const id = str(r.id, 60), categoryId = str(r.categoryId, 60), text = str(r.text, 300);
  if (!id || !categoryId || !text) return null;
  return { id, categoryId, text, kind: r.kind === "check" ? "check" : "text", ...(r.archived ? { archived: true } : {}) };
}

export function cleanCategory(raw: unknown): Category | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const id = str(r.id, 60), name = str(r.name, 100);
  if (!id || !name) return null;
  return {
    id,
    name,
    ...(r.special === "led" || r.special === "projection" ? { special: r.special } : {}),
    ...(r.group === "general" || r.group === "video" || r.group === "room" ? { group: r.group } : {}),
  };
}

export { sanitizeWalls, sanitizeScreens };
