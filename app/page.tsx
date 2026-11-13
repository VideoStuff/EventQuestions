import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>EventQuestions</h1>
      <p className="muted">
        Collect questions from your audience before an event, then review and export them.
      </p>
      <p>
        Attendees use the link you share for each event. Organizers manage events in the{" "}
        <Link href="/admin">organizer area</Link>.
      </p>
    </>
  );
}
