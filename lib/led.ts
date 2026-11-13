// LED wall math. Shared by the browser (live results) and the server (print view).
// Panel specs match VideoStuff/led-wall-calc and PixelPlanner (ROE Visual P2.6, max power).

export type PanelType = "diamond" | "graphite" | "custom";
export type SizeMode = "dims" | "count";

/** One LED wall as typed into the form. Inputs are kept as strings so fields can be empty. */
export interface LedWall {
  id: string;
  name: string;
  qty: string;
  panel: PanelType;
  mode: SizeMode;
  widthFt: string;
  heightFt: string;
  cols: string;
  rows: string;
  gpFull: string;
  gpHalf: string;
  customW: string; // panel width, mm
  customH: string; // panel height, mm
  customPitch: string; // mm
  customWatts: string; // optional, max W per panel
  notes: string;
}

export const PANEL_OPTIONS: { value: PanelType; label: string }[] = [
  { value: "diamond", label: "ROE Diamond 2.6 (500 × 500 mm)" },
  { value: "graphite", label: "ROE Graphite 2.6 (500 × 1000 mm)" },
  { value: "custom", label: "Custom panel (set pixel pitch)" },
];

export const PANELS = {
  diamond: { name: "ROE Diamond 2.6", wMm: 500, hMm: 500, px: 192, py: 192, watts: 180, kg: 5.76 },
  graphite: { name: "ROE Graphite 2.6", wMm: 500, hMm: 1000, px: 192, py: 384, watts: 320, kg: 9 },
  graphiteHalf: { name: "ROE Graphite 2.6 half", wMm: 500, hMm: 500, px: 192, py: 192, watts: 160, kg: 5.2 },
} as const;

const MM_PER_FT = 304.8;
const MAX_PANELS_PER_SIDE = 1000;

export function newWall(n: number): LedWall {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name: `LED Wall ${n}`,
    qty: "1",
    panel: "diamond",
    mode: "dims",
    widthFt: "",
    heightFt: "",
    cols: "",
    rows: "",
    gpFull: "",
    gpHalf: "0",
    customW: "500",
    customH: "500",
    customPitch: "",
    customWatts: "",
    notes: "",
  };
}

export interface WallResult {
  ok: true;
  panelName: string;
  cols: number;
  rows: number; // rows of panels (Graphite: full + half rows)
  fullPanels: number; // Graphite 500x1000 panels; for other types, all panels
  halfPanels: number; // Graphite 500x500 panels
  panelCount: number;
  panelPx: string; // e.g. "192 × 192"
  widthMm: number;
  heightMm: number;
  resX: number;
  resY: number;
  pitchMm: number;
  watts: number | null;
  weightKg: number | null;
  qty: number;
  requested: { widthFt: number; heightFt: number } | null;
}
export type WallCalc = WallResult | { ok: false; error: string };

const num = (s: string) => {
  const v = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(v) ? v : NaN;
};
const whole = (s: string) => {
  const v = num(s);
  return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
};

export function calcWall(w: LedWall): WallCalc {
  const qty = Math.max(1, whole(w.qty) || 1);

  // Size of one "grid unit". Graphite is laid out in 500 mm rows: two make a full panel.
  let unitW: number, unitH: number, px: number, py: number, pitch: number, panelName: string;
  if (w.panel === "custom") {
    unitW = num(w.customW);
    unitH = num(w.customH);
    pitch = num(w.customPitch);
    if (!(unitW > 0 && unitH > 0)) return { ok: false, error: "Enter the custom panel's width and height in mm." };
    if (!(pitch > 0)) return { ok: false, error: "Enter the custom panel's pixel pitch in mm." };
    px = Math.round(unitW / pitch);
    py = Math.round(unitH / pitch);
    if (px < 1 || py < 1) return { ok: false, error: "Pixel pitch is larger than the panel." };
    panelName = `Custom ${trim(unitW)} × ${trim(unitH)} mm, ${trim(pitch)} mm pitch`;
  } else {
    const p = w.panel === "graphite" ? PANELS.graphiteHalf : PANELS.diamond;
    unitW = p.wMm;
    unitH = p.hMm;
    px = p.px;
    py = p.py;
    pitch = unitW / px;
    panelName = w.panel === "graphite" ? PANELS.graphite.name : PANELS.diamond.name;
  }

  let cols: number, rows: number, gpFull = 0, gpHalf = 0;
  let requested: WallResult["requested"] = null;
  if (w.mode === "dims") {
    const W = num(w.widthFt), H = num(w.heightFt);
    if (!(W > 0 && H > 0)) return { ok: false, error: "Enter the wall's width and height in feet." };
    requested = { widthFt: W, heightFt: H };
    cols = Math.round((W * MM_PER_FT) / unitW);
    rows = Math.round((H * MM_PER_FT) / unitH);
    // Same rule as the LED calculator spreadsheet: a 9 ft tall ROE wall is built 6 panels (500 mm) high.
    if (w.panel !== "custom" && H === 9) rows = 6;
    if (w.panel === "graphite") {
      gpFull = Math.floor(rows / 2);
      gpHalf = rows % 2;
    }
  } else {
    cols = whole(w.cols);
    if (w.panel === "graphite") {
      gpFull = whole(w.gpFull);
      gpHalf = whole(w.gpHalf);
      rows = gpFull * 2 + gpHalf;
    } else {
      rows = whole(w.rows);
    }
  }
  if (cols < 1 || rows < 1) {
    return {
      ok: false,
      error: w.mode === "dims" ? "That's smaller than one panel." : "Enter at least 1 panel wide and 1 panel high.",
    };
  }
  if (cols > MAX_PANELS_PER_SIDE || rows > MAX_PANELS_PER_SIDE) return { ok: false, error: "That wall is too large." };

  let fullPanels: number, halfPanels = 0, watts: number | null, weightKg: number | null, panelPx: string;
  if (w.panel === "graphite") {
    fullPanels = cols * gpFull;
    halfPanels = cols * gpHalf;
    watts = fullPanels * PANELS.graphite.watts + halfPanels * PANELS.graphiteHalf.watts;
    weightKg = fullPanels * PANELS.graphite.kg + halfPanels * PANELS.graphiteHalf.kg;
    panelPx = `${PANELS.graphite.px} × ${PANELS.graphite.py}`;
  } else {
    fullPanels = cols * rows;
    if (w.panel === "diamond") {
      watts = fullPanels * PANELS.diamond.watts;
      weightKg = fullPanels * PANELS.diamond.kg;
    } else {
      const cw = num(w.customWatts);
      watts = cw > 0 ? fullPanels * cw : null;
      weightKg = null;
    }
    panelPx = `${px} × ${py}`;
  }

  return {
    ok: true,
    panelName,
    cols,
    rows,
    fullPanels,
    halfPanels,
    panelCount: fullPanels + halfPanels,
    panelPx,
    widthMm: cols * unitW,
    heightMm: rows * unitH,
    resX: cols * px,
    resY: rows * py,
    pitchMm: pitch,
    watts,
    weightKg,
    qty,
    requested,
  };
}

