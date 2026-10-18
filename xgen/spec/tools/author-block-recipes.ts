#!/usr/bin/env bun
// One-time tool: writes the recipes of the block frames (SectionFrame, MediaFrame) into xgen/specs/recipes. Tokens only, no gradients.
// usage: bun spec/tools/author-block-recipes.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join(import.meta.dir, "../../specs/recipes");
const recipes = {
  "section-frame": {
    base: "w-full",
    byKey: {
      tone: { default: "", muted: "bg-muted", accent: "border-y-2 border-primary bg-card", inverse: "bg-foreground text-background [&_.text-muted-foreground]:text-background/70" },
      density: { roomy: "py-16", default: "py-10", compact: "py-6", flush: "py-0" },
      align: { start: "", center: "text-center" },
    },
    defaults: { tone: "default", density: "default", align: "start" },
    keys: ["tone", "density", "align"],
  },
  "media-frame": {
    base: "relative w-full overflow-hidden bg-muted text-muted-foreground inset-ring inset-ring-border",
    byKey: {
      ratio: { "16/9": "aspect-video", "4/3": "aspect-4/3", "1/1": "aspect-square", "3/4": "aspect-3/4", "21/9": "aspect-21/9" },
      shape: { card: "rounded-2xl", square: "rounded-none", circle: "rounded-full" },
    },
    defaults: { ratio: "16/9", shape: "card" },
    keys: ["ratio", "shape"],
  },
};
for (const [name, r] of Object.entries(recipes)) {
  writeFileSync(join(out, `${name}.variants.json`), JSON.stringify({ $schema: "../../schema/schemas/variants.schema.json", id: `block.${name}`, ...r }, null, 2) + "\n");
}
