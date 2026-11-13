import type { Bank, GroupId } from "./types";


// Starting questionnaire, built from "PM Questions and Checklist.xlsx".
// "q" = a question with a written answer, "c" = a checklist item (checkbox + note).
type Item = ["q" | "c", string];


// The "Cameras" question keeps its ID from when it sat under Sources & Playback.
const CAMERA_ITEMS: Item[] = [
  ["q", "Cameras"],
  ["c", "Camera Positions & Risers"],
  ["c", "Lenses"],
  ["c", "Camera Operators"],
  ["c", "Comms for Camera Ops"],
  ["c", "IMAG Feeds"],
];

export const SEED: { id?: string; name: string; special?: string; items: Item[] }[] = [
  {
    name: "Project Info",
    items: [
      ["q", "PM Info"],
      ["q", "Location"],
      ["q", "Misc Notes"],
    ],
  },
  {
    name: "Schedule & Travel",
    items: [
      ["q", "Deadlines"],
      ["q", "Travel Dates"],
      ["q", "Hotel Booking"],
    ],
  },
  {
    name: "Client Needs",
    items: [
      ["q", "Client Asks"],
      ["q", "Challenges"],
    ],
  },
  {
    name: "LED Walls",
    special: "led",
    items: [
      ["q", "LED Wall Notes"],
      ["c", "Build Time"],
      ["c", "Build and Strike Crew"],
    ],
  },
  {
    name: "Projection & Screens",
    special: "projection",
    items: [
      ["q", "Screen and Projection"],
      ["c", "Projection Dark Time"],
      ["c", "Lens Calculations"],
      ["c", "Power Calculations"],
    ],
  },
  {
    name: "Monitors & DSMs",
    items: [
      ["q", "Monitors"],
      ["q", "DSMs"],
      ["c", "DSM Positions"],
      ["c", "DSM Grouping"],
      ["c", "DSM Sizing"],
      ["c", "Speaker Timer position and control"],
    ],
  },
  {
    name: "Switching & Routing",
    items: [
      ["q", "Switchers"],
      ["q", "Routers"],
    ],
  },
  {
    name: "Cameras",
    items: CAMERA_ITEMS,
  },
  {
    name: "Sources & Playback",
    items: [
      ["q", "Laptops"],
      ["q", "Media Servers"],
    ],
  },
  {
    name: "Stage",
    items: [
      ["c", "Podium signal?"],
      ["c", "Other Stage Signals"],
    ],
  },
  {
    name: "Records & Streaming",
    items: [
      ["q", "Records"],
      ["c", "What to Record"],
      ["c", "File format"],
      ["c", "Record Delivery (SSDs needed)"],
      ["q", "Streams"],
      ["c", "70:30?"],
      ["c", "Hardline"],
      ["c", "Dedicated Operator"],
    ],
  },
  {
    // Keeps the ID from when this was "FOH & Video Village", so older show files still line up.
    id: "c-foh-video-village",
    name: "FOH",
    items: [
      ["q", "FOH"],
      ["c", "Multiviews and position"],
      ["c", "Cable run to FOH"],
      ["c", "Signal from FOH?"],
      ["c", "FOH Power Needs"],
    ],
  },
  {
    name: "Video Village",
    items: [
      ["c", "Video Village Location"],
      ["c", "Table Positioning"],
      ["c", "Power for Video Village"],
      ["c", "Audio Monitors"],
    ],
  },
  {
    name: "BOH",
    items: [
      ["q", "BOH"],
      ["c", "Backstage Monitors"],
      ["c", "Green Rooms"],
      ["c", "BOH Monitor signals"],
      ["c", "Trash Cans"],
      ["c", "Water Service"],
      ["c", "Snacks?"],
    ],
  },
  {
    name: "Rigging, Power & Cabling",
    items: [
      ["q", "Rigging"],
      ["c", "Truss Overlap and Trim Order"],
      ["c", "Check Movers on Truss"],
      ["q", "Power Requirements"],
      ["q", "Cable Paths"],
      ["c", "Cable Runs (diagrammed)"],
    ],
  },
  {
    name: "Crew",
    items: [
      ["q", "Crew"],
      ["c", "Crew Positions"],
      ["c", "Crew Schedule for setup and show"],
      ["c", "Projectionist for show (if needed)"],
      ["c", "Crew Contact Info"],
    ],
  },
  {
    name: "Documents & Files",
    items: [
      ["q", "Schematics and CADs"],
      ["c", "Folder with all video orders"],
      ["c", "CADs"],
    ],
  },
];


