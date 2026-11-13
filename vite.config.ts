import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Builds one self-contained docs/index.html: GitHub Pages serves it from /docs,
// and the same file can be downloaded and opened offline.
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  build: { outDir: "docs", emptyOutDir: true },
});
