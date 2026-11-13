import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, signOut } from "@/lib/auth";
import { createEvent, getEventBySlug, listEvents } from "@/lib/db";
import { LIMITS, field, slugify } from "@/lib/validate";

export const dynamic = "force-dynamic";

async function create(formData: FormData) {
  "use server";
  await requireAdmin();
  const title = field(formData, "title", LIMITS.title);
  if (!title) redirect("/admin?error=title");
  const description = field(formData, "description", LIMITS.description);
  const event_date = field(formData, "event_date", 20) || null;

  const base = slugify(field(formData, "slug", 60) || title) || "event";
  let slug = base;
  for (let i = 2; getEventBySlug(slug); i++) slug = `${base}-${i}`;

  const id = createEvent({ slug, title, description, event_date });
  redirect(`/admin/events/${id}`);
}

async function logout() {
  "use server";
  await signOut();
  redirect("/admin/login");
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  const events = listEvents();

  return (
    <>
      <div className="spread">
        <h1>Your events</h1>
        <form action={logout}>
          <button className="secondary" type="submit">Sign out</button>
        </form>
      </div>

      {events.length === 0 && <p className="muted">No events yet. Create one below.</p>}
      {events.map((e) => (
        <div className="card" key={e.id}>
          <div className="spread">
            <Link href={`/admin/events/${e.id}`}>
              <strong>{e.title}</strong>
            </Link>
            <span className="badge">{e.is_open ? "Open" : "Closed"}</span>
          </div>
          <div className="muted small">
            {e.event_date && <>{e.event_date} · </>}
            {e.question_count} question{e.question_count === 1 ? "" : "s"}
            {e.new_count > 0 && <> · {e.new_count} new</>}
          </div>
        </div>
      ))}

      <h2>New event</h2>
      {error === "title" && <div className="card error">Give the event a title.</div>}
      <form action={create} className="stack card">
        <label>
          Title
          <input name="title" required maxLength={LIMITS.title} />
        </label>
        <label>
          <span>
            Date <span className="muted hint">(optional)</span>
          </span>
          <input name="event_date" type="date" />
        </label>
        <label>
          <span>
            Description <span className="muted hint">(optional, shown to attendees)</span>
          </span>
          <textarea name="description" maxLength={LIMITS.description} />
        </label>
        <label>
          <span>
            Link name <span className="muted hint">(optional, made from the title if empty)</span>
          </span>
          <input name="slug" maxLength={60} placeholder="spring-town-hall" />
        </label>
        <div>
          <button type="submit">Create event</button>
        </div>
      </form>
    </>
  );
}
