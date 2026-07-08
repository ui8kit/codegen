/**
 * Bun test preload: compile generated .svelte (SSR) and .vue SFCs before parity
 * tests import them. React .tsx files are handled natively by Bun.
 */

import { readFileSync } from "node:fs";
import { plugin } from "bun";
import { compile } from "svelte/compiler";
import { compileScript, parse } from "@vue/compiler-sfc";

await plugin({
  name: "ui8kit svelte ssr loader",
  setup(builder) {
    builder.onLoad({ filter: /\.svelte(\?[^.]+)?$/ }, ({ path }) => {
      const filePath = path.includes("?") ? path.slice(0, path.indexOf("?")) : path;
      const source = readFileSync(filePath, "utf-8");
      const result = compile(source, {
        filename: filePath,
        generate: "server",
        dev: false,
      });
      return { contents: result.js.code, loader: "js" };
    });
  },
});

await plugin({
  name: "ui8kit vue sfc loader",
  setup(builder) {
    builder.onLoad({ filter: /\.vue(\?[^.]+)?$/ }, ({ path }) => {
      const filePath = path.includes("?") ? path.slice(0, path.indexOf("?")) : path;
      const source = readFileSync(filePath, "utf-8");
      const { descriptor, errors } = parse(source, { filename: filePath });
      if (errors.length) {
        throw new AggregateError(errors, `Failed to parse ${filePath}`);
      }
      const script = compileScript(descriptor, {
        id: filePath,
        inlineTemplate: true,
      });
      return { contents: script.content, loader: "ts" };
    });
  },
});
