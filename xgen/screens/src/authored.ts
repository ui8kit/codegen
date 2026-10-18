// The organisms and screens that are written with the builder (src/authoring) and stored as JSON in xgen/specs.
// `xgen check` compares the stored JSON with this output; edit the builder, then run `xgen build`.
import { xgenPaths } from "@ui8kit/xgen-schema";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { plansScreen } from "./authoring/screens/plans-screen";
import { parts } from "./authoring/components/parts";
import { patterns } from "./authoring/components/patterns";
import { allOrganisms } from "./authoring/blocks/organisms";
import { framePatterns } from "./authoring/components/frames";
import { blocks, blocksComposed, siteComposed } from "./authoring/gallery/blocks";
import { themeComposed } from "./authoring/screens/themes";
import { catalogComposed } from "./authoring/gallery/catalog";
import { skinsComposed } from "./authoring/gallery/skins";
import { presets } from "./authoring/presets";

export const authored = {
  organisms: allOrganisms,
  parts,
  patterns: [...patterns, ...framePatterns],
  blocks,
  presets,
  screens: [plansScreen, siteComposed, blocksComposed, catalogComposed, skinsComposed, ...themeComposed],
};

/** [folder of specs, list] */
export const authoredDirs = (): Array<readonly [string, ReadonlyArray<{ id: string }>]> => [["organisms", authored.organisms], ["parts", authored.parts], ["patterns", authored.patterns], ["blocks", authored.blocks], ["presets", authored.presets], ["screens", authored.screens]];

export const stringify = (v: unknown): string => JSON.stringify(v, null, 2) + "\n";

export function writeSpecs(root: string): string[] {
  const written: string[] = [];
  for (const [dir, list] of authoredDirs()) {
    mkdirSync(xgenPaths(root).specs(dir), { recursive: true });
    for (const spec of list) {
      const file = join(xgenPaths(root).specs(dir), `${spec.id.split(".")[1]}.json`);
      writeFileSync(file, stringify(spec));
      written.push(file);
    }
  }
  return written;
}