// ---- formatting ----

function trim(n: number, d = 3) {
  return String(+n.toFixed(d));
}

/** 7500 mm -> 24' 7 1/4" (to the nearest quarter inch). */
export function ftIn(mm: number): string {
  let quarters = Math.round((mm / 25.4) * 4);
  const ft = Math.floor(quarters / 48);
  quarters -= ft * 48;
  const inches = Math.floor(quarters / 4);
  const frac = ["", " 1/4", " 1/2", " 3/4"][quarters % 4];
  return `${ft}' ${inches}${frac}"`;
}

export const ftDec = (mm: number) => (mm / MM_PER_FT).toFixed(2) + " ft";
export const meters = (mm: number) => trim(mm / 1000, 2) + " m";
export const lbs = (kg: number) => Math.round(kg * 2.20462).toLocaleString("en-US") + " lb";
export const fmt = (n: number) => n.toLocaleString("en-US");

export function aspect(x: number, y: number): string {
  const g = gcd(x, y);
  const a = x / g, b = y / g;
  const dec = (x / y).toFixed(2) + ":1";
  return a <= 32 && b <= 32 ? `${a}:${b} (${dec})` : dec;
}
function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

export interface WallTotals {
  walls: number;
  byPanel: { name: string; count: number }[];
  watts: number;
  wattsKnown: boolean;
}

export function totals(walls: LedWall[]): WallTotals {
  const counts = new Map<string, number>();
  let n = 0, watts = 0, wattsKnown = true;
  const add = (name: string, c: number) => c > 0 && counts.set(name, (counts.get(name) ?? 0) + c);
  for (const w of walls) {
    const r = calcWall(w);
    if (!r.ok) continue;
    n += r.qty;
    if (w.panel === "graphite") {
      add("ROE Graphite 2.6 (500 × 1000)", r.fullPanels * r.qty);
      add("ROE Graphite 2.6 half (500 × 500)", r.halfPanels * r.qty);
    } else {
      add(r.panelName, r.panelCount * r.qty);
    }
    if (r.watts == null) wattsKnown = false;
    else watts += r.watts * r.qty;
  }
  return { walls: n, byPanel: [...counts].map(([name, count]) => ({ name, count })), watts, wattsKnown };
}

/** Clean up untrusted wall data before saving. */
export function sanitizeWalls(input: unknown): LedWall[] {
  if (!Array.isArray(input)) return [];
  const str = (v: unknown, max = 40) => (typeof v === "string" ? v.slice(0, max) : "");
  return input.slice(0, 50).map((raw, i) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const base = newWall(i + 1);
    return {
      id: str(r.id, 20) || base.id,
      name: str(r.name, 100),
      qty: str(r.qty),
      panel: (["diamond", "graphite", "custom"] as const).includes(r.panel as PanelType) ? (r.panel as PanelType) : "diamond",
      mode: r.mode === "count" ? "count" : "dims",
      widthFt: str(r.widthFt),
      heightFt: str(r.heightFt),
      cols: str(r.cols),
      rows: str(r.rows),
      gpFull: str(r.gpFull),
      gpHalf: str(r.gpHalf),
      customW: str(r.customW),
      customH: str(r.customH),
      customPitch: str(r.customPitch),
      customWatts: str(r.customWatts),
      notes: str(r.notes, 2000),
    };
  });
}
