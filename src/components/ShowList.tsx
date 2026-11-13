import { useRef, useState } from "react";
import { createShow, type Data, type Update } from "../store";
import { applyShowFile, downloadBackup, mergeBank, readFile } from "../files";
import { activeQuestions, hasAnswer } from "../types";
import { go } from "../router";
import { needsDownload } from "./ShowEditor";

const dateRange = (a: string, b: string) => (!a ? "" : b && b !== a ? `${a} – ${b}` : a);

export default function ShowList({ data, update }: { data: Data; update: Update }) {
  const [open, setOpen] = useState(data.shows.length === 0);
  const [message, setMessage] = useState<{ kind: "notice" | "error"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function openFiles(files: FileList | null) {
    if (!files?.length) return;
    let current = data;
    let lastShow = "";
    let lastKind = "";
    const done: string[] = [];
    try {
      for (const f of Array.from(files)) {
        const p = await readFile(f);
        lastKind = p.kind;
        if (p.kind === "questions") {
          current = { ...current, bank: mergeBank(current.bank, p.file.bank) };
          done.push(`question list from "${f.name}"`);
          continue;
        }
        const showFiles = p.kind === "show" ? [p.file] : p.file.shows ?? [];
        if (p.kind === "backup") current = { ...current, bank: mergeBank(current.bank, p.file.bank) };
        for (const sf of showFiles) {
          const existing = current.shows.find((s) => s.id === sf.show?.id);
          let asCopy = false;
          if (existing) {
            const label = existing.meta.name || existing.meta.op_number || "this show";
            asCopy = !confirm(
              `"${label}" is already in this browser.\n\nOK: replace it with the file's version (saved ${fmtDate(sf.show.updatedAt)}).\nCancel: keep both, adding the file as a copy.`
            );
          }
          const r = applyShowFile(current, sf, asCopy);
          current = r.data;
          lastShow = r.showId;
        }
        done.push(p.kind === "show" ? `"${f.name}"` : `${showFiles.length} show${showFiles.length === 1 ? "" : "s"} from "${f.name}"`);
      }
      update(() => current);
      setMessage({ kind: "notice", text: `Opened ${done.join(", ")}.` });
      if (files.length === 1 && lastKind === "show" && lastShow) go(`/show/${lastShow}`);
    } catch (e) {
      if (done.length) update(() => current);
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div
      className="narrow"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); void openFiles(e.dataTransfer.files); }}
    >
      <div className="spread">
        <h1>Shows</h1>
        <div className="row">
          <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>Open show file…</button>
          <input ref={fileInput} type="file" accept=".json,application/json" multiple hidden onChange={(e) => void openFiles(e.target.files)} />
        </div>
      </div>
      <p className="muted small">
        Shows are kept in this browser as you work. Use <strong>Download show file</strong> on a show to save it to your show
        folder, and <strong>Open show file</strong> (or drop files here) to bring it back on any computer.
      </p>

      {message && <div className={`card ${message.kind}`}>{message.text}</div>}

      <details className="card" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary><strong>New show</strong></summary>
        <form
          className="grid2"
          style={{ marginTop: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const v = (k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
            const id = createShow(update, {
              op_number: v("op_number", 50),
              name: v("name", 200),
              client: v("client", 200),
              start_date: v("start_date", 10),
              end_date: v("end_date", 10),
            });
            go(`/show/${id}`);
          }}
        >
          <label>OP Number<input name="op_number" maxLength={50} /></label>
          <label>Show name<input name="name" maxLength={200} required /></label>
          <label>Client<input name="client" maxLength={200} /></label>
          <span />
          <label>Start date<input name="start_date" type="date" /></label>
          <label>End date<input name="end_date" type="date" /></label>
          <div><button type="submit">Create show</button></div>
        </form>
      </details>

      {data.shows.length === 0 && <p className="muted">No shows in this browser yet.</p>}
      {[...data.shows]
        .sort((a, b) => (b.meta.start_date || "0").localeCompare(a.meta.start_date || "0") || b.updatedAt.localeCompare(a.updatedAt))
        .map((s) => {
          const qs = activeQuestions(s, data.bank);
          const done = qs.filter((q) => hasAnswer(q, s.answers[q.id])).length;
          return (
            <a href={`#/show/${s.id}`} className="card show-row" key={s.id}>
              <div className="spread">
                <strong>{s.meta.op_number && <span className="op">{s.meta.op_number}</span>} {s.meta.name || "Untitled show"}</strong>
                <span className="muted small">{done}/{qs.length} filled</span>
              </div>
              <div className="muted small">
                {[s.meta.client, dateRange(s.meta.start_date, s.meta.end_date), s.walls.length ? `${s.walls.length} LED wall${s.walls.length > 1 ? "s" : ""}` : ""]
                  .filter(Boolean)
                  .join(" · ")}
                {needsDownload(s) && <span className="badge warn"> not downloaded</span>}
              </div>
              <div className="bar"><span style={{ width: `${qs.length ? (done / qs.length) * 100 : 0}%` }} /></div>
            </a>
          );
        })}

      {data.shows.length > 0 && (
        <p className="small">
          <button type="button" className="link" onClick={() => downloadBackup(data)}>Download a backup of every show</button>
          <span className="muted"> (one file, opens with Open show file)</span>
        </p>
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return isNaN(+d) ? "unknown date" : d.toLocaleString();
}
