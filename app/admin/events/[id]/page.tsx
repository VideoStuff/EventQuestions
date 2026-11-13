import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  STATUSES,
  type QuestionStatus,
  deleteEvent,
  getEventById,
  listQuestions,
  setEventOpen,
  setQuestionStatus,
} from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

function parseStatus(s: unknown): QuestionStatus | undefined {
  return STATUSES.includes(s as QuestionStatus) ? (s as QuestionStatus) : undefined;
}

async function updateQuestion(formData: FormData) {
  "use server";
  await requireAdmin();
  const eventId = Number(formData.get("event_id"));
  const id = Number(formData.get("id"));
  const status = parseStatus(formData.get("status"));
  const back = String(formData.get("back") ?? "");
  if (status) setQuestionStatus(id, eventId, status);
  redirect(`/admin/events/${eventId}${back ? `?status=${back}` : ""}`);
}

async function toggleOpen(formData: FormData) {
  "use server";
  await requireAdmin();
  const eventId = Number(formData.get("event_id"));
  setEventOpen(eventId, formData.get("open") === "1");
  redirect(`/admin/events/${eventId}`);
}

async function remove(formData: FormData) {
  "use server";
  await requireAdmin();
  if (formData.get("confirm") !== "delete") redirect(`/admin/events/${Number(formData.get("event_id"))}`);
  deleteEvent(Number(formData.get("event_id")));
  redirect("/admin");
}

export default async function EventAdmin({ params, searchParams }: Props) {
  await requireAdmin();
  const id = Number((await params).id);
  const event = Number.isInteger(id) ? getEventById(id) : undefined;
  if (!event) notFound();

  const filter = parseStatus((await searchParams).status);
  const all = listQuestions(event.id);
  const shown = filter ? all.filter((q) => q.status === filter) : all;
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((q) => q.status === s).length]));

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const shareUrl = `${proto}://${h.get("host")}/e/${event.slug}`;
  const exportBase = `/admin/events/${event.id}/export`;

  return (
    <>
      <p className="small">
        <Link href="/admin">← All events</Link>
      </p>
      <div className="spread">
        <h1>{event.title}</h1>
        <span className="badge">{event.is_open ? "Accepting questions" : "Closed"}</span>
      </div>
      {event.event_date && <p className="muted">{event.event_date}</p>}

      <div className="card">
        <div className="small muted">Share this link with attendees</div>
        <p>
          <a href={`/e/${event.slug}`} target="_blank">
            <code>{shareUrl}</code>
          </a>
        </p>
        <div className="row">
          <form action={toggleOpen}>
            <input type="hidden" name="event_id" value={event.id} />
            <input type="hidden" name="open" value={event.is_open ? "0" : "1"} />
            <button className="secondary" type="submit">
              {event.is_open ? "Close questions" : "Reopen questions"}
            </button>
          </form>
          <a className="button secondary" href={`${exportBase}${filter ? `?status=${filter}` : ""}`}>
            Export {filter ?? "all"} as CSV
          </a>
        </div>
      </div>

      <h2>Questions ({all.length})</h2>
      <nav className="tabs">
        <Link href={`/admin/events/${event.id}`} className={!filter ? "active" : ""}>
          All {all.length}
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/events/${event.id}?status=${s}`} className={filter === s ? "active" : ""}>
            {s[0].toUpperCase() + s.slice(1)} {counts[s]}
          </Link>
        ))}
      </nav>

      {shown.length === 0 && <p className="muted">No questions here yet.</p>}
      {shown.map((q) => (
        <div className="card" key={q.id}>
          <div className="spread small">
            <span className="muted">
              {q.name || "Anonymous"}
              {q.email && <> · {q.email}</>} · {q.created_at} UTC
            </span>
            <span className={`badge ${q.status}`}>{q.status}</span>
          </div>
          <p className="question-body">{q.body}</p>
          <div className="row">
            {STATUSES.filter((s) => s !== q.status).map((s) => (
              <form action={updateQuestion} key={s}>
                <input type="hidden" name="event_id" value={event.id} />
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="status" value={s} />
                <input type="hidden" name="back" value={filter ?? ""} />
                <button className="secondary" type="submit">
                  {s === "new" ? "Mark new" : s === "approved" ? "Approve" : "Dismiss"}
                </button>
              </form>
            ))}
          </div>
        </div>
      ))}

      <h2>Danger zone</h2>
      <form action={remove} className="card row">
        <input type="hidden" name="event_id" value={event.id} />
        <label style={{ flex: 1, minWidth: 200 }}>
          <span className="small muted">Type “delete” to remove this event and all its questions</span>
          <input name="confirm" autoComplete="off" />
        </label>
        <button className="danger" type="submit">Delete event</button>
      </form>
    </>
  );
}
