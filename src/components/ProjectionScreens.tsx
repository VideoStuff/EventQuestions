import { fmt, ftIn } from "../led";
import {
  PROJECTORS,
  SCREEN_SIZES,
  MIN_OVERLAP,
  PROJECTOR_MODELS,
  TARGET_FTL,
  brightness,
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
  let total = 0;
  const byModel = new Map<string, number>();
  for (const s of screens) {
    const c = calcScreen(s);
    if (!c.ok) continue;
    total += c.qty;
    const b = brightness(s, c);
    if (b) {
      const label = `${b.modelName} (${fmt(b.lumens)} lm)`;
      byModel.set(label, (byModel.get(label) ?? 0) + b.total * c.qty);
    }
  }

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
      {(total > 1 || byModel.size > 0) && (
        <div className="led-totals">
          <strong>All projection screens</strong>
          <span>{total} screen{total === 1 ? "" : "s"}</span>
          {[...byModel].map(([m, n]) => <span key={m}>{n} × {m}</span>)}
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
          <ProjectorBlock s={s} c={c} onChange={onChange} />
        </>
      )}

      <label className="small">
        Screen notes
        <input value={s.notes} maxLength={2000} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Front / rear, surface, position, rigging…" />
      </label>
    </div>
  );
}

function ProjectorBlock({ s, c, onChange }: { s: ProjScreen; c: Extract<ReturnType<typeof calcScreen>, { ok: true }>; onChange: (p: Partial<ProjScreen>) => void }) {
  if (!s.pjModel) {
    return (
      <button
        type="button"
        className="secondary no-print add-pj"
        onClick={() => onChange({ pjModel: PROJECTOR_MODELS[1].key, pjLumens: String(PROJECTOR_MODELS[1].lumens) })}
      >
        + Add projector
      </button>
    );
  }
  const b = brightness(s, c);
  return (
    <div className="pj">
      <div className="spread">
        <strong>Projector</strong>
        <button type="button" className="link danger-text no-print" onClick={() => onChange({ pjModel: "", pjLumens: "" })}>Remove projector</button>
      </div>
      <div className="grid4">
        <label className="span2">
          Model
          <select
            value={s.pjModel}
            onChange={(e) => {
              const m = PROJECTOR_MODELS.find((x) => x.key === e.target.value);
              onChange(m ? { pjModel: m.key, pjLumens: String(m.lumens) } : { pjModel: "custom" });
            }}
          >
            {["Panasonic", "Barco"].map((brand) => (
              <optgroup key={brand} label={brand}>
                {PROJECTOR_MODELS.filter((m) => m.brand === brand).map((m) => (
                  <option key={m.key} value={m.key}>{m.name} · {fmt(m.lumens)} lm</option>
                ))}
              </optgroup>
            ))}
            <option value="custom">Custom lumens</option>
          </select>
        </label>
        <label>
          Lumens
          <input
            inputMode="numeric"
            value={s.pjLumens}
            onChange={(e) => {
              const m = PROJECTOR_MODELS.find((x) => x.key === s.pjModel);
              onChange({ pjLumens: e.target.value, ...(m && e.target.value !== String(m.lumens) ? { pjModel: "custom" } : {}) });
            }}
          />
        </label>
        <label>
          Screen gain
          <input inputMode="decimal" value={s.gain} onChange={(e) => onChange({ gain: e.target.value })} />
        </label>
        <label className="span2">
          Stacking
          <select value={s.stack} onChange={(e) => onChange({ stack: e.target.value })}>
            <option value="1">Single</option>
            <option value="2">Double stacked</option>
          </select>
        </label>
      </div>
      {!b ? (
        <p className="muted small">Enter the projector&apos;s lumens.</p>
      ) : (
        <>
          <dl className="wall-result">
            <div className="hero">
              <dt>Brightness</dt>
              <dd className={`ftl ${b.rating}`}>{b.ftl.toFixed(1)} fL</dd>
              <dd className="muted small">{fmt(Math.round(b.nits))} nits · {b.rating === "good" ? "meets" : "below"} {TARGET_FTL} fL</dd>
            </div>
            <div className="hero">
              <dt>Recommended</dt>
              <dd>{fmt(b.recommendedLumens)} lm</dd>
              <dd className="muted small">per projector{b.stack > 1 ? " (stacked pair)" : ""} for {TARGET_FTL} fL</dd>
            </div>
            <div className="hero">
              <dt>Projectors</dt>
              <dd>{b.total}{c.qty > 1 && <span className="muted small"> per screen · {b.total * c.qty} total</span>}</dd>
              <dd className="muted small">{c.projectors} across{b.stack > 1 ? " × 2 stacked" : ""} · {fmt(b.lumens)} lm each</dd>
            </div>
          </dl>
          <div className="meter" aria-hidden="true"><i className={b.rating} style={{ width: `${Math.min(b.ftl / 80, 1) * 100}%` }} /></div>
          <p className="muted small">
            fL = lumens × gain ÷ {c.projectors > 1 ? "the area one projector lights" : "screen area"} ({b.areaSqFt.toFixed(1)} sq ft), as in AV Calcs.
            Uses rated lumens; real output is lower with lamp or laser age and lens choice.
          </p>
        </>
      )}
    </div>
  );
}
