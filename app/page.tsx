import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createProject, listCategories, listProjects, listQuestionsForProject } from "@/lib/db";
import { hasAnswer } from "@/lib/types";

export const dynamic = "force-dynamic";

const f = (form: FormData, k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);

async function create(form: FormData) {
  "use server";
  await requireUser();
  const id = createProject({
    op_number: f(form, "op_number", 50),
    name: f(form, "name", 200),
    client: f(form, "client", 200),
    start_date: f(form, "start_date", 10),
    end_date: f(form, "end_date", 10),
  });
  redirect(`/shows/${id}`);
}

function dateRange(a: string, b: string) {
  if (!a) return "";
  return b && b !== a ? `${a} – ${b}` : a;
}

export default async function Home() {
  await requireUser();
  const shows = listProjects();
  listCategories(); // make sure the database is set up

  return (
    <div className="narrow">
      <h1>Shows</h1>

      <details className="card" open={shows.length === 0}>
        <summary><strong>New show</strong></summary>
        <form action={create} className="grid2" style={{ marginTop: 12 }}>
          <label>OP Number<input name="op_number" maxLength={50} /></label>
          <label>Show name<input name="name" maxLength={200} required /></label>
          <label>Client<input name="client" maxLength={200} /></label>
          <span />
          <label>Start date<input name="start_date" type="date" /></label>
          <label>End date<input name="end_date" type="date" /></label>
          <div><button type="submit">Create show</button></div>
        </form>
      </details>

      {shows.length === 0 && <p className="muted">No shows yet.</p>}
      {shows.map((p) => {
        const qs = listQuestionsForProject(p.id).filter((q) => !q.archived);
        const done = qs.filter((q) => hasAnswer(q, p.answers[q.id])).length;
        return (
          <Link href={`/shows/${p.id}`} className="card show-row" key={p.id}>
            <div className="spread">
              <strong>
                {p.op_number && <span className="op">{p.op_number}</span>} {p.name || "Untitled show"}
              </strong>
              <span className="muted small">{done}/{qs.length} filled</span>
            </div>
            <div className="muted small">
              {[p.client, dateRange(p.start_date, p.end_date), p.led_walls.length ? `${p.led_walls.length} LED wall${p.led_walls.length > 1 ? "s" : ""}` : ""]
                .filter(Boolean)
                .join(" · ")}
            </div>
            <div className="bar"><span style={{ width: `${qs.length ? (done / qs.length) * 100 : 0}%` }} /></div>
          </Link>
        );
      })}
    </div>
  );
}
