import path from "path";
import { fileURLToPath } from "url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { generatedUiRoot, serveExamplesStatic } from "../shared/vite-static";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [vue(), serveExamplesStatic()],
  resolve: {
    alias: {
      "@ui": path.join(generatedUiRoot, "index.vue.ts"),
    },
  },
  server: {
    port: 5175,
    fs: {
      allow: [path.resolve(rootDir, ".."), path.resolve(rootDir, "../../generated")],
    },
  },
});
