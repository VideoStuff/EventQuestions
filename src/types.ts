import type { LedWall } from "./led";

export type QuestionKind = "text" | "check";

export interface Category {
  id: string;
  name: string;
  /** "led" shows the LED wall planner in this category. */
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
  /** Questions that belong to this show only. */
  extra: Question[];
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
