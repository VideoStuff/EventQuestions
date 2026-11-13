import { fmt } from "../led";
import {
  PROJECTORS,
  SCREEN_SIZES,
  calcScreen,
  fitToWidth,
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
            {c.qty > 1 && <div><dt>Quantity</dt><dd>{c.qty} screens</dd></div>}
          </dl>
          <FitNote c={c} />
        </>
      )}

      <label className="small">
        Screen notes
        <input value={s.notes} maxLength={2000} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Front / rear, surface, position, rigging…" />
      </label>
    </div>
  );
}

function FitNote({ c }: { c: Extract<ReturnType<typeof calcScreen>, { ok: true }> }) {
  if (c.apparentW === c.projW) return <p className="muted small">Fills one projector exactly.</p>;
  if (c.apparentW < c.projW) {
    return <p className="muted small">One projector: uses {fmt(c.apparentW)} of its {fmt(c.projW)} px width (sides unused).</p>;
  }
  const f = fitToWidth(c);
  return (
    <p className="small fit-warn">
      Wider than one projector ({fmt(c.projW)} px). Filling the height needs about {c.across} projectors blended
      side by side (before overlap). One projector fitted to the width gives {fmt(f.w)} × {fmt(f.h)} with the top and
      bottom unused.
    </p>
  );
}
