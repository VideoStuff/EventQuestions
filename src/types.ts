import type { LedWall } from "./led";
import type { ProjScreen } from "./projection";

export type QuestionKind = "text" | "check";

export type GroupId = "general" | "video" | "room";

/** Top-level groups on a show sheet, in display order. */
export const GROUPS: { id: GroupId; name: string }[] = [
  { id: "general", name: "General Info" },
  { id: "video", name: "Video System" },
  { id: "room", name: "Room Setup" },
];

export const groupOf = (c: Category): GroupId => (GROUPS.some((g) => g.id === c.group) ? c.group! : "general");

export interface Category {
  id: string;
  name: string;
  /** Which group the category sits under (older data has none: treated as General Info). */
  group?: GroupId;
  /** "led" shows the LED wall planner, "projection" the projection screen planner. */
  special?: string;
}

export interface Question {
  id: string;
  categoryId: string;
  text: string;
  kind: QuestionKind;
  archived?: boolean;
}

/** Text questions use `text`. Checklist items use `checked` and `note`. */
export interface Answer {
  text?: string;
  checked?: boolean;
  note?: string;
}

export interface ShowMeta {
  op_number: string;
  name: string;
  client: string;
  start_date: string;
  end_date: string;
}

export interface Show {
  id: string;
  meta: ShowMeta;
  answers: Record<string, Answer>;
  walls: LedWall[];
  /** Projection screens (older saved shows may not have this). */
  screens: ProjScreen[];
  /** Questions that belong to this show only. */
  extra: Question[];
  /** Category IDs marked "not used" for this show (older shows don't have this). */
  notUsed?: string[];
  createdAt: string;
  updatedAt: string;
  /** When this show was last downloaded as a file. */
  downloadedAt?: string;
}

/** The question list used for every show. Array order is display order. */
export interface Bank {
  categories: Category[];
  questions: Question[];
}

export function hasAnswer(q: Pick<Question, "kind">, a: Answer | undefined): boolean {
  if (!a) return false;
  return q.kind === "check" ? !!a.checked : !!a.text?.trim();
}

export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

/** Questions to show on a sheet: the shared list (archived ones only if answered) plus show-only ones. */
export function questionsFor(show: Show, bank: Bank): Question[] {
  const shared = bank.questions.filter((q) => !q.archived || hasAnswer(q, show.answers[q.id]));
  return [...shared, ...show.extra];
}

export const isNotUsed = (show: Show, categoryId: string) => !!show.notUsed?.includes(categoryId);

/** Questions that count toward progress: everything except categories marked not used. */
export const activeQuestions = (show: Show, bank: Bank) =>
  questionsFor(show, bank).filter((q) => !isNotUsed(show, q.categoryId));
