import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { generatedUiRoot, serveExamplesStatic } from "../shared/vite-static";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [solid(), serveExamplesStatic()],
  resolve: {
    alias: {
      "@ui": path.join(generatedUiRoot, "index.solid.ts"),
    },
  },
  server: {
    port: 5178,
    fs: {
      allow: [path.resolve(rootDir, ".."), path.resolve(rootDir, "../../generated")],
    },
  },
});
