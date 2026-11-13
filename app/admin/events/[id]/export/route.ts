import { isAdmin } from "@/lib/auth";
import { STATUSES, type QuestionStatus, getEventById, listQuestions } from "@/lib/db";

export const dynamic = "force-dynamic";

function cell(v: string | number): string {
  let s = String(v);
  // Stop spreadsheet apps from treating submitted text as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });

  const event = getEventById(Number((await params).id));
  if (!event) return new Response("Not found", { status: 404 });

  const s = new URL(req.url).searchParams.get("status");
  const status = STATUSES.includes(s as QuestionStatus) ? (s as QuestionStatus) : undefined;
  const rows = listQuestions(event.id, status);

  const lines = [
    ["id", "submitted_at_utc", "status", "name", "email", "question"].join(","),
    ...rows.map((q) => [q.id, q.created_at, q.status, q.name, q.email, q.body].map(cell).join(",")),
  ];
  const filename = `${event.slug}${status ? `-${status}` : ""}-questions.csv`;

  return new Response("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
