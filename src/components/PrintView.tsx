import { aspect, calcWall, fmt, ftIn, meters, totals, PANEL_OPTIONS } from "../led";
import { APP_VERSION } from "../version";
import { GROUPS, groupOf, questionsFor, type Bank, type Show } from "../types";
import { brightness, calcScreen, sizeMeters, sizeText } from "../projection";

export default function PrintView({ show, bank }: { show: Show; bank: Bank }) {
  const questions = questionsFor(show, bank);
  const t = totals(show.walls);
  const m = show.meta;

  return (
    <div className="print">
      <div className="row no-print" style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => window.print()}>Print / Save as PDF</button>
        <a href={`#/show/${show.id}`}>Back to the sheet</a>
      </div>
      <h1>{m.op_number && `${m.op_number} · `}{m.name || "Untitled show"}</h1>
      <p className="muted">
        {[m.client, m.start_date && (m.end_date && m.end_date !== m.start_date ? `${m.start_date} – ${m.end_date}` : m.start_date)].filter(Boolean).join(" · ")}
      </p>

      {GROUPS.map((g) => (
        <div key={g.id} className="print-group">
          <h2 className="print-group-title">{g.name}</h2>
      {bank.categories.filter((c) => groupOf(c) === g.id).map((c) => {
        const qs = questions.filter((q) => q.categoryId === c.id);
        const hasWalls = c.special === "led" && show.walls.length > 0;
        const hasScreens = c.special === "projection" && show.screens.length > 0;
        if (!qs.length && !hasWalls && !hasScreens) return null;
        return (
          <section key={c.id} className="print-cat">
            <h3>{c.name}</h3>
            {hasWalls && (
              <table className="walls">
                <thead>
                  <tr><th>Wall</th><th>Qty</th><th>Panel</th><th>Panels</th><th>Size</th><th>Resolution</th><th>Max W</th></tr>
                </thead>
                <tbody>
                  {show.walls.map((w) => {
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
            {hasScreens && (
              <table className="walls">
                <thead>
                  <tr><th>Screen</th><th>Qty</th><th>Size (H × W)</th><th>Projector</th><th>Apparent resolution</th><th>Projectors</th><th>Overlap</th><th>Brightness</th></tr>
                </thead>
                <tbody>
                  {show.screens.map((s) => {
                    const r = calcScreen(s);
                    return r.ok ? (
                      <tr key={s.id}>
                        <td>{s.name}{s.notes && <div className="muted small">{s.notes}</div>}</td>
                        <td>{r.qty}</td>
                        <td>{sizeText(r)}<div className="muted small">{sizeMeters(r)} · {r.aspect.toFixed(2)}:1</div></td>
                        <td>{r.projW} × {r.projH}</td>
                        <td>
{fmt(r.apparentW)} × {fmt(r.projH)}</td>
                        <td>{r.projectors}{s.stack === "2" && s.pjModel ? " × 2 stacked" : ""}</td>
                        <td>{r.projectors > 1 ? <>{fmt(r.overlapPx)} px<div className="muted small">{ftIn(r.overlapMm)}</div></> : "—"}</td>
                        <td>{(() => {
                          const b = brightness(s, r);
                          return b ? <>{b.ftl.toFixed(1)} fL{b.stack > 1 && <> per projector<div className="small">{b.ftlCombined.toFixed(1)} fL stacked</div></>}<div className="muted small">{b.total} × {b.modelName}, {fmt(b.lumens)} lm, gain {b.gain}</div></> : "—";
                        })()}</td>
                      </tr>
                    ) : (
                      <tr key={s.id}><td>{s.name}</td><td colSpan={7} className="muted">{r.error}</td></tr>
                    );
                  })}
                </tbody>
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
        </div>
      ))}
      <p className="muted small">Printed {new Date().toISOString().slice(0, 10)} · Show Sheets v{APP_VERSION}</p>
    </div>
  );
}
