import {
  PANEL_OPTIONS,
  aspect,
  calcWall,
  fmt,
  ftDec,
  ftIn,
  lbs,
  meters,
  newWall,
  totals,
  type LedWall,
} from "../led";

export default function LedWalls({ walls, onChange }: { walls: LedWall[]; onChange: (w: LedWall[]) => void }) {
  const update = (i: number, patch: Partial<LedWall>) => onChange(walls.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  const t = totals(walls);

  return (
    <div className="led">
      {walls.map((w, i) => (
        <WallCard
          key={w.id}
          wall={w}
          onChange={(p) => update(i, p)}
          onRemove={() => confirm(`Remove ${w.name || "this wall"}?`) && onChange(walls.filter((_, j) => j !== i))}
          onDuplicate={() => {
            const copy = { ...w, id: newWall(0).id, name: `${w.name} copy` };
            onChange([...walls.slice(0, i + 1), copy, ...walls.slice(i + 1)]);
          }}
        />
      ))}

      <button type="button" className="secondary no-print" onClick={() => onChange([...walls, newWall(walls.length + 1)])}>
        + Add LED wall
      </button>

      {t.walls > 0 && (
        <div className="led-totals">
          <strong>All LED walls</strong>
          <span>{t.walls} wall{t.walls > 1 ? "s" : ""}</span>
          {t.byPanel.map((p) => (
            <span key={p.name}>{fmt(p.count)} × {p.name}</span>
          ))}
          <span>
            {fmt(t.watts)} W max{!t.wattsKnown && " (custom panels without wattage not included)"}
          </span>
        </div>
      )}
    </div>
  );
}

function WallCard({
  wall: w,
  onChange,
  onRemove,
  onDuplicate,
}: {
  wall: LedWall;
  onChange: (p: Partial<LedWall>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const r = calcWall(w);
  const field = (k: keyof LedWall, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label>
      {label}
      <input inputMode="decimal" value={w[k]} onChange={(e) => onChange({ [k]: e.target.value })} {...props} />
    </label>
  );

  return (
    <div className="wall">
      <div className="wall-head">
        <input className="wall-name" value={w.name} maxLength={100} onChange={(e) => onChange({ name: e.target.value })} aria-label="Wall name" />
        <label className="qty">
          Qty
          <input inputMode="numeric" value={w.qty} onChange={(e) => onChange({ qty: e.target.value })} />
        </label>
        <div className="row no-print">
          <button type="button" className="link" onClick={onDuplicate}>Duplicate</button>
          <button type="button" className="link danger-text" onClick={onRemove}>Remove</button>
        </div>
      </div>

      <div className="wall-inputs">
        <label>
          Panel
          <select value={w.panel} onChange={(e) => onChange({ panel: e.target.value as LedWall["panel"] })}>
            {PANEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        {w.panel === "custom" && (
          <div className="grid4">
            {field("customPitch", "Pixel pitch (mm)", { placeholder: "e.g. 3.9" })}
            {field("customW", "Panel width (mm)")}
            {field("customH", "Panel height (mm)")}
            {field("customWatts", "Max W / panel", { placeholder: "optional" })}
          </div>
        )}

        <div className="seg" role="group" aria-label="Size by">
          <button type="button" aria-pressed={w.mode === "dims"} onClick={() => onChange({ mode: "dims" })}>Width × height (ft)</button>
          <button type="button" aria-pressed={w.mode === "count"} onClick={() => onChange({ mode: "count" })}>Panel count</button>
        </div>

        {w.mode === "dims" ? (
          <div className="grid4">
            {field("widthFt", "Width (ft)")}
            {field("heightFt", "Height (ft)")}
          </div>
        ) : w.panel === "graphite" ? (
          <div className="grid4">
            {field("cols", "Panels wide", { inputMode: "numeric" })}
            {field("gpFull", "Rows of 500×1000", { inputMode: "numeric" })}
            {field("gpHalf", "Rows of 500×500 half", { inputMode: "numeric" })}
          </div>
        ) : (
          <div className="grid4">
            {field("cols", "Panels wide", { inputMode: "numeric" })}
            {field("rows", "Panels high", { inputMode: "numeric" })}
          </div>
        )}
      </div>

      {!r.ok ? (
        <p className="muted small">{r.error}</p>
      ) : (
        <>
          <dl className="wall-result">
            <div className="hero"><dt>Size</dt><dd>{ftIn(r.widthMm)} × {ftIn(r.heightMm)}</dd><dd className="muted small">{ftDec(r.widthMm)} × {ftDec(r.heightMm)} · {meters(r.widthMm)} × {meters(r.heightMm)}</dd></div>
            <div className="hero"><dt>Resolution</dt><dd>{fmt(r.resX)} × {fmt(r.resY)}</dd><dd className="muted small">{aspect(r.resX, r.resY)}</dd></div>
            <div className="hero">
              <dt>Panels</dt>
              <dd>{fmt(r.panelCount)}</dd>
              <dd className="muted small">
                {r.cols} wide × {w.panel === "graphite" ? `${r.fullPanels / r.cols} full${r.halfPanels ? ` + ${r.halfPanels / r.cols} half` : ""} rows` : `${r.rows} high`}
              </dd>
            </div>
            <div><dt>Pixel pitch</dt><dd>{r.pitchMm.toFixed(2)} mm · {r.panelPx} px per panel</dd></div>
            {w.panel === "graphite" && (
              <div><dt>Graphite panels</dt><dd>{fmt(r.fullPanels)} full (500×1000){r.halfPanels ? `, ${fmt(r.halfPanels)} half (500×500)` : ""}</dd></div>
            )}
            <div><dt>Max power</dt><dd>{r.watts != null ? `${fmt(r.watts)} W` : "—"}</dd></div>
            {r.weightKg != null && <div><dt>Panel weight</dt><dd>{lbs(r.weightKg)} <span className="muted small">(panels only)</span></dd></div>}
            {r.qty > 1 && <div><dt>× {r.qty} walls</dt><dd>{fmt(r.panelCount * r.qty)} panels{r.watts != null ? ` · ${fmt(r.watts * r.qty)} W` : ""}</dd></div>}
          </dl>
          {r.requested && <Fit r={r} />}
        </>
      )}

      <label className="small">
        Wall notes
        <input value={w.notes} maxLength={2000} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Ground / flown, position, content…" />
      </label>
    </div>
  );
}

function Fit({ r }: { r: Extract<ReturnType<typeof calcWall>, { ok: true }> }) {
  const req = r.requested!;
  const dw = r.widthMm / 304.8 - req.widthFt;
  const dh = r.heightMm / 304.8 - req.heightFt;
  if (Math.abs(dw) < 0.01 && Math.abs(dh) < 0.01) return null;
  const d = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)} ft`;
  return (
    <p className="muted small">
      Nearest whole panels to {req.widthFt} × {req.heightFt} ft ({d(dw)} wide, {d(dh)} high).
    </p>
  );
}
