import { useRef, useState } from "react";
import {
  addCategory,
  addQuestion,
  canDeleteCategory,
  deleteCategory,
  editQuestion,
  moveCategory,
  moveQuestion,
  renameCategory,
  type Data,
  type Update,
} from "../store";
import { downloadQuestions, mergeBank, readFile } from "../files";
import type { QuestionKind } from "../types";

export default function QuestionsPage({ data, update }: { data: Data; update: Update }) {
  const { categories, questions } = data.bank;
  const [msg, setMsg] = useState<{ kind: "notice" | "error"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="narrow">
      <div className="spread">
        <h1>Questions</h1>
        <div className="row">
          <button type="button" className="secondary" onClick={() => downloadQuestions(data.bank)}>Download list</button>
          <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>Load list…</button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const p = await readFile(f);
                const bank = p.kind === "show" ? { categories: p.file.categories, questions: p.file.questions.filter((q) => !q.showOnly) } : p.file.bank;
                update((d) => ({ ...d, bank: mergeBank(d.bank, bank) }));
                setMsg({ kind: "notice", text: `Added the questions from "${f.name}". Nothing was removed.` });
              } catch (err) {
                setMsg({ kind: "error", text: (err as Error).message });
              }
            }}
          />
        </div>
      </div>
      <p className="muted">
        This is the list every show sheet uses, kept in this browser. Changes apply to all shows; answers you already wrote
        are kept. Archived items are hidden from shows where they weren&apos;t answered. Use <strong>Download list</strong> to
        move your questions to another computer, and <strong>Load list</strong> there (it adds and updates, never removes).
      </p>
      {msg && <div className={`card ${msg.kind}`}>{msg.text}</div>}

      {categories.map((c, ci) => {
        const list = questions.filter((q) => q.categoryId === c.id);
        return (
          <section className="card" id={`cat-${c.id}`} key={c.id}>
            <div className="spread">
              <input
                key={c.name}
                className="cat-name"
                defaultValue={c.name}
                maxLength={100}
                aria-label="Category name"
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.name) renameCategory(update, c.id, v); else e.target.value = c.name; }}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              <div className="row">
                <button type="button" className="secondary small-btn" disabled={ci === 0} onClick={() => moveCategory(update, c.id, -1)} aria-label="Move category up">↑</button>
                <button type="button" className="secondary small-btn" disabled={ci === categories.length - 1} onClick={() => moveCategory(update, c.id, 1)} aria-label="Move category down">↓</button>
                {canDeleteCategory(data, c.id) && (
                  <button type="button" className="danger small-btn" onClick={() => deleteCategory(update, c.id)}>Delete</button>
                )}
              </div>
            </div>
            {c.special === "led" && <p className="muted small">This category also has the LED wall planner.</p>}

            <ul className="qlist">
              {list.map((q, qi) => (
                <li key={q.id} className={q.archived ? "archived" : ""}>
                  <div className="qedit">
                    <input
                      key={q.text}
                      defaultValue={q.text}
                      maxLength={300}
                      aria-label="Question"
                      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== q.text) editQuestion(update, q.id, { text: v }); else e.target.value = q.text; }}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    />
                    <select value={q.kind} aria-label="Type" onChange={(e) => editQuestion(update, q.id, { kind: e.target.value as QuestionKind })}>
                      <option value="text">Question</option>
                      <option value="check">Checklist</option>
                    </select>
                    <select value={c.id} aria-label="Category" onChange={(e) => editQuestion(update, q.id, { categoryId: e.target.value })}>
                      {categories.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div className="row">
                    <button type="button" className="secondary small-btn" disabled={qi === 0} onClick={() => moveQuestion(update, q.id, -1)} aria-label="Move up">↑</button>
                    <button type="button" className="secondary small-btn" disabled={qi === list.length - 1} onClick={() => moveQuestion(update, q.id, 1)} aria-label="Move down">↓</button>
                    <button type="button" className="secondary small-btn" onClick={() => editQuestion(update, q.id, { archived: !q.archived })}>
                      {q.archived ? "Restore" : "Archive"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <form
              className="qedit add"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const text = String(f.get("text") ?? "").trim().slice(0, 300);
                if (!text) return;
                addQuestion(update, { categoryId: c.id, text, kind: f.get("kind") === "check" ? "check" : "text" });
                e.currentTarget.reset();
              }}
            >
              <input name="text" placeholder="New question or checklist item" maxLength={300} required aria-label={`New question in ${c.name}`} />
              <select name="kind" aria-label="Type">
                <option value="text">Question</option>
                <option value="check">Checklist</option>
              </select>
              <button className="small-btn" type="submit">Add</button>
            </form>
          </section>
        );
      })}

      <form
        className="card row"
        onSubmit={(e) => {
          e.preventDefault();
          const name = String(new FormData(e.currentTarget).get("name") ?? "").trim().slice(0, 100);
          if (name) addCategory(update, name);
          e.currentTarget.reset();
        }}
      >
        <input name="name" placeholder="New category name" maxLength={100} required style={{ flex: 1, minWidth: 200 }} aria-label="New category name" />
        <button type="submit">Add category</button>
      </form>
    </div>
  );
}
