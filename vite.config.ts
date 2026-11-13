import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import pkg from "./package.json";

// Builds one self-contained docs/index.html: GitHub Pages serves it from /docs,
// and the same file can be downloaded and opened offline.
export default defineConfig({
  base: "./",
  // The version shown in the app comes from package.json ("1.3.0" shows as "v1.3").
  define: { __APP_VERSION__: JSON.stringify(pkg.version.replace(/\.0$/, "")) },
  plugins: [react(), viteSingleFile()],
  build: { outDir: "docs", emptyOutDir: true },
});
