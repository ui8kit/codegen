import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { generatedUiRoot, generatedUtilsRoot, serveExamplesStatic } from "../shared/vite-static";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react(), serveExamplesStatic()],
  resolve: {
    alias: {
      "@ui": path.join(generatedUiRoot, "index.ts"),
      "@ui-utils": generatedUtilsRoot,
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(rootDir, ".."), path.resolve(rootDir, "../../generated")],
    },
  },
});
