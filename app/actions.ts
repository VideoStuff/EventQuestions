"use server";

import { requireUser } from "@/lib/auth";
import { addQuestion, deleteProjectQuestion, getProject, listCategories, saveProject } from "@/lib/db";
import { sanitizeWalls } from "@/lib/led";
import type { Answer, ProjectMeta, Question } from "@/lib/types";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export async function saveShowAction(id: number, payload: { meta: ProjectMeta; answers: Record<string, Answer>; walls: unknown }) {
  await requireUser();
  if (!getProject(id)) return { ok: false as const, error: "This show no longer exists." };

  const meta: ProjectMeta = {
    op_number: s(payload.meta?.op_number, 50),
    name: s(payload.meta?.name, 200),
    client: s(payload.meta?.client, 200),
    start_date: s(payload.meta?.start_date, 10),
    end_date: s(payload.meta?.end_date, 10),
  };
  const answers: Record<string, Answer> = {};
  for (const [k, raw] of Object.entries(payload.answers ?? {}).slice(0, 2000)) {
    if (!/^\d+$/.test(k) || !raw || typeof raw !== "object") continue;
    const a: Answer = {};
    if (raw.text) a.text = s(raw.text, 20000);
    if (raw.checked) a.checked = true;
    if (raw.note) a.note = s(raw.note, 2000);
    if (Object.keys(a).length) answers[k] = a;
  }
  saveProject(id, meta, answers, sanitizeWalls(payload.walls));
  return { ok: true as const };
}

export async function addQuestionAction(input: {
  showId: number;
  categoryId: number;
  text: string;
  kind: "text" | "check";
  everyShow: boolean;
}): Promise<{ ok: true; question: Question } | { ok: false; error: string }> {
  await requireUser();
  const text = s(input.text, 300).trim();
  if (!text) return { ok: false, error: "Type the question first." };
  if (!listCategories().some((c) => c.id === input.categoryId)) return { ok: false, error: "Unknown category." };
  if (!getProject(input.showId)) return { ok: false, error: "This show no longer exists." };
  const question = addQuestion({
    category_id: input.categoryId,
    text,
    kind: input.kind === "check" ? "check" : "text",
    project_id: input.everyShow ? null : input.showId,
  });
  return { ok: true, question };
}

export async function removeShowQuestionAction(showId: number, questionId: number) {
  await requireUser();
  deleteProjectQuestion(questionId, showId);
  return { ok: true as const };
}
