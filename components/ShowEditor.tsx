"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addQuestionAction, removeShowQuestionAction, saveShowAction } from "@/app/actions";
import type { LedWall } from "@/lib/led";
import { hasAnswer, type Answer, type Category, type ProjectMeta, type Question } from "@/lib/types";
import LedWalls from "./LedWalls";

type SaveState = "saved" | "dirty" | "saving" | "error";

export default function ShowEditor(props: {
  showId: number;
  meta: ProjectMeta;
  answers: Record<string, Answer>;
  walls: LedWall[];
  categories: Category[];
  questions: Question[];
}) {
  const { showId, categories } = props;
  const [meta, setMeta] = useState(props.meta);
  const [answers, setAnswers] = useState(props.answers);
  const [walls, setWalls] = useState(props.walls);
  const [questions, setQuestions] = useState(props.questions);
  const [save, setSave] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");

  // ---- autosave: 0.8 s after the last change ----
  const latest = useRef({ meta, answers, walls });
  latest.current = { meta, answers, walls };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setSave("saving");
    try {
      const r = await saveShowAction(showId, latest.current);
      if (r.ok) setSave((s) => (s === "saving" ? "saved" : s));
      else { setSave("error"); setSaveError(r.error); }
    } catch {
      setSave("error");
      setSaveError("Couldn't save. Check your connection; changes will be retried on your next edit.");
    }
  }, [showId]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSave("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  }, [meta, answers, walls, flush]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (timer.current) { void flush(); e.preventDefault(); }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [flush]);

  const setAnswer = (qid: number, patch: Partial<Answer>) =>
    setAnswers((a) => ({ ...a, [qid]: { ...a[qid], ...patch } }));

  const byCat = (cid: number) => questions.filter((q) => q.category_id === cid);
  const total = questions.length;
  const done = questions.filter((q) => hasAnswer(q, answers[q.id])).length;

  return (
    <div className="editor">
      <aside className="toc no-print">
        <div className={`savestate ${save}`} role="status">
          {save === "saved" ? "All changes saved" : save === "error" ? "Not saved" : "Saving…"}
        </div>
        <div className="muted small">{done} of {total} filled</div>
        <nav>
          {categories.map((c) => {
            const qs = byCat(c.id);
            const n = qs.filter((q) => hasAnswer(q, answers[q.id])).length;
            return (
              <a key={c.id} href={`#cat-${c.id}`}>
                <span>{c.name}</span>
                <span className={`count ${qs.length && n === qs.length ? "full" : ""}`}>
                  {c.special === "led" && walls.length ? `${walls.length} wall${walls.length > 1 ? "s" : ""} · ` : ""}
                  {n}/{qs.length}
                </span>
              </a>
            );
          })}
        </nav>
        <a className="button secondary" href={`/shows/${showId}/print`} target="_blank">Print / PDF</a>
      </aside>

      <div className="sheet">
        {save === "error" && <div className="card error">{saveError}</div>}

        <section className="card">
          <div className="grid2">
            <label>OP Number<input value={meta.op_number} maxLength={50} onChange={(e) => setMeta({ ...meta, op_number: e.target.value })} /></label>
            <label>Show name<input value={meta.name} maxLength={200} onChange={(e) => setMeta({ ...meta, name: e.target.value })} /></label>
            <label>Client<input value={meta.client} maxLength={200} onChange={(e) => setMeta({ ...meta, client: e.target.value })} /></label>
            <span />
            <label>Start date<input type="date" value={meta.start_date} onChange={(e) => setMeta({ ...meta, start_date: e.target.value })} /></label>
            <label>End date<input type="date" value={meta.end_date} onChange={(e) => setMeta({ ...meta, end_date: e.target.value })} /></label>
          </div>
        </section>

        {categories.map((c) => {
          const qs = byCat(c.id);
          const text = qs.filter((q) => q.kind === "text");
          const checks = qs.filter((q) => q.kind === "check");
          return (
            <section key={c.id} id={`cat-${c.id}`} className="card category">
              <h2>{c.name}</h2>

              {c.special === "led" && <LedWalls walls={walls} onChange={setWalls} />}

              {text.map((q) => (
                <div className="qa" key={q.id}>
                  <label htmlFor={`q-${q.id}`}>
                    {q.text}
                    <QuestionTags q={q} onRemove={() => removeQuestion(q)} />
                  </label>
                  <AutoTextarea
                    id={`q-${q.id}`}
                    value={answers[q.id]?.text ?? ""}
                    onChange={(v) => setAnswer(q.id, { text: v })}
                  />
                </div>
              ))}

              {checks.length > 0 && (
                <ul className="checklist">
                  {checks.map((q) => (
                    <li key={q.id} className={answers[q.id]?.checked ? "done" : ""}>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={!!answers[q.id]?.checked}
                          onChange={(e) => setAnswer(q.id, { checked: e.target.checked })}
                        />
                        <span>{q.text}</span>
                        <QuestionTags q={q} onRemove={() => removeQuestion(q)} />
                      </label>
                      <input
                        className="note"
                        placeholder="Notes"
                        aria-label={`${q.text} notes`}
                        value={answers[q.id]?.note ?? ""}
                        maxLength={2000}
                        onChange={(e) => setAnswer(q.id, { note: e.target.value })}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <AddQuestion
                onAdd={async (text, kind, everyShow) => {
                  const r = await addQuestionAction({ showId, categoryId: c.id, text, kind, everyShow });
                  if (r.ok) setQuestions((list) => [...list, r.question]);
                  return r.ok ? "" : r.error;
                }}
              />
            </section>
          );
        })}
      </div>
    </div>
  );

  async function removeQuestion(q: Question) {
    if (!confirm(`Remove "${q.text}" from this show?`)) return;
    await removeShowQuestionAction(showId, q.id);
    setQuestions((list) => list.filter((x) => x.id !== q.id));
    setAnswers((a) => { const n = { ...a }; delete n[q.id]; return n; });
  }
}

function QuestionTags({ q, onRemove }: { q: Question; onRemove: () => void }) {
  if (q.project_id != null) {
    return (
      <span className="tag">
        this show only
        <button type="button" className="link" onClick={(e) => { e.preventDefault(); onRemove(); }} aria-label={`Remove ${q.text}`}>
          ×
        </button>
      </span>
    );
  }
  if (q.archived) return <span className="tag">archived</span>;
  return null;
}

function AutoTextarea({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight + 2, 44)}px`;
  }, [value]);
  return <textarea ref={ref} id={id} rows={1} value={value} maxLength={20000} onChange={(e) => onChange(e.target.value)} />;
}

function AddQuestion({ onAdd }: { onAdd: (text: string, kind: "text" | "check", everyShow: boolean) => Promise<string> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"text" | "check">("text");
  const [everyShow, setEveryShow] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" className="link add-q no-print" onClick={() => setOpen(true)}>
        + Add question
      </button>
    );
  }
  return (
    <form
      className="add-q-form no-print"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const err = await onAdd(text, kind, everyShow);
        setBusy(false);
        setError(err);
        if (!err) { setText(""); setOpen(false); }
      }}
    >
      <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="New question" maxLength={300} aria-label="New question" />
      <select value={kind} onChange={(e) => setKind(e.target.value as "text" | "check")} aria-label="Type">
        <option value="text">Question</option>
        <option value="check">Checklist item</option>
      </select>
      <label className="check small">
        <input type="checkbox" checked={everyShow} onChange={(e) => setEveryShow(e.target.checked)} />
        <span>Add to every show</span>
      </label>
      <div className="row">
        <button type="submit" disabled={busy}>Add</button>
        <button type="button" className="secondary" onClick={() => { setOpen(false); setError(""); }}>Cancel</button>
      </div>
      {error && <div className="small" style={{ color: "var(--warn)" }}>{error}</div>}
    </form>
  );
}
