import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { MANIFEST_PATH, MONEY_FIELDS, buildManifest, loadFixtures, manifestText } from "../src/codex";

const cols = loadFixtures();
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

test("the Codex manifest is generated from the fixtures (bun xgen/schema/src/codex.ts)", () => {
  expect(readFileSync(MANIFEST_PATH, "utf8")).toBe(manifestText(buildManifest(cols)));
});

test("money: integer minor units next to an ISO 4217 currency", () => {
  for (const c of cols) for (const e of c.entries) for (const k of MONEY_FIELDS) {
    const v = e.metadata?.[k]?.value;
    if (v === undefined) continue;
    expect([c.collection, e.id, k, Number.isSafeInteger(v)]).toEqual([c.collection, e.id, k, true]);
    expect(String(e.metadata?.currency?.value)).toMatch(/^[A-Z]{3}$/);
  }
});

test("dates are RFC 3339; the UI formats them (|date, |ago)", () => {
  const dated: Record<string, string> = { posts: "date", orders: "date", reviews: "date", activity: "time", testimonials: "time", jobs: "posted" };
  for (const [col, k] of Object.entries(dated)) for (const e of cols.find((c) => c.collection === col)!.entries) expect(String(e.metadata?.[k]?.value)).toMatch(RFC3339);
});

test("every fixture kind is a manifest resource with every metadata key", () => {
  const m = buildManifest(cols);
  for (const c of cols) for (const e of c.entries) {
    const r = m.resources.find((x) => x.record.id === e.kind);
    expect(r).toBeDefined();
    for (const k of Object.keys(e.metadata ?? {})) expect(r!.record.fields.map((f) => f.id)).toContain(k);
  }
});
