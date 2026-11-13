import { useEffect, useRef, useState } from "react";
import { addQuestion, deleteShow, duplicateShow, markDownloaded, patchShow, removeShowQuestion, type Update } from "../store";
import { downloadShow } from "../files";
import { hasAnswer, questionsFor, type Answer, type Bank, type Question, type Show } from "../types";
import LedWalls from "./LedWalls";
import ProjectionScreens from "./ProjectionScreens";
import { go } from "../router";
import { useOpenSet } from "../ui";

export const needsDownload = (s: Show) => !s.downloadedAt || s.updatedAt > s.downloadedAt;

export default function ShowEditor({ show, bank, update }: { show: Show; bank: Bank; update: Update }) {
  const { meta, answers, walls, screens } = show;
  const questions = questionsFor(show, bank);
  const setMeta = (patch: Partial<Show["meta"]>) => patchShow(update, show.id, { meta: { ...meta, ...patch } });
  const setAnswer = (qid: string, patch: Partial<Answer>) =>
    patchShow(update, show.id, { answers: { ...answers, [qid]: { ...answers[qid], ...patch } } });

  const byCat = (cid: string) => questions.filter((q) => q.categoryId === cid);
  const done = questions.filter((q) => hasAnswer(q, answers[q.id])).length;
  const unsaved = needsDownload(show);

  const sections = bank.categories.filter((c) => byCat(c.id).length || c.special);
  const { open, toggle, setAll } = useOpenSet("show-sheets:open-sections", [bank.categories[0]?.id ?? ""]);
  const jump = (id: string) => {
    toggle(id, true);
    requestAnimationFrame(() => document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const plannerSummary = (special?: string) =>
    special === "led" && walls.length ? `${walls.length} wall${walls.length > 1 ? "s" : ""}`
    : special === "projection" && screens.length ? `${screens.length} screen${screens.length > 1 ? "s" : ""}`
    : "";

  const save = () => {
    downloadShow(show, bank);
    markDownloaded(update, [show.id]);
  };

  return (
    <div className="editor">
      <aside className="toc no-print">
        <button type="button" onClick={save} className={unsaved ? "" : "secondary"}>Download show file</button>
        <div className={`savestate ${unsaved ? "dirty" : "saved"}`} role="status">
          {unsaved
            ? show.downloadedAt ? "Changed since your last download" : "Not downloaded yet"
            : "File is up to date"}
        </div>
        <div className="muted small">{done} of {questions.length} filled</div>
        <div className="row toc-tools">
          <button type="button" className="link small" onClick={() => setAll(sections.map((c) => c.id))}>Expand all</button>
          <button type="button" className="link small" onClick={() => setAll([])}>Collapse all</button>
        </div>
        <nav>
          {sections.map((c) => {
            const qs = byCat(c.id);
            const n = qs.filter((q) => hasAnswer(q, answers[q.id])).length;
            const extra = plannerSummary(c.special);
            return (
              <a key={c.id} href={`#cat-${c.id}`} className={open.has(c.id) ? "is-open" : ""} onClick={(e) => { e.preventDefault(); jump(c.id); }}>
                <span>{c.name}</span>
                <span className={`count ${qs.length && n === qs.length ? "full" : ""}`}>
                  {extra && `${extra} · `}{n}/{qs.length}
                </span>
              </a>
            );
          })}
        </nav>
        <a className="button secondary" href={`#/show/${show.id}/print`}>Print / PDF</a>
      </aside>

      <div className="sheet">
        <section className="card show-meta">
          <div className="grid2">
            <label>OP Number<input value={meta.op_number} maxLength={50} onChange={(e) => setMeta({ op_number: e.target.value })} /></label>
            <label>Show name<input value={meta.name} maxLength={200} onChange={(e) => setMeta({ name: e.target.value })} /></label>
            <label>Client<input value={meta.client} maxLength={200} onChange={(e) => setMeta({ client: e.target.value })} /></label>
            <span />
            <label>Start date<input type="date" value={meta.start_date} onChange={(e) => setMeta({ start_date: e.target.value })} /></label>
            <label>End date<input type="date" value={meta.end_date} onChange={(e) => setMeta({ end_date: e.target.value })} /></label>
          </div>
        </section>

        {sections.map((c) => {
          const qs = byCat(c.id);
          const text = qs.filter((q) => q.kind === "text");
          const checks = qs.filter((q) => q.kind === "check");
          const n = qs.filter((q) => hasAnswer(q, answers[q.id])).length;
          const isOpen = open.has(c.id);
          const extra = plannerSummary(c.special);
          return (
            <section key={c.id} id={`cat-${c.id}`} className={`category ${isOpen ? "open" : ""}`}>
              <h2>
                <button type="button" className="cat-head" aria-expanded={isOpen} aria-controls={`body-${c.id}`} onClick={() => toggle(c.id)}>
                  <span className="chev" aria-hidden="true">›</span>
                  <span className="cat-title">{c.name}</span>
                  {extra && <span className="pill">{extra}</span>}
                  <span className={`count ${qs.length && n === qs.length ? "full" : ""}`}>{n}/{qs.length}</span>
                </button>
              </h2>
              {isOpen && <div className="cat-body" id={`body-${c.id}`}>

              {c.special === "led" && <LedWalls walls={walls} onChange={(w) => patchShow(update, show.id, { walls: w })} />}
              {c.special === "projection" && (
                <ProjectionScreens screens={screens} onChange={(s) => patchShow(update, show.id, { screens: s })} />
              )}

              {text.map((q) => (
                <div className="qa" key={q.id}>
                  <label htmlFor={`q-${q.id}`}>
                    {q.text}
                    <QuestionTags q={q} show={show} onRemove={() => removeQuestion(q)} />
                  </label>
                  <AutoTextarea id={`q-${q.id}`} value={answers[q.id]?.text ?? ""} onChange={(v) => setAnswer(q.id, { text: v })} />
                </div>
              ))}

              {checks.length > 0 && (
                <ul className="checklist">
                  {checks.map((q) => (
                    <li key={q.id} className={answers[q.id]?.checked ? "done" : ""}>
                      <label className="check">
                        <input type="checkbox" checked={!!answers[q.id]?.checked} onChange={(e) => setAnswer(q.id, { checked: e.target.checked })} />
                        <span>{q.text}</span>
                        <QuestionTags q={q} show={show} onRemove={() => removeQuestion(q)} />
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
                onAdd={(text, kind, everyShow) => {
                  addQuestion(update, { categoryId: c.id, text, kind }, everyShow ? undefined : show.id);
                }}
              />
              </div>}
            </section>
          );
        })}

        <details className="card danger-zone no-print">
          <summary>More</summary>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="secondary" onClick={() => go(`/show/${duplicateShow(update, show)}`)}>
              Duplicate this show
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                if (confirm(`Delete "${meta.name || "this show"}" from this browser? Show files you downloaded are not affected.`)) {
                  deleteShow(update, show.id);
                  go("/");
                }
              }}
            >
              Delete from this browser
            </button>
          </div>
        </details>
      </div>
    </div>
  );

  function removeQuestion(q: Question) {
    if (confirm(`Remove "${q.text}" from this show?`)) removeShowQuestion(update, show.id, q.id);
  }
}

function QuestionTags({ q, show, onRemove }: { q: Question; show: Show; onRemove: () => void }) {
  if (show.extra.some((x) => x.id === q.id)) {
    return (
      <span className="tag">
        this show only
        <button type="button" className="link" onClick={(e) => { e.preventDefault(); onRemove(); }} aria-label={`Remove ${q.text}`}>×</button>
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

function AddQuestion({ onAdd }: { onAdd: (text: string, kind: "text" | "check", everyShow: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"text" | "check">("text");
  const [everyShow, setEveryShow] = useState(true);

  if (!open) {
    return <button type="button" className="link add-q no-print" onClick={() => setOpen(true)}>+ Add question</button>;
  }
  return (
    <form
      className="add-q-form no-print"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text.trim().slice(0, 300), kind, everyShow);
        setText("");
        setOpen(false);
      }}
    >
      <input autoFocus required value={text} onChange={(e) => setText(e.target.value)} placeholder="New question" maxLength={300} aria-label="New question" />
      <select value={kind} onChange={(e) => setKind(e.target.value as "text" | "check")} aria-label="Type">
        <option value="text">Question</option>
        <option value="check">Checklist item</option>
      </select>
      <label className="check small">
        <input type="checkbox" checked={everyShow} onChange={(e) => setEveryShow(e.target.checked)} />
        <span>Add to every show</span>
      </label>
      <div className="row">
        <button type="submit">Add</button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
