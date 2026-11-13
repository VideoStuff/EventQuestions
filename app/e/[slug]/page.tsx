import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { addQuestion, getEventBySlug } from "@/lib/db";
import { LIMITS, field, looksLikeEmail } from "@/lib/validate";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = getEventBySlug((await params).slug);
  return { title: event ? `Ask a question · ${event.title}` : "Event not found" };
}

async function submit(formData: FormData) {
  "use server";
  const slug = field(formData, "slug", 100);
  const event = getEventBySlug(slug);
  if (!event) notFound();
  if (!event.is_open) redirect(`/e/${slug}`);

  // Honeypot: real people leave this hidden field empty.
  if (field(formData, "website", 200)) redirect(`/e/${slug}?sent=1`);

  const body = field(formData, "body", LIMITS.body);
  const name = field(formData, "name", LIMITS.name);
  const email = field(formData, "email", LIMITS.email);

  if (!body) redirect(`/e/${slug}?error=empty`);
  if (email && !looksLikeEmail(email)) redirect(`/e/${slug}?error=email`);

  addQuestion({ event_id: event.id, name, email, body });
  redirect(`/e/${slug}?sent=1`);
}

const ERRORS: Record<string, string> = {
  empty: "Please write a question before sending.",
  email: "That email address doesn't look right.",
};

export default async function AskPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sent, error } = await searchParams;
  const event = getEventBySlug(slug);
  if (!event) notFound();

  return (
    <>
      <h1>{event.title}</h1>
      {event.event_date && <p className="muted">{event.event_date}</p>}
      {event.description && <p className="question-body">{event.description}</p>}

      {!event.is_open ? (
        <div className="card">Questions are closed for this event. Thanks for your interest!</div>
      ) : (
        <>
          {sent && (
            <div className="card notice">Thanks, your question was received. You can send another below.</div>
          )}
          {error && ERRORS[error] && <div className="card error">{ERRORS[error]}</div>}

          <form action={submit} className="stack card">
            <input type="hidden" name="slug" value={slug} />
            <label>
              Your question
              <textarea name="body" required maxLength={LIMITS.body} />
            </label>
            <label>
              <span>
                Name <span className="muted hint">(optional)</span>
              </span>
              <input name="name" maxLength={LIMITS.name} autoComplete="name" />
            </label>
            <label>
              <span>
                Email <span className="muted hint">(optional, only seen by the organizers)</span>
              </span>
              <input name="email" type="email" maxLength={LIMITS.email} autoComplete="email" />
            </label>
            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>
              <label>
                Leave this empty
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <div>
              <button type="submit">Send question</button>
            </div>
          </form>
        </>
      )}
    </>
  );
}
