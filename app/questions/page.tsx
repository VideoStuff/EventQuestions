import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  addCategory,
  addQuestion,
  deleteCategory,
  listBankQuestions,
  listCategories,
  moveCategory,
  moveQuestion,
  renameCategory,
  setQuestionArchived,
  updateQuestion,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const f = (form: FormData, k: string, max = 300) => String(form.get(k) ?? "").trim().slice(0, max);
const n = (form: FormData, k: string) => Number(form.get(k));
const kind = (form: FormData) => (form.get("kind") === "check" ? "check" : "text") as "check" | "text";
const back = (anchor?: string) => redirect(`/questions${anchor ? `#${anchor}` : ""}`);

async function act(form: FormData) {
  "use server";
  await requireUser();
  const op = f(form, "op");
  const id = n(form, "id");
  const cat = n(form, "category_id");
  switch (op) {
    case "add-q": {
      const text = f(form, "text");
      if (text) addQuestion({ category_id: cat, text, kind: kind(form), project_id: null });
      return back(`cat-${cat}`);
    }
    case "edit-q": {
      const text = f(form, "text");
      if (text) updateQuestion(id, { text, kind: kind(form), category_id: cat });
      return back(`cat-${cat}`);
    }
    case "up-q":
    case "down-q":
      moveQuestion(id, op === "up-q" ? "up" : "down");
      return back(`cat-${cat}`);
    case "archive-q":
    case "restore-q":
      setQuestionArchived(id, op === "archive-q");
      return back(`cat-${cat}`);
    case "add-cat": {
      const name = f(form, "name", 100);
      return back(name ? `cat-${addCategory(name)}` : undefined);
    }
    case "rename-cat": {
      const name = f(form, "name", 100);
      if (name) renameCategory(id, name);
      return back(`cat-${id}`);
    }
    case "up-cat":
    case "down-cat":
      moveCategory(id, op === "up-cat" ? "up" : "down");
      return back(`cat-${id}`);
    case "delete-cat":
      if (!deleteCategory(id)) redirect(`/questions?error=notempty#cat-${id}`);
      return back();
  }
  back();
}

function Op({ op, children, className = "secondary", ...hidden }: { op: string; children: React.ReactNode; className?: string } & Record<string, string | number>) {
  return (
    <form action={act}>
      <input type="hidden" name="op" value={op} />
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button className={`${className} small-btn`} type="submit">{children}</button>
    </form>
  );
}

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser();
  const { error } = await searchParams;
  const cats = listCategories();
  const qs = listBankQuestions();

  return (
    <div className="narrow">
      <h1>Questions</h1>
      <p className="muted">
        These questions and checklist items appear on every show sheet. Changes apply to all shows, including
        existing ones; answers you already wrote are kept. Archived items are hidden from shows where they
        weren&apos;t answered.
      </p>
      {error === "notempty" && (
        <div className="card error">A category can only be deleted once it has no questions. Move its questions to another category first (archived ones included).</div>
      )}

      {cats.map((c, ci) => {
        const list = qs.filter((q) => q.category_id === c.id);
        return (
          <section className="card" id={`cat-${c.id}`} key={c.id}>
            <div className="spread">
              <form action={act} className="row" style={{ flex: 1 }}>
                <input type="hidden" name="op" value="rename-cat" />
                <input type="hidden" name="id" value={c.id} />
                <input name="name" defaultValue={c.name} maxLength={100} className="cat-name" aria-label="Category name" />
                <button className="secondary small-btn" type="submit">Rename</button>
              </form>
              <div className="row">
                {ci > 0 && <Op op="up-cat" id={c.id}>↑</Op>}
                {ci < cats.length - 1 && <Op op="down-cat" id={c.id}>↓</Op>}
                {list.length === 0 && <Op op="delete-cat" id={c.id} className="danger">Delete</Op>}
              </div>
            </div>
            {c.special === "led" && <p className="muted small">This category also shows the LED wall planner.</p>}

            <ul className="qlist">
              {list.map((q, qi) => (
                <li key={q.id} className={q.archived ? "archived" : ""}>
                  <form action={act} className="qedit">
                    <input type="hidden" name="op" value="edit-q" />
                    <input type="hidden" name="id" value={q.id} />
                    <input name="text" defaultValue={q.text} maxLength={300} aria-label="Question" />
                    <select name="kind" defaultValue={q.kind} aria-label="Type">
                      <option value="text">Question</option>
                      <option value="check">Checklist</option>
                    </select>
                    <select name="category_id" defaultValue={c.id} aria-label="Category">
                      {cats.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <button className="secondary small-btn" type="submit">Save</button>
                  </form>
                  <div className="row">
                    {qi > 0 && <Op op="up-q" id={q.id} category_id={c.id}>↑</Op>}
                    {qi < list.length - 1 && <Op op="down-q" id={q.id} category_id={c.id}>↓</Op>}
                    {q.archived
                      ? <Op op="restore-q" id={q.id} category_id={c.id}>Restore</Op>
                      : <Op op="archive-q" id={q.id} category_id={c.id}>Archive</Op>}
                  </div>
                </li>
              ))}
            </ul>

            <form action={act} className="qedit add">
              <input type="hidden" name="op" value="add-q" />
              <input type="hidden" name="category_id" value={c.id} />
              <input name="text" placeholder="New question or checklist item" maxLength={300} required aria-label="New question" />
              <select name="kind" aria-label="Type">
                <option value="text">Question</option>
                <option value="check">Checklist</option>
              </select>
              <button className="small-btn" type="submit">Add</button>
            </form>
          </section>
        );
      })}

      <form action={act} className="card row">
        <input type="hidden" name="op" value="add-cat" />
        <input name="name" placeholder="New category name" maxLength={100} required style={{ flex: 1, minWidth: 200 }} />
        <button type="submit">Add category</button>
      </form>
    </div>
  );
}
