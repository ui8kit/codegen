import { expect, test } from "bun:test";
import { buildDecks, decksFile, DECK_COLLECTIONS } from "../src/decks";
import { BANNER } from "../src/common";

const e = (id: string, title: string, metadata: Record<string, unknown>) => ({ id, title, metadata: Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, { value: v }])) });
const cols = [
  { collection: DECK_COLLECTIONS.deck, entries: [e("d1", "Fernwick", { nav: ["A"], eyebrow: "E", headline: "T", accent: "Ac", lead: "L", cta: "C", secondary: "S", input: "I", note: "N", tags: ["x"] })] },
  { collection: DECK_COLLECTIONS.stats, entries: [e("s2", "Later", { deck: "d1", position: 2, value: "4.9/5" }), e("s1", "First", { deck: "d1", position: 1, value: "24/7" }), e("s3", "Other", { deck: "d9", position: 1, value: "1" })] },
  { collection: DECK_COLLECTIONS.items, entries: [] },
  { collection: DECK_COLLECTIONS.faq, entries: [e("f1", "Q", { deck: "d1", position: 1, answer: "A" })] },
];

test("a deck is built from its entry and its parts, each part in its position, in the key order of the Deck type", () => {
  const [d] = buildDecks(cols);
  expect(Object.keys(d!)).toEqual(["brand", "nav", "eyebrow", "title", "accent", "lead", "cta", "secondary", "input", "note", "stats", "items", "tags", "faq"]);
  expect(d!.stats).toEqual([{ value: "24/7", label: "First" }, { value: "4.9/5", label: "Later" }]);
  expect(d!.items).toEqual([]);
  expect(d!.faq).toEqual([{ title: "Q", text: "A" }]);
  expect("plans" in d!).toBe(false);
});

test("the decks file carries the banner and the decks", () => {
  const f = decksFile(cols);
  expect(f.path).toBe("copy.json");
  const json = JSON.parse(f.contents);
  expect(json["//"]).toBe(BANNER);
  expect(json.decks).toHaveLength(1);
});

test("the deck fixtures: every deck has stats and items (screens read them with no fallback), every part names a deck", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const load = (c: string) => JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "..", "fixtures", `${c}.json`), "utf8"));
  const all = Object.values(DECK_COLLECTIONS).map(load);
  const ids = new Set(all[0].entries.map((x: { id: string }) => x.id));
  for (const c of all.slice(1)) for (const x of c.entries) expect([x.id, ids.has(x.metadata.deck.value)]).toEqual([x.id, true]);
  for (const d of buildDecks(all)) expect([d.brand, (d.stats as unknown[]).length > 0, (d.items as unknown[]).length > 0]).toEqual([d.brand, true, true]);
});
