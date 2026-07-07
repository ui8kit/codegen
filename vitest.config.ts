import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    svelte({ compilerOptions: { runes: true } }),
    vue(),
  ],
  resolve: {
    // Vue SSR needs the node build; svelte needs server-side exports.
    conditions: ["node"],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    globalSetup: ["tests/global-setup.ts"],
  },
  esbuild: {
    jsx: "automatic",
  },
});
