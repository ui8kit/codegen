import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import vue from "@vitejs/plugin-vue";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    svelte({ compilerOptions: { runes: true } }),
    vue(),
    // Only transform codegen Solid outputs — React keeps esbuild JSX.
    solid({ ssr: true, include: /\.solid\.tsx$/ }),
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
