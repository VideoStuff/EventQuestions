import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { aspect, calcWall, fmt, ftIn, meters, totals, PANEL_OPTIONS } from "@/lib/led";
import { loadShow } from "@/lib/show";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintShow({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const data = loadShow(Number((await params).id));
  if (!data) notFound();
  const { show, categories, questions } = data;
  const t = totals(show.led_walls);

  return (
    <div className="print">
      <div className="row no-print" style={{ marginBottom: 16 }}>
        <PrintButton />
        <a href={`/shows/${show.id}`}>Back to the sheet</a>
      </div>
      <h1>{show.op_number && `${show.op_number} · `}{show.name || "Untitled show"}</h1>
      <p className="muted">
        {[show.client, show.start_date && (show.end_date && show.end_date !== show.start_date ? `${show.start_date} – ${show.end_date}` : show.start_date)]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {categories.map((c) => {
        const qs = questions.filter((q) => q.category_id === c.id);
        if (!qs.length && !(c.special === "led" && show.led_walls.length)) return null;
        return (
          <section key={c.id} className="print-cat">
            <h2>{c.name}</h2>
            {c.special === "led" && show.led_walls.length > 0 && (
              <table className="walls">
                <thead>
                  <tr><th>Wall</th><th>Qty</th><th>Panel</th><th>Panels</th><th>Size</th><th>Resolution</th><th>Max W</th></tr>
                </thead>
                <tbody>
                  {show.led_walls.map((w) => {
                    const r = calcWall(w);
                    const panel = PANEL_OPTIONS.find((o) => o.value === w.panel)?.label;
                    return r.ok ? (
                      <tr key={w.id}>
                        <td>{w.name}{w.notes && <div className="muted small">{w.notes}</div>}</td>
                        <td>{r.qty}</td>
                        <td>{r.panelName}<div className="muted small">{r.pitchMm.toFixed(2)} mm</div></td>
                        <td>
                          {fmt(r.panelCount)} ({r.cols} × {r.rows})
                          {r.halfPanels > 0 && <div className="muted small">{r.fullPanels} full + {r.halfPanels} half</div>}
                        </td>
                        <td>{ftIn(r.widthMm)} × {ftIn(r.heightMm)}<div className="muted small">{meters(r.widthMm)} × {meters(r.heightMm)}</div></td>
                        <td>{r.resX} × {r.resY}<div className="muted small">{aspect(r.resX, r.resY)}</div></td>
                        <td>{r.watts != null ? fmt(r.watts) : "—"}</td>
                      </tr>
                    ) : (
                      <tr key={w.id}><td>{w.name}</td><td colSpan={6} className="muted">{panel}: {r.error}</td></tr>
                    );
                  })}
                </tbody>
                {t.walls > 1 && (
                  <tfoot>
                    <tr><td colSpan={7}><strong>Total:</strong> {t.walls} walls · {t.byPanel.map((p) => `${fmt(p.count)} × ${p.name}`).join(" · ")} · {fmt(t.watts)} W</td></tr>
                  </tfoot>
                )}
              </table>
            )}
            <dl>
              {qs.filter((q) => q.kind === "text").map((q) => (
                <div key={q.id} className="print-qa">
                  <dt>{q.text}</dt>
                  <dd>{show.answers[q.id]?.text?.trim() || <span className="muted">—</span>}</dd>
                </div>
              ))}
            </dl>
            <ul className="print-checks">
              {qs.filter((q) => q.kind === "check").map((q) => {
                const a = show.answers[q.id];
                return (
                  <li key={q.id}>
                    <span className="box">{a?.checked ? "☑" : "☐"}</span> {q.text}
                    {a?.note && <span className="muted"> — {a.note}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="muted small">Printed {new Date().toISOString().slice(0, 10)}</p>
    </div>
  );
}
