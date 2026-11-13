import "server-only";
import { getProject, listCategories, listQuestionsForProject } from "./db";
import { hasAnswer } from "./types";

/** A show with the categories and questions that should appear on its sheet. */
export function loadShow(id: number) {
  const show = Number.isInteger(id) ? getProject(id) : undefined;
  if (!show) return null;
  const categories = listCategories();
  // Archived questions stay visible only where they were already answered.
  const questions = listQuestionsForProject(id).filter((q) => !q.archived || hasAnswer(q, show.answers[q.id]));
  return { show, categories, questions };
}
