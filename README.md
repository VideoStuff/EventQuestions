# Show Sheets

An info sheet for each show: fill it in on your first call with the PM or producer, and keep adding to it as details firm up. It's for you, not something you send out.

**Open the app:** the GitHub Pages link for this repository (Settings → Pages), or download `docs/index.html` and open it in a browser. It's one self-contained file and works offline.

## Saving your work

There's no server or account. Two layers keep your work:

1. **This browser** keeps every show automatically as you type, so closing the tab is fine.
2. **Show files** are what you keep for good. On a show, click **Download show file** to save a `.json` file to your show folder. On the **Shows** page, click **Open show file** (or drag files onto the page) to bring it back, on this computer or any other.

The sidebar on each show says whether the latest changes have been downloaded, and the Shows list marks shows that haven't been. Browser storage can be cleared (IT policies, clearing history, a different computer), so download the file whenever you finish a round of edits.

- Opening a show that's already in the browser asks whether to **replace** it with the file or **keep both**.
- **Download a backup of every show** (bottom of the Shows page) saves all shows in one file; open it the same way.
- A show file carries its own questions, so it opens complete on a computer that has a different question list.

## What's on a sheet

- **Show details:** OP number, show name, client, dates.
- **Questions and checklist by category:** Project Info, Schedule & Travel, Client Needs, LED Walls, Projection & Screens, Monitors & DSMs, Switching & Routing, Sources & Playback, Stage, Records & Streaming, FOH & Video Village, BOH, Rigging/Power/Cabling, Crew, Documents & Files. Questions get a written answer; checklist items get a checkbox and a note. The starting list comes from *PM Questions and Checklist.xlsx*.
- **LED wall planner:** as many walls as the show needs, each sized by **width × height in feet** (rounded to whole panels) or by **panel count**. Shows the real size (ft-in, decimal ft, meters), resolution, aspect ratio, panel count, pixel pitch, max power and panel weight; a quantity field covers identical walls, and a totals line adds up panels by type and power.
  - **ROE Diamond 2.6**: 500 × 500 mm, 192 × 192 px, 180 W.
  - **ROE Graphite 2.6**: 500 × 1000 mm, 192 × 384 px, 320 W, plus 500 × 500 half panels (160 W).
  - **Custom panel**: enter the pixel pitch and panel size in mm (and optionally watts per panel).
  - Specs and rounding match [led-wall-calc](https://github.com/VideoStuff/led-wall-calc) and PixelPlanner, including the 9 ft → 6 panels high rule.
- **Print / PDF** view of the whole sheet with an LED wall table.
- **Duplicate** a show (under **More** at the bottom of a sheet) to start a similar one.

## Adding questions

- On a sheet, **+ Add question** under any category. Tick **Add to every show** to add it to your question list, or untick it to keep it on this show only.
- The **Questions** page edits the list every show uses: wording, question vs. checklist item, category, order, archive; and add, rename, reorder or delete categories.
- **Download list** / **Load list** on the Questions page move your question list to another computer. Loading adds and updates questions; it never removes any.

## For developers

Built with React + TypeScript and Vite, bundled into the single file `docs/index.html` (GitHub Pages serves `/docs`).

```bash
npm install
npm run dev     # local dev server
npm run build   # typecheck and rebuild docs/index.html (commit it)
```

```
src/App.tsx                    page switching (hash routes: #/, #/show/<id>, #/questions)
src/store.ts                   data kept in the browser (localStorage) and all edits
src/files.ts                   download and open .json show, backup and question-list files
src/led.ts                     LED wall math and panel specs
src/seed.ts                    starting questions and categories
src/components/ShowList.tsx    shows list, new show, open files
src/components/ShowEditor.tsx  the sheet
src/components/LedWalls.tsx    LED wall planner
src/components/QuestionsPage.tsx
src/components/PrintView.tsx
```
