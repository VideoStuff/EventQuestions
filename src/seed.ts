import type { Bank } from "./types";


// Starting questionnaire, built from "PM Questions and Checklist.xlsx".
// "q" = a question with a written answer, "c" = a checklist item (checkbox + note).
type Item = ["q" | "c", string];


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
    name: "Sources & Playback",
    items: [
      ["q", "Cameras"],
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
export function seedBank(): Bank {
  const bank: Bank = { categories: [], questions: [] };
  for (const c of SEED) {
    const cid = c.id ?? `c-${slug(c.name)}`;
    bank.categories.push({ id: cid, name: c.name, ...(c.special ? { special: c.special } : {}) });
    for (const [k, text] of c.items) {
      bank.questions.push({ id: `q-${slug(text)}`, categoryId: cid, text, kind: k === "c" ? "check" : "text" });
    }
  }
  return bank;
}

/**
 * Brings a question list saved by an older version up to date. Only touches things still the way
 * the older version made them, so your own renames and moves are left alone.
 */
export function migrateBank(bank: Bank): Bank {
  // v1: "FOH & Video Village" was split into "FOH" and "Video Village".
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
