import { fmt, ftIn } from "../led";
import {
  PROJECTORS,
  SCREEN_SIZES,
  MIN_OVERLAP,
  calcScreen,
  newScreen,
  presetFor,
  sizeMeters,
  sizeText,
  type ProjScreen,
} from "../projection";

const GROUPS = [...new Set(SCREEN_SIZES.map((s) => s.group))];

export default function ProjectionScreens({ screens, onChange }: { screens: ProjScreen[]; onChange: (s: ProjScreen[]) => void }) {
  const update = (i: number, patch: Partial<ProjScreen>) => onChange(screens.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const total = screens.reduce((n, s) => {
    const c = calcScreen(s);
    return n + (c.ok ? c.qty : 0);
  }, 0);

  return (
    <div className="led">
      {screens.map((s, i) => (
        <ScreenCard
          key={s.id}
          screen={s}
          onChange={(p) => update(i, p)}
          onRemove={() => confirm(`Remove ${s.name || "this screen"}?`) && onChange(screens.filter((_, j) => j !== i))}
          onDuplicate={() => {
            const copy = { ...s, id: newScreen(0).id, name: `${s.name} copy` };
            onChange([...screens.slice(0, i + 1), copy, ...screens.slice(i + 1)]);
          }}
        />
      ))}
      <button type="button" className="secondary no-print" onClick={() => onChange([...screens, newScreen(screens.length + 1)])}>
        + Add projection screen
      </button>
      {total > 1 && (
        <div className="led-totals">
          <strong>All projection screens</strong>
          <span>{total} screens</span>
        </div>
      )}
    </div>
  );
}

function ScreenCard({
  screen: s,
  onChange,
  onRemove,
  onDuplicate,
}: {
  screen: ProjScreen;
  onChange: (p: Partial<ProjScreen>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const c = calcScreen(s);
  const preset = presetFor(s);

  return (
    <div className="wall">
      <div className="wall-head">
        <input className="wall-name" value={s.name} maxLength={100} onChange={(e) => onChange({ name: e.target.value })} aria-label="Screen name" />
        <label className="qty">
          Qty
          <input inputMode="numeric" value={s.qty} onChange={(e) => onChange({ qty: e.target.value })} />
        </label>
        <div className="row no-print">
          <button type="button" className="link" onClick={onDuplicate}>Duplicate</button>
          <button type="button" className="link danger-text" onClick={onRemove}>Remove</button>
        </div>
      </div>

      <div className="grid4 screen-inputs">
        <label className="span2">
          Screen size (height × width)
          <select
            value={preset}
            onChange={(e) => {
              const p = SCREEN_SIZES[+e.target.value];
              if (p) onChange({ heightFt: String(p.h), widthFt: String(p.w) });
            }}
          >
            {GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {SCREEN_SIZES.map((p, i) => (p.group === g ? <option key={i} value={i}>{p.label}</option> : null))}
              </optgroup>
            ))}
            <option value="custom">Custom size</option>
          </select>
        </label>
        <label>
          Height (ft)
          <input inputMode="decimal" value={s.heightFt} onChange={(e) => onChange({ heightFt: e.target.value })} />
        </label>
        <label>
          Width (ft)
          <input inputMode="decimal" value={s.widthFt} onChange={(e) => onChange({ widthFt: e.target.value })} />
        </label>
        <label className="span2">
          Projector resolution
          <select value={s.projector} onChange={(e) => onChange({ projector: e.target.value })}>
            {PROJECTORS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
      </div>

      {!c.ok ? (
        <p className="muted small">{c.error}</p>
      ) : (
        <>
          <dl className="wall-result">
            <div className="hero">
              <dt>Apparent width</dt>
              <dd>{fmt(c.apparentW)} px</dd>
              <dd className="muted small">{fmt(c.apparentW)} × {fmt(c.projH)} filling the height</dd>
            </div>
            <div className="hero">
              <dt>Screen (H × W)</dt>
              <dd>{sizeText(c)}</dd>
              <dd className="muted small">{sizeMeters(c)} · {c.aspect.toFixed(2)}:1</dd>
            </div>
            <div className="hero">
              <dt>Projector</dt>
              <dd>{fmt(c.projW)} × {fmt(c.projH)}</dd>
              <dd className="muted small">{c.pxPerFt.toFixed(1)} px per ft</dd>
            </div>
            <div className="hero">
              <dt>Projectors</dt>
              <dd>{c.projectors}{c.qty > 1 && <span className="muted small"> per screen · {c.projectors * c.qty} total</span>}</dd>
              {c.projectors === 1 && c.apparentW < c.projW && (
                <dd className="muted small">Uses {fmt(c.apparentW)} of {fmt(c.projW)} px wide</dd>
              )}
            </div>
            {c.projectors > 1 && (
              <div className="hero">
                <dt>Overlap{c.projectors > 2 ? ` (each of ${c.projectors - 1} blends)` : ""}</dt>
                <dd>{fmt(c.overlapPx)} px</dd>
                <dd className="muted small">{ftIn(c.overlapMm)} · {((c.overlapMm / 304.8)).toFixed(2)} ft · {Math.round((c.overlapPx / c.projW) * 100)}% of a projector</dd>
              </div>
            )}
            {c.qty > 1 && <div><dt>Quantity</dt><dd>{c.qty} screens</dd></div>}
          </dl>
          {c.projectors > 1 && (
            <p className="muted small">Estimate: the fewest projectors that leave at least {MIN_OVERLAP * 100}% overlap at each blend.</p>
          )}
        </>
      )}

      <label className="small">
        Screen notes
        <input value={s.notes} maxLength={2000} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Front / rear, surface, position, rigging…" />
      </label>
    </div>
  );
}
