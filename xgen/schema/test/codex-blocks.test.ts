// `bun run codex:blocks`: blocks.json is generated from the sources; the hand fields (status, required / optional, note,
// emptyMode) survive a regeneration, a new block starts as todo and a moved source is followed.
import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BLOCKS_PATH, blocksDrift, blocksText, buildBlocks, type BlocksDoc } from "../src/codex-blocks";

const doc = JSON.parse(readFileSync(BLOCKS_PATH, "utf8")) as BlocksDoc;

test("blocks.json equals what the sources generate (no drift)", () => {
  expect(blocksDrift()).toEqual([]);
  expect(readFileSync(BLOCKS_PATH, "utf8")).toBe(blocksText(buildBlocks(undefined, doc)));
});

test("a block missing from the previous file appears as todo with its bindings from the spec", () => {
  const prev = { ...doc, blocks: doc.blocks.filter((b) => b.id !== "ProductGrid") };
  const b = buildBlocks(undefined, prev).blocks.find((x) => x.id === "ProductGrid")!;
  expect(b.status).toBe("todo");
  expect(b.source).toBe("xgen/specs/blocks/products.json");
  expect(b.data?.[0]).toMatchObject({ prop: "products", collection: "products", kind: "product", map: "product", list: true });
  expect(b.data?.[0]?.required).toBeUndefined();
});

test("status, required / optional, note and emptyMode are kept; source, bindings, settings and labels follow the sources", () => {
  const prev = structuredClone(doc);
  const pt = prev.blocks.find((x) => x.id === "PageTrail")!;
  pt.source = "xgen/specs/blocks/old-place.json";
  pt.settings = ["stale"];
  pt.note = "kept";
  const tiers = prev.blocks.find((x) => x.id === "PricingTiers")!;
  tiers.status = "todo";
  const next = buildBlocks(undefined, prev).blocks;
  const n = next.find((x) => x.id === "PageTrail")!;
  expect([n.source, n.status, n.note, n.emptyMode, n.emptyState]).toEqual(["xgen/specs/blocks/pagetrail.json", "done", "kept", "omit", true]);
  expect(n.settings).not.toContain("stale");
  expect(n.data?.find((d) => d.collection === "crumbs")?.required).toEqual(["id", "title"]);
  expect(next.find((x) => x.id === "PricingTiers")!.status).toBe("todo");
});

test("every surface is generated: 92 kit blocks, 15 screens, 10 templates + 2 parts, the taste screens (in the monorepo)", () => {
  const count = (s: string) => doc.blocks.filter((b) => b.surface === s).length;
  // the magazine templates and taste screens are surfaces of the codegen-x monorepo only; a standalone checkout has kit blocks and screens
  const monorepo = existsSync(join(import.meta.dir, "..", "..", "..", "apps", "magazine"));
  expect([count("kit-block"), count("xgen-screen"), count("magazine-template"), count("magazine-part")]).toEqual(monorepo ? [92, 15, 10, 2] : [92, 15, 0, 0]);
  if (monorepo) expect(count("taste-screen")).toBeGreaterThan(100);
  else expect(count("taste-screen")).toBe(0);
});
