# Show Sheets (EventQuestions)

A personal info sheet for each show: fill it in on your first call with the PM or producer, and come back to it as details firm up. Nothing is sent to anyone else.

## What's on a show sheet

- **Show details:** OP number, show name, client, dates.
- **Questions and checklist, by category:** Project Info, Schedule & Travel, Client Needs, LED Walls, Projection & Screens, Monitors & DSMs, Switching & Routing, Sources & Playback, Stage, Records & Streaming, FOH & Video Village, BOH, Rigging/Power/Cabling, Crew, Documents & Files. Questions get a written answer; checklist items get a checkbox and a note. The starting list comes from *PM Questions and Checklist.xlsx*.
- **LED wall planner:** add as many walls as the show needs. For each wall pick the panel and size it either by **width × height in feet** (rounded to whole panels) or by **panel count**, and it shows the real size (ft-in, decimal ft, meters), resolution, aspect ratio, panel count, pixel pitch, max power and panel weight. A quantity field covers identical walls (e.g. IMAG left/right), and a totals line adds up panels by type and power.
  - **ROE Diamond 2.6**: 500 × 500 mm, 192 × 192 px, 180 W.
  - **ROE Graphite 2.6**: 500 × 1000 mm, 192 × 384 px, 320 W, plus 500 × 500 half panels (160 W). Count mode takes full rows and half rows.
  - **Custom panel**: enter pixel pitch and panel size in mm (and optionally watts per panel); pixels per panel are worked out from the pitch.
  - Specs and rounding match [led-wall-calc](https://github.com/VideoStuff/led-wall-calc) and PixelPlanner, including the 9 ft → 6 panels high rule.
- **Autosave:** changes save about a second after you stop typing.
- **Print / PDF:** a clean printable version of the sheet with an LED wall table.

## Adding questions

- On a show sheet, use **+ Add question** under any category. Tick **Add to every show** to make it part of every sheet, or untick it to keep it on this show only.
- The **Questions** page manages the list used for every show: edit wording, switch between question and checklist item, move to another category, reorder, archive, and add, rename, reorder or delete categories. Archived items stay visible on shows where they were already answered.

## Running it

Requires Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local   # then set APP_PASSWORD
npm run dev
```

Open http://localhost:3000 and sign in with `APP_PASSWORD`.

| Variable        | Required | Default                    | Purpose                              |
| --------------- | -------- | -------------------------- | ------------------------------------ |
| `APP_PASSWORD`  | yes      | none                       | Password to sign in                  |
| `DATABASE_PATH` | no       | `./data/eventquestions.db` | Location of the SQLite database file |

For production: `npm run build`, then `npm start`. Data lives in one SQLite file, so host it somewhere with a persistent disk (a VM, or a Fly.io/Railway volume), not a serverless host like Vercel. Back up that file to back up every show.

## Project layout

```
app/page.tsx                  list of shows + new show
app/shows/[id]/page.tsx       show sheet
app/shows/[id]/print/page.tsx printable sheet
app/questions/page.tsx        manage questions and categories
app/actions.ts                autosave and add-question actions
components/ShowEditor.tsx     the sheet (autosave, categories, checklist)
components/LedWalls.tsx       LED wall planner
lib/led.ts                    LED wall math and panel specs
lib/seed.ts                   starting questions and categories
lib/db.ts                     SQLite storage
lib/auth.ts                   password sign-in
```