const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The starting question list. IDs come from the text so files made in any browser
 * line up with each other.
 */
/** Where each starting category sits: its group and its order within the group. */
const LAYOUT: Record<GroupId, string[]> = {
  general: ["c-project-info", "c-schedule-travel", "c-client-needs", "c-crew", "c-documents-files"],
  video: ["c-led-walls", "c-projection-screens", "c-monitors-dsms", "c-switching-routing", "c-cameras", "c-sources-playback", "c-records-streaming"],
  room: ["c-foh-video-village", "c-video-village", "c-boh", "c-rigging-power-cabling", "c-stage"],
};
const LAYOUT_ORDER = (Object.keys(LAYOUT) as GroupId[]).flatMap((g) => LAYOUT[g].map((id) => ({ id, group: g })));

/** Put categories into their groups, in the layout's order; others keep their order after them. */
function applyLayout(bank: Bank): Bank {
  const known = new Map(LAYOUT_ORDER.map((x, i) => [x.id, { ...x, i }]));
  const cats = bank.categories.map((c, i) => {
    const k = known.get(c.id);
    return { c: { ...c, group: c.group ?? k?.group ?? "general" }, order: k ? k.i : LAYOUT_ORDER.length + i };
  });
  cats.sort((a, b) => a.order - b.order);
  return { ...bank, categories: cats.map((x) => x.c) };
}

export function seedBank(): Bank {
  const bank: Bank = { categories: [], questions: [] };
  for (const c of SEED) {
    const cid = c.id ?? `c-${slug(c.name)}`;
    bank.categories.push({ id: cid, name: c.name, ...(c.special ? { special: c.special } : {}) });
    for (const [k, text] of c.items) {
      bank.questions.push({ id: `q-${slug(text)}`, categoryId: cid, text, kind: k === "c" ? "check" : "text" });
    }
  }
  return applyLayout(bank);
}

/**
 * Brings a question list saved by an older version up to date. Only touches things still the way
 * the older version made them, so your own renames and moves are left alone.
 */
export function migrateBank(bank: Bank): Bank {
  const b = addCameras(splitFohVideoVillage(addProjectionPlanner(bank)));
  // Lists saved before groups existed: put the starting categories into their groups.
  return b.categories.some((c) => !c.group) ? applyLayout(b) : b;
}

// The projection screen planner lives in "Projection & Screens".
function addProjectionPlanner(bank: Bank): Bank {
  if (bank.categories.some((c) => c.special === "projection")) return bank;
  if (!bank.categories.some((c) => c.id === "c-projection-screens" && !c.special)) return bank;
  return { ...bank, categories: bank.categories.map((c) => (c.id === "c-projection-screens" ? { ...c, special: "projection" } : c)) };
}

// "FOH & Video Village" was split into "FOH" and "Video Village".
function splitFohVideoVillage(bank: Bank): Bank {
  const foh = bank.categories.find((c) => c.id === "c-foh-video-village");
  if (!foh || foh.name !== "FOH & Video Village" || bank.categories.some((c) => c.id === "c-video-village")) return bank;
  const vvIds = ["q-video-village-location", "q-table-positioning", "q-power-for-video-village", "q-audio-monitors"];
  const categories = bank.categories.flatMap((c) =>
    c.id === foh.id ? [{ ...c, name: "FOH" }, { id: "c-video-village", name: "Video Village" }] : [c]
  );
  const questions = bank.questions.map((q) =>
    q.categoryId === foh.id && vvIds.includes(q.id) ? { ...q, categoryId: "c-video-village" } : q
  );
  return { categories, questions };
}

// "Cameras" became its own Video System category (it was a question under Sources & Playback).
function addCameras(bank: Bank): Bank {
  if (bank.categories.some((c) => c.id === "c-cameras")) return bank;
  const cat = { id: "c-cameras", name: "Cameras", group: "video" as const };
  const at = bank.categories.findIndex((c) => c.id === "c-sources-playback");
  const categories = at < 0 ? [...bank.categories, cat] : [...bank.categories.slice(0, at), cat, ...bank.categories.slice(at)];
  const questions = bank.questions.map((q) =>
    q.id === "q-cameras" && q.categoryId === "c-sources-playback" ? { ...q, categoryId: cat.id } : q
  );
  const have = new Set(questions.map((q) => q.id));
  for (const [k, text] of CAMERA_ITEMS) {
    const id = `q-${slug(text)}`;
    if (!have.has(id)) questions.push({ id, categoryId: cat.id, text, kind: k === "c" ? "check" : "text" });
  }
  return { categories, questions };
}
