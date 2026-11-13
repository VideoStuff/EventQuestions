import type { LedWall } from "./led";

export type QuestionKind = "text" | "check";

export interface Category {
  id: number;
  name: string;
  position: number;
  /** "led" shows the LED wall planner in this category. */
  special: string | null;
}

export interface Question {
  id: number;
  category_id: number;
  text: string;
  kind: QuestionKind;
  position: number;
  /** null = asked on every project; a number = only that project. */
  project_id: number | null;
  archived: number;
}

/** Text questions use `text`. Checklist items use `checked` and `note`. */
export interface Answer {
  text?: string;
  checked?: boolean;
  note?: string;
}

export interface ProjectMeta {
  op_number: string;
  name: string;
  client: string;
  start_date: string;
  end_date: string;
}

export interface Project extends ProjectMeta {
  id: number;
  answers: Record<string, Answer>;
  led_walls: LedWall[];
  created_at: string;
  updated_at: string;
}

export function hasAnswer(q: Pick<Question, "kind">, a: Answer | undefined): boolean {
  if (!a) return false;
  return q.kind === "check" ? !!a.checked : !!a.text?.trim();
}
