// Saving shows to .json files and opening them again.
import { cleanAnswers, cleanCategory, cleanMeta, cleanQuestion, sanitizeWalls, type Data } from "./store";
import { newId, questionsFor, type Bank, type Category, type Question, type Show } from "./types";

const APP = "show-sheets";
const VERSION = 1;

interface ShowFile {
  app: typeof APP;
  type: "show";
  version: number;
  exportedAt: string;
  show: Omit<Show, "extra" | "downloadedAt">;
  /** Categories and questions on this sheet, so the file opens complete on any computer. */
  categories: Category[];
  questions: (Question & { showOnly?: boolean })[];
}
interface BackupFile {
  app: typeof APP;
  type: "backup";
  version: number;
  exportedAt: string;
  bank: Bank;
  shows: ShowFile[];
}
interface QuestionsFile {
  app: typeof APP;
  type: "questions";
  version: number;
  exportedAt: string;
  bank: Bank;
}

// ---------- download ----------

function download(name: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 120);
const today = () => new Date().toISOString().slice(0, 10);

export function showFileName(show: Show) {
  return safeName([show.meta.op_number, show.meta.name || "Untitled show"].filter(Boolean).join(" ")) + ".json";
}

function toShowFile(show: Show, bank: Bank): ShowFile {
  const qs = questionsFor(show, bank);
  const catIds = new Set(qs.map((q) => q.categoryId));
  const extraIds = new Set(show.extra.map((q) => q.id));
  return {
    app: APP,
    type: "show",
    version: VERSION,
    exportedAt: new Date().toISOString(),
    show: { id: show.id, meta: show.meta, answers: show.answers, walls: show.walls, createdAt: show.createdAt, updatedAt: show.updatedAt },
    categories: bank.categories.filter((c) => catIds.has(c.id) || c.special === "led"),
    questions: qs.map((q) => (extraIds.has(q.id) ? { ...q, showOnly: true } : q)),
  };
}

export const downloadShow = (show: Show, bank: Bank) => download(showFileName(show), toShowFile(show, bank));

export const downloadBackup = (data: Data) =>
  download(`Show Sheets backup ${today()}.json`, {
    app: APP,
    type: "backup",
    version: VERSION,
    exportedAt: new Date().toISOString(),
    bank: data.bank,
    shows: data.shows.map((s) => toShowFile(s, data.bank)),
  } satisfies BackupFile);

export const downloadQuestions = (bank: Bank) =>
  download(`Show Sheets questions ${today()}.json`, {
    app: APP,
    type: "questions",
    version: VERSION,
    exportedAt: new Date().toISOString(),
    bank,
  } satisfies QuestionsFile);

// ---------- open ----------

export type Parsed =
  | { kind: "show"; file: ShowFile }
  | { kind: "backup"; file: BackupFile }
  | { kind: "questions"; file: QuestionsFile };

export async function readFile(f: File): Promise<Parsed> {
  if (f.size > 20 * 1024 * 1024) throw new Error("That file is too large to be a show sheet.");
  let obj: unknown;
  try {
    obj = JSON.parse(await f.text());
  } catch {
    throw new Error(`"${f.name}" isn't a Show Sheets file (it isn't valid JSON).`);
  }
  const o = obj as { app?: string; type?: string; version?: number };
  if (o?.app !== APP) throw new Error(`"${f.name}" isn't a Show Sheets file.`);
  if ((o.version ?? 0) > VERSION) throw new Error(`"${f.name}" was made by a newer version of Show Sheets. Reload the page and try again.`);
  if (o.type === "show") return { kind: "show", file: obj as ShowFile };
  if (o.type === "backup") return { kind: "backup", file: obj as BackupFile };
  if (o.type === "questions") return { kind: "questions", file: obj as QuestionsFile };
  throw new Error(`"${f.name}" isn't a Show Sheets file.`);
}

/** Add categories/questions from a file that this browser doesn't have; update wording of ones it has. */
export function mergeBank(bank: Bank, incoming: Bank): Bank {
  const cats = [...bank.categories];
  const catMap = new Map<string, string>();
  for (const raw of incoming.categories ?? []) {
    const c = cleanCategory(raw);
    if (!c) continue;
    const same = cats.find((x) => x.id === c.id) ?? cats.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
    if (same) catMap.set(c.id, same.id);
    else { cats.push(c); catMap.set(c.id, c.id); }
  }
  const qs = [...bank.questions];
  for (const raw of incoming.questions ?? []) {
    const q = cleanQuestion(raw);
    if (!q) continue;
    const categoryId = catMap.get(q.categoryId) ?? q.categoryId;
    if (!cats.some((c) => c.id === categoryId)) continue;
    const i = qs.findIndex((x) => x.id === q.id);
    if (i >= 0) qs[i] = { ...q, categoryId };
    else qs.push({ ...q, categoryId });
  }
  return { categories: cats, questions: qs };
}

/**
 * Put a show file into the data. Questions the browser doesn't know become show-only questions,
 * so no answer is ever hidden. `asCopy` gives the show a new ID instead of replacing one with the same ID.
 */
export function applyShowFile(data: Data, file: ShowFile, asCopy: boolean): { data: Data; showId: string } {
  const bank: Bank = { categories: [...data.bank.categories], questions: data.bank.questions };
  const catMap = new Map<string, string>();
  for (const raw of file.categories ?? []) {
    const c = cleanCategory(raw);
    if (!c) continue;
    const same = bank.categories.find((x) => x.id === c.id) ?? bank.categories.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
    if (same) catMap.set(c.id, same.id);
    else { bank.categories.push(c); catMap.set(c.id, c.id); }
  }
  const known = new Set(bank.questions.map((q) => q.id));
  const extra: Question[] = [];
  for (const raw of file.questions ?? []) {
    const q = cleanQuestion(raw);
    if (!q || known.has(q.id)) continue;
    const categoryId = catMap.get(q.categoryId) ?? q.categoryId;
    if (!bank.categories.some((c) => c.id === categoryId)) continue;
    const { archived: _a, ...rest } = q;
    extra.push({ ...rest, categoryId });
  }

  const src = file.show ?? ({} as ShowFile["show"]);
  const id = asCopy || typeof src.id !== "string" || !src.id ? newId("show") : src.id.slice(0, 60);
  const t = new Date().toISOString();
  const show: Show = {
    id,
    meta: cleanMeta(src.meta),
    answers: cleanAnswers(src.answers),
    walls: sanitizeWalls(src.walls),
    extra,
    createdAt: typeof src.createdAt === "string" ? src.createdAt : t,
    updatedAt: typeof src.updatedAt === "string" ? src.updatedAt : t,
    downloadedAt: t, // it just came from a file, so the file is up to date
  };
  return { data: { bank, shows: [show, ...data.shows.filter((s) => s.id !== id)] }, showId: id };
}
