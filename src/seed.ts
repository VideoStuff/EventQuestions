import type { Bank } from "./types";


// Starting questionnaire, built from "PM Questions and Checklist.xlsx".
// "q" = a question with a written answer, "c" = a checklist item (checkbox + note).
type Item = ["q" | "c", string];


export const SEED: { name: string; special?: string; items: Item[] }[] = [
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
    name: "FOH & Video Village",
    items: [
      ["q", "FOH"],
      ["c", "Video Village Location"],
      ["c", "Table Positioning"],
      ["c", "Power for Video Village"],
      ["c", "Audio Monitors"],
      ["c", "Multiviews and position"],
      ["c", "Cable run to FOH"],
      ["c", "Signal from FOH?"],
      ["c", "FOH Power Needs"],
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
    const cid = `c-${slug(c.name)}`;
    bank.categories.push({ id: cid, name: c.name, ...(c.special ? { special: c.special } : {}) });
    for (const [k, text] of c.items) {
      bank.questions.push({ id: `q-${slug(text)}`, categoryId: cid, text, kind: k === "c" ? "check" : "text" });
    }
  }
  return bank;
}
