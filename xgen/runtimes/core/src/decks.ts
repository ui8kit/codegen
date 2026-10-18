// The copy decks of the taste screens, built from their Codex entries (xgen/fixtures/deck*.json) through the central field maps
// (CODEX_FIELDS.deck, deckStat, ...): the generator writes them to packages/taste-data/content/copy.json, the file taste-data
// reads. A part names its deck (metadata.deck) and its place in it (metadata.position).
import { fromCodex } from "../assets/app/core";
import { CODEX_FIELDS } from "../assets/app/fields";
import { BANNER, type GeneratedFile } from "./common";

/** the fixture collections of the decks: the deck entries, then their parts by the deck key they fill */
export const DECK_COLLECTIONS = { deck: "decks", stats: "deckstats", items: "deckitems", plans: "deckplans", quotes: "deckquotes", faq: "deckfaq" } as const;
const PART_MAP = { stats: CODEX_FIELDS.deckStat, items: CODEX_FIELDS.deckItem, plans: CODEX_FIELDS.deckPlan, quotes: CODEX_FIELDS.deckQuote, faq: CODEX_FIELDS.deckFaq } as const;
/** the parts every deck has; the others appear only on the decks that carry them */
const ALWAYS = new Set(["stats", "items"]);

type Entry = { id: string; metadata?: Record<string, { value: unknown }> };
type Collection = { collection: string; entries: Entry[] };
const meta = (e: Entry, k: string): unknown => e.metadata?.[k]?.value;

/** the decks in the order of their fixture, each part in its position; the keys in the order of the Deck type */
export function buildDecks(collections: readonly Collection[]): Record<string, unknown>[] {
  const of = (c: string): Entry[] => collections.find((x) => x.collection === c)?.entries ?? [];
  return of(DECK_COLLECTIONS.deck).map((d) => {
    const { tags, ...head } = fromCodex<Record<string, unknown>>([d], CODEX_FIELDS.deck)[0]!;
    const parts = Object.fromEntries(Object.entries(PART_MAP).map(([key, map]) => {
      const mine = of(DECK_COLLECTIONS[key as keyof typeof PART_MAP]).filter((e) => meta(e, "deck") === d.id)
        .sort((a, b) => Number(meta(a, "position")) - Number(meta(b, "position")));
      return [key, mine.length || ALWAYS.has(key) ? fromCodex(mine, map) : undefined];
    }).filter(([, v]) => v !== undefined));
    const { stats, items, ...extras } = parts;
    return { ...head, stats, items, tags, ...extras };
  });
}

/** packages/taste-data/content/copy.json */
export const decksFile = (collections: readonly Collection[]): GeneratedFile => ({
  path: "copy.json",
  contents: JSON.stringify({ "//": BANNER, source: "xgen/fixtures/deck*.json (change the entries there, then bun run build)", decks: buildDecks(collections) }, null, 2) + "\n",
});
