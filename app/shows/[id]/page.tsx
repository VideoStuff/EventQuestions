import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { deleteProject } from "@/lib/db";
import { loadShow } from "@/lib/show";
import ShowEditor from "@/components/ShowEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = loadShow(Number((await params).id));
  return { title: data ? `${data.show.op_number ? data.show.op_number + " · " : ""}${data.show.name || "Show"}` : "Show not found" };
}

async function remove(form: FormData) {
  "use server";
  await requireUser();
  const id = Number(form.get("id"));
  if (form.get("confirm") === "delete") {
    deleteProject(id);
    redirect("/");
  }
  redirect(`/shows/${id}`);
}

export default async function ShowPage({ params }: Props) {
  await requireUser();
  const data = loadShow(Number((await params).id));
  if (!data) notFound();
  const { show, categories, questions } = data;

  return (
    <>
      <p className="small no-print"><Link href="/">← All shows</Link></p>
      <ShowEditor
        showId={show.id}
        meta={{ op_number: show.op_number, name: show.name, client: show.client, start_date: show.start_date, end_date: show.end_date }}
        answers={show.answers}
        walls={show.led_walls}
        categories={categories}
        questions={questions}
      />
      <details className="card danger-zone no-print">
        <summary>Delete this show</summary>
        <form action={remove} className="row" style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={show.id} />
          <input name="confirm" placeholder='Type "delete"' autoComplete="off" style={{ flex: 1, minWidth: 160 }} />
          <button className="danger" type="submit">Delete show</button>
        </form>
      </details>
    </>
  );
}
