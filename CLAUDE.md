# Notes for Claude

The owner is not a developer: explain changes in plain language.

- The app is built from `src/` into one self-contained file, `docs/index.html`, which GitHub Pages serves and
  which the owner can also open offline. After any change run `npm run build` and commit `docs/index.html` too.
- There is no server. Data lives in the browser (localStorage key `show-sheets:v1`) and in downloaded `.json`
  files (`src/files.ts`). Keep old files opening: if the file format changes, raise `VERSION` and handle older
  versions when reading.
- Seeded question and category IDs come from their text (`src/seed.ts`). Don't change existing IDs, or answers
  in saved show files would no longer line up.
- LED panel specs in `src/led.ts` should stay in step with VideoStuff/led-wall-calc and PixelPlanner.
- After changes, check: create a show, download it, open the file in a fresh browser profile, and confirm
  everything comes back; also check the page at phone width.
