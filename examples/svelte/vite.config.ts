import path from "path";
import { fileURLToPath } from "url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { generatedUiRoot, serveExamplesStatic } from "../shared/vite-static";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [svelte(), serveExamplesStatic()],
  resolve: {
    alias: {
      "@ui": path.join(generatedUiRoot, "index.svelte.ts"),
    },
  },
  server: {
    port: 5174,
    fs: {
      allow: [path.resolve(rootDir, ".."), path.resolve(rootDir, "../../generated")],
    },
  },
});
