/**
 * Bun test preload: compile generated .svelte (SSR), .vue SFCs, and
 * `.solid.tsx` (Solid SSR via babel-preset-solid) before parity tests import
 * them. React `.tsx` files (not `*.solid.tsx`) are handled natively by Bun.
 */

import { readFileSync } from "node:fs";
import { transformSync } from "@babel/core";
import { plugin } from "bun";
import solid from "babel-preset-solid";
import typescript from "@babel/preset-typescript";
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

await plugin({
  name: "ui8kit solid ssr loader",
  setup(builder) {
    builder.onLoad({ filter: /\.solid\.tsx$/ }, ({ path }) => {
      const source = readFileSync(path, "utf-8");
      const result = transformSync(source, {
        filename: path,
        presets: [
          [typescript, { isTSX: true, allExtensions: true }],
          [solid, { generate: "ssr", hydratable: false }],
        ],
        babelrc: false,
        configFile: false,
        sourceMaps: "inline",
      });
      if (!result?.code) throw new Error(`Solid SSR transform failed for ${path}`);
      return { contents: result.code, loader: "js" };
    });
  },
});
