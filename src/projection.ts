// Projection screen math. The projector fills the screen's height; the screen's width in
// projector pixels ("apparent width") follows from the screen's aspect ratio.
import { ftIn, meters } from "./led";

export interface ProjScreen {
  id: string;
  name: string;
  qty: string;
  heightFt: string;
  widthFt: string;
  projector: string; // "1920x1080" | "1920x1200" | "3840x2160"
  notes: string;
}

export const PROJECTORS = [
  { value: "1920x1080", label: "1920 × 1080 (HD)", w: 1920, h: 1080 },
  { value: "1920x1200", label: "1920 × 1200 (WUXGA)", w: 1920, h: 1200 },
  { value: "3840x2160", label: "3840 × 2160 (4K UHD)", w: 3840, h: 2160 },
] as const;

/** Common screen sizes, height × width in feet. */
export const SCREEN_SIZES: { group: string; h: number; w: number; label: string }[] = [
  ...(
    [
      [6, 10.667, "6' × 10' 8\""],
      [7.5, 13.333, "7' 6\" × 13' 4\""],
      [9, 16, "9' × 16'"],
      [10.5, 18.667, "10' 6\" × 18' 8\""],
      [12, 21.333, "12' × 21' 4\""],
      [13.5, 24, "13' 6\" × 24'"],
      [15, 26.667, "15' × 26' 8\""],
    ] as const
  ).map(([h, w, label]) => ({ group: "16:9", h, w, label })),
  ...(
    [
      [6, 9.6, "6' × 9' 7\""],
      [7.5, 12, "7' 6\" × 12'"],
      [9, 14.4, "9' × 14' 5\""],
      [10.5, 16.8, "10' 6\" × 16' 10\""],
      [12, 19.2, "12' × 19' 2\""],
    ] as const
  ).map(([h, w, label]) => ({ group: "16:10", h, w, label })),
  ...(
    [
      [10, 30, "10' × 30'"],
      [12, 36, "12' × 36'"],
      [15, 45, "15' × 45'"],
    ] as const
  ).map(([h, w, label]) => ({ group: "Wide (blend)", h, w, label })),
];

export function presetFor(s: Pick<ProjScreen, "heightFt" | "widthFt">): string {
  const i = SCREEN_SIZES.findIndex((p) => String(p.h) === s.heightFt.trim() && String(p.w) === s.widthFt.trim());
  return i < 0 ? "custom" : String(i);
}

export function newScreen(n: number): ProjScreen {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name: `Screen ${n}`,
    qty: "1",
    heightFt: "9",
    widthFt: "16",
    projector: "1920x1080",
    notes: "",
  };
}

export type ScreenCalc =
  | {
      ok: true;
      qty: number;
      heightMm: number;
      widthMm: number;
      projW: number;
      projH: number;
      /** Screen width in projector pixels when the image fills the height. */
      apparentW: number;
      pxPerFt: number;
      aspect: number;
      /** Projectors side by side to fill the screen. */
      projectors: number;
      /** Overlap at each blend, in projector pixels (0 for one projector). */
      overlapPx: number;
      /** The same overlap on the screen, in mm. */
      overlapMm: number;
    }
  | { ok: false; error: string };

export function calcScreen(s: ProjScreen): ScreenCalc {
  const h = parseFloat(s.heightFt), w = parseFloat(s.widthFt);
  if (!(h > 0 && w > 0)) return { ok: false, error: "Enter the screen's height and width in feet." };
  if (h > 500 || w > 500) return { ok: false, error: "That screen is too large." };
  const p = PROJECTORS.find((x) => x.value === s.projector) ?? PROJECTORS[0];
  const pxPerFt = p.h / h;
  const apparentW = Math.round(w * pxPerFt);
  const q = parseInt(s.qty, 10);
  return {
    ok: true,
    qty: q > 0 ? q : 1,
    heightMm: h * 304.8,
    widthMm: w * 304.8,
    projW: p.w,
    projH: p.h,
    apparentW,
    pxPerFt,
    aspect: w / h,
    ...blend(apparentW, p.w, pxPerFt),
  };
}

/** Smallest overlap at each blend, as a share of one projector's width. */
export const MIN_OVERLAP = 0.15;

/**
 * How many projectors fill the screen's width, and the overlap at each blend.
 * N projectors with overlap O cover N × P − (N − 1) × O pixels, so O = (N × P − W) ÷ (N − 1).
 * Uses the fewest projectors that leave at least MIN_OVERLAP of a projector at each blend.
 */
function blend(apparentW: number, projW: number, pxPerFt: number) {
  if (apparentW <= projW) return { projectors: 1, overlapPx: 0, overlapMm: 0 };
  let n = 2;
  while ((n * projW - apparentW) / (n - 1) < MIN_OVERLAP * projW) n++;
  const overlapPx = Math.round((n * projW - apparentW) / (n - 1));
  return { projectors: n, overlapPx, overlapMm: (overlapPx / pxPerFt) * 304.8 };
}

export const sizeText = (c: Extract<ScreenCalc, { ok: true }>) =>
  `${ftIn(c.heightMm)} × ${ftIn(c.widthMm)}`;
export const sizeMeters = (c: Extract<ScreenCalc, { ok: true }>) => `${meters(c.heightMm)} × ${meters(c.widthMm)}`;

export function sanitizeScreens(input: unknown): ProjScreen[] {
  if (!Array.isArray(input)) return [];
  const str = (v: unknown, max = 40) => (typeof v === "string" ? v.slice(0, max) : "");
  return input.slice(0, 50).map((raw, i) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const base = newScreen(i + 1);
    return {
      id: str(r.id, 20) || base.id,
      name: str(r.name, 100),
      qty: str(r.qty),
      heightFt: str(r.heightFt),
      widthFt: str(r.widthFt),
      projector: PROJECTORS.some((p) => p.value === r.projector) ? (r.projector as string) : base.projector,
      notes: str(r.notes, 2000),
    };
  });
}
