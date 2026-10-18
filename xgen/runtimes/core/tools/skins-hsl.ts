// One-off converter: rewrites every colour of the skin CSS files (hex, rgb(), oklch()) as hsl() and applies FIXES.
// Run from the workspace root: bun xgen/runtimes/core/tools/skins-hsl.ts [file.css ...]   (default: skins/*.css and theme.css)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXES, toHslCss } from "./skin-colors";

const STYLES = join(import.meta.dir, "..", "assets", "styles");
const COLOR = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|oklch\([^)]*\)|rgba?\([^)]*\)/g;

export function convert(css: string, skin: string): string {
  let theme: "light" | "dark" = "light";
  const fixes = FIXES[skin];
  // comments stay as they are; everything else is read line by line
  return css.split(/(\/\*[\s\S]*?\*\/)/).map((part) => {
    if (part.startsWith("/*")) return part;
    return part.split("\n").map((line) => {
      if (/\{\s*$/.test(line) && !line.startsWith(" ")) theme = /\.dark|data-theme="dark"/.test(line) ? "dark" : "light";
      const token = line.match(/^\s*--([a-z0-9-]+):/)?.[1];
      const fixed = token ? fixes?.[theme]?.[token] : undefined;
      if (fixed) return line.replace(/^(\s*--[a-z0-9-]+:\s*)[^;]+;/, `$1${toHslCss(fixed, 0.25)};`);
      return line.replace(COLOR, (c) => toHslCss(c));
    }).join("\n");
  }).join("");
}

if (import.meta.main) {
  const files = process.argv.slice(2).length ? process.argv.slice(2)
    : [...readdirSync(join(STYLES, "skins")).filter((f) => f.endsWith(".css")).map((f) => join(STYLES, "skins", f)), join(STYLES, "theme.css")];
  for (const f of files) {
    const name = f.split("/").pop()!.replace(/\.css$/, "");
    const skin = name === "theme" ? "default" : name;
    const src = readFileSync(f, "utf8");
    const out = convert(src, skin);
    if (out !== src) writeFileSync(f, out);
    console.log(`${name}: ${out !== src ? "rewritten" : "unchanged"}`);
  }
}
