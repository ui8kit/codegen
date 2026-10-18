// The view IR: organisms and screens are trees of primitives (bricks), bound to data by small expressions.
// Text never appears as a literal: it is a reference into the content dictionary or into the labels a component receives as a prop.

/**
 * a literal, a reference {"$":"plan.name"}, an operation {"op":"eq","args":[a,b]}, or a group of named values
 * {"cta": {"$":"ui.home.cta"}, "href": "#/"} (a grouped prop: `actions={{ cta, href }}`; no key may be "$" or "op";
 * the key "..." spreads a named value first: {"...": {"$":"HERO_ACTIONS"}, "mode": "two"} -> `{ ...HERO_ACTIONS, mode: "two" }`)
 */
export type Value = string | number | boolean | null | { $: string } | { op: string; args: Value[] } | ValueGroup;
export interface ValueGroup { [key: string]: Value }

export const isRef = (v: Value | undefined): v is { $: string } => typeof v === "object" && v !== null && typeof (v as { $?: unknown }).$ === "string";
export const isOp = (v: Value | undefined): v is { op: string; args: Value[] } => typeof v === "object" && v !== null && typeof (v as { op?: unknown }).op === "string" && Array.isArray((v as { args?: unknown }).args);
/** a group of named values (a grouped prop) */
export const isGroup = (v: Value | undefined): v is ValueGroup => typeof v === "object" && v !== null && !isRef(v) && !isOp(v);

export type Handler = { call: string; args?: Value[] };

/** what an organism use puts in a slot: nodes (with the slot arguments in scope), or `forward`: a slot of the enclosing organism passed on as it is */
export type SlotFill = { args: string[]; do: ViewNode[]; forward?: string };
export type ViewNode =
  /** a primitive: `use` is a part name (Card, Button, TableCell …); `props` are its spec props by canonical name, `attrs` are free DOM attributes */
  | { use: string; props?: Record<string, Value>; attrs?: Record<string, Value>; on?: Record<string, Handler>; children?: ViewNode[] }
  | { text: Value }
  | { when: Value; then: ViewNode[]; else?: ViewNode[] }
  | { each: Value; as: string; key: Value; do: ViewNode[]; /** name of the loop index, readable inside the body */ index?: string }
  /** renders a slot the component receives (render prop with arguments) */
  | { slot: string; args?: Value[] }
  /** an organism of xgen/specs/organisms; `slots` fill its render-prop slots */
  | { organism: string; props?: Record<string, Value>; on?: Record<string, Handler>; slots?: Record<string, SlotFill> }
  /** where the routed area of a screen goes */
  | { outlet: true }
  /** a part of a screen layout (`ScreenSpec.parts`), emitted as its own file next to the screen: one Block per file (rule 01) */
  | { part: string };

export const OPS: Record<string, number | "n"> = {
  eq: 2, ne: 2, not: 1, and: "n", or: "n", gt: 2, lt: 2, ge: 2, le: 2, add: 2, sub: 2, mul: 2, div: 2, cond: 3, len: 1, at: 2, tpl: "n", money: 2, num: 1,
  /** class merge: cn(a, b, ...) */ cn: "n",
  /** a value of a kit preset: preset("defaults", "hero.band") */ preset: 2,
  max: "n", min: "n", round: 1, coalesce: "n",
  /** String(x), undefined stays undefined */ str: 1,
  /** x != null */ has: 1,
  /** a text that does not wrap at its spaces (each space becomes U+00A0): phone numbers; nbsp("+1 555 0145") */ nbsp: 1,
  /** a label of segments joined by ", " without a segment equal (case-insensitive) to the one before it: "Footer, Footer, Centered" -> "Footer, Centered" */ uniq: 1,
  /** the words of a text: words("Build your next page") -> ["Build", "your", "next", "page"] */ words: 1,
  /** the item at an index of a list, undefined past the end: nth(weights, i) -> weights?.[i] */ nth: 2,
  /** the literal `undefined` (an attribute that is left out) */ undef: 0,
  /** [0 .. n-1] */ range: 1,
  /** class string of a recipe: recipe("iconTab", "state", value, "size", value, ...); the first argument names an entry of `recipes` */ recipe: "n",
  /** largest `field` of the items, 0 for none: maxBy(items, "value") */ maxBy: 2,
  /** sum of `a * b` over the items, 0 for none: sumBy(lines, "price", "qty") */ sumBy: 3,
  /** a field of the first item: firstOf(lines, "currency") (guard with len) */ firstOf: 2,
  /** the item whose `id` equals the value: pick(items, "plan-team") */ pick: 2,
  /** how many items have a truthy field: count(items, "done") */ count: 2,
  /** the items whose field equals the value: where(items, "category", value); an empty value keeps all */ where: 3,
  /** the items whose text field contains the query, ignoring case; an empty query keeps all */ match: 3,
  /** inline style: css("height", value, "px", ...) in triples */ css: "n",
  /** page numbers to show (null = a gap): pageWindow(page, pages) */ pageWindow: 2,
  /** a responsive column variant capped by the item count: fitCols("1-4", 3) -> "1-3" */ fitCols: 2,
  /** a literal array: list(a, b, c) -> [a, b, c] */ list: "n",
};

export type FieldType = "string" | "number" | "boolean" | "string[]";
/**
 * a field of a record: a data field (FieldType), or in a grouped prop any TypeScript type written out
 * (`"one" | "two"`, `NavLink[]`); `default` is the value a variant axis on the field starts from
 */
export interface RecordField { name: string; type: FieldType | (string & {}); optional?: boolean; default?: string | number | boolean; docs?: string }
/** a field type, a record of the organism, or a TypeScript type written out (`"disc" | "tile"`; it must mean the same in both runtimes) */
export type PropType = FieldType | { record: string } | { ts: string };

export interface OrganismSpec {
  $schema?: string;
  specVersion: 1;
  /** organism.pricing-card | part.pager | pattern.switcher; the prefix is the tier and the folder of the generated file */
  id: string;
  /** PricingCard */
  name: string;
  docs: string;
  /** record types used by props, slots and events */
  records: Record<string, RecordField[]>;
  /** record types read from other organisms, by organism name */
  typeImports?: Array<{ from: string; names: string[] }>;
  props: Array<{ name: string; type: PropType; required?: boolean; docs?: string; /** a literal default of an optional prop */ default?: string | number | boolean }>;
  /** `class` (Svelte) / `className` (React): a prop `className` merged into the root with `cn` */
  className?: boolean;
  /** the default slot: `children` in both runtimes */
  children?: boolean;
  /** recipes (CVA-style, xgen/specs/recipes/<file>.variants.json) the view reads with the `recipe` op: local name -> file name without the extension */
  recipes?: Record<string, string>;
  /** examples: a set of prop values the component is shown with; every value of every recipe key is in one */
  examples?: Array<{ id: string; props: Record<string, string | number | boolean> }>;
  /** constant tables (a tone -> its classes); read with `at(NAME, key)` */
  consts?: Record<string, Record<string, string>>;
  /** values computed from the props, in order; later ones read earlier ones */
  derived?: Array<{ name: string; value: Value }>;
  /** render-prop slots: Svelte snippets with arguments, React functions */
  slots: Array<{ name: string; args: Array<{ name: string; type: PropType }>; docs?: string }>;
  /** callbacks: `select` becomes onselect (Svelte) and onSelect (React) */
  events: Array<{ name: string; args: Array<{ name: string; type: PropType }>; docs?: string }>;
  view: ViewNode[];
  /**
   * a frame: a part whose whole job is the landmark of a region (the section frame of the blocks, the shell header, sidebar and
   * footer). It opens on one Block with a landmark tag and is checked as a block file (the `blockRoot` zone, rule 01); any other
   * part or pattern never opens on Block
   */
  frame?: true;
  /** `vue` defaults to the Svelte flag (portableTo in xgen-spec) */
  portable: { svelte: true | { portable: false; reason: string }; react: true | { portable: false; reason: string }; vue?: true | { portable: false; reason: string } };
}

/** a value of a preset: a class string, a number (a glyph size), a list of class strings, or a group of those */
export type PresetValue = string | number | string[] | PresetGroup;
export interface PresetGroup { [key: string]: PresetValue }
/** a layout preset of a kit (specs/presets/<kit>.json): the frame geometry of the kit as named class strings, read with the `preset` op */
export interface PresetSpec { $schema?: string; specVersion: 1; id: string; name: string; docs: string; source?: string; notes?: Record<string, string>; values: PresetGroup }
/** the value at a dotted path of a preset, or undefined */
export const presetAt = (p: PresetSpec, path: string): PresetValue | undefined =>
  path.split(".").reduce<PresetValue | undefined>((v, k) => (v && typeof v === "object" && !Array.isArray(v) ? v[k] : undefined), p.values);
/** file name of a preset: defaults -> defaults */
export const presetFile = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** a recipe file: base classes, variant tables by key, defaults, compound variants */
export interface RecipeFile { id: string; base: string; keys: string[]; defaults: Record<string, string>; byKey: Record<string, Record<string, string>>; compound?: Array<Record<string, string>> }

export type Tier = "organism" | "part" | "pattern";
export const tierOf = (id: string): Tier => (id.split(".")[0] as Tier);
/** folder of the generated file: organisms are blocks, parts and patterns are components (primitives are the bricks) */
export const tierDir = (id: string): string => (tierOf(id) === "organism" ? "blocks" : "components");
/** file name of a generated component: HeroSection -> hero-section (the export keeps the PascalCase name) */
export const fileName = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();
/** path of the `.types.ts` file of another organism, from the folder of `org` */
export const typesPath = (orgId: string, other: { id: string; name: string }): string =>
  `${tierDir(orgId) === tierDir(other.id) ? "." : `../${tierDir(other.id)}`}/${fileName(other.name)}.types`;

export interface ColumnSpec { id: string; label: string; type: "text" | "money" | "number" | "badge" | "boolean"; sortable?: boolean; align?: "start" | "end" }

export interface SourceSpec { collection: string; kind: string; record: string; fields: Record<string, string> }

export interface ScreenSpec {
  $schema?: string;
  specVersion: 1;
  id: string;
  name: string;
  docs: string;
  /** "collection" (default): a list with search, sort and a pager, and a record. "page": static pages read from several collections, no list state */
  kind?: "collection" | "page";
  /** Codex collection: a fixture file of entries of one kind; `fields` flatten an entry into the record the views read */
  source?: SourceSpec;
  /** page screens: several collections, each read as an array named `as` (its record type is exported by an organism) */
  sources?: Array<SourceSpec & { as: string }>;
  list?: { columns: ColumnSpec[]; searchFields: string[]; pageSize: number; defaultSort: string };
  /** URL keys of the screen state */
  state?: { q: string; sort: string; page: string };
  routes: Array<{ path: string; area: string }>;
  /** the screen reads `nav` (see ComposedSpec.nav); the menu comes from `menu` */
  nav?: boolean;
  /** the menu of the screen (the links of its navigation bar), in order; every path is one of `routes` */
  menu?: MenuRoute[];
  organisms: string[];
  /** named pieces of the layout, each emitted as its own component file next to the screen (`BlocksScreen/ScreenHeader`) and placed
   *  with a `{ part }` node: a second landmark of the frame (the header beside the main) lives in its own file, so every file of
   *  the screen opens on one Block (rule 01). A part reads `ui`, the named values and `actions` only (not the route). */
  parts?: Record<string, ViewNode[]>;
  layout: ViewNode[];
  areas: Record<string, ViewNode[]>;
  /** page screens: every area is its own component file next to the screen (the gallery: one file per block page) */
  chunks?: boolean;
  /** page screens: named values the view reads (`TOPICS`), printed as `const TOPICS = ... as const` in the file that shows them; they read ui and the sources */
  consts?: Record<string, Value>;
  portable: OrganismSpec["portable"];
}

export interface AppSpec {
  $schema?: string;
  specVersion: 1;
  /** package name of the host app */
  name: string;
  runtime: "svelte" | "react" | "vue" | "solid";
  /** screen spec ids the host serves; `["*"]`: every screen portable to the runtime */
  screens: string[];
  title: string;
  /** port of the dev server */
  port: number;
  locale: "en";
  /** the theme a screen opens in */
  theme: "light" | "dark" | "system";
  /** extra paths the build must not overwrite (besides xgen.app.json): hand work in src/ when the host needs it */
  hand?: string[];
}

/** one entry of the menu of a screen: `#/<path>` with the dictionary text `titleKey` as its label */
export interface MenuRoute { id: string; path: string; titleKey: string; icon?: string }

/** a Codex entry as the fixtures carry it */
export interface CodexEntry {
  id: string; kind: string; status: string; visibility: string;
  slug: Record<string, string>; title: Record<string, string>;
  metadata: Record<string, { value: string | number | boolean | string[] }>;
  version: number; created_at: string; updated_at: string; published_at: string;
}
export interface CollectionFile { collection: string; kind: string; entries: CodexEntry[] }
/** a Codex v0.4 taxonomy bundle (fixtures/taxonomies/<id>.json): the definition and its terms, which entries name in `terms` */
export interface TaxonomyFile { definition: { id: string; locale: string; label: string; mode: string; assigned_to_kinds: string[] }; terms: { id: string; locale: string; taxonomy_id: string; name: string; slug: string }[] }
export type Dictionary = { [key: string]: string | Dictionary };

/** the collections a screen reads: one (`rows`) for a collection screen, the declared list for a page */
export function sourcesOf(s: ScreenSpec): Array<SourceSpec & { as: string }> {
  return s.kind === "page" ? (s.sources ?? []) : s.source ? [{ ...s.source, as: "rows" }] : [];
}

// ---- blocks and composed screens -----------------------------------------------------------------------------

/** One use of a block on a page: the block, one of its variants and the props that differ from its sample (texts, links, data) */
export interface BlockUse { block: string; variant?: string; props?: Record<string, Value> }

/**
 * A block is an organism plus the axes it varies on, named variants (rows of data: axis -> value) and the data it reads.
 * It holds no markup: the organism draws it, the variant only sets props.
 */
export interface BlockFact {
  /** CSS selector inside the variant */
  sel: string;
  /** how many elements: a number, `@collection` (entries of a fixture) or `@collection-N` */
  n?: number | string;
  /** how many distinct columns (left edges) the elements form at 1400 px */
  cols?: number | string;
  /** axis -> value or list of values; the fact holds for the variants whose row matches all */
  when?: Record<string, string | string[]>;
}

export interface BlockSpec {
  $schema?: string;
  specVersion: 1;
  /** block.hero: the part after the dot is the key of the block (route, dictionary, page use) */
  id: string;
  name: string;
  docs: string;
  /** the topic of the catalog: marketing, commerce, promo, content, account, dashboard, onboarding, support */
  theme: string;
  group: string;
  /** section: the block is a full-width section; card: a single card, shown in a narrow centered frame */
  fit?: "section" | "card";
  /** name of the organism that draws it */
  organism: string;
  /** a second organism: the variants that set `axis` to values[1] draw it (values[0] is the default); the axis is not a prop */
  alt?: { axis: string; values: [string, string]; organism: string };
  /** axis (a prop of the organism) -> the values the block exposes */
  axes: Record<string, string[]>;
  /** the value of each axis when a variant does not set it */
  defaults: Record<string, string>;
  /** what the gallery e2e must find in a variant: a selector, how many (a number, or `@collection` / `@collection-1`) and the axes that switch the fact on */
  facts?: BlockFact[];
  variants: Array<{ id: string; set: Record<string, string>; /** case copy: dictionary references and data that differ from the sample (a SaaS hero, a shop hero) */ props?: Record<string, Value> }>;
  /** patterns the organism is made of (checked against its view) */
  slots: string[];
  /** organism event -> screen action */
  events?: Record<string, string>;
  /** collections the props read: the screen gets one source per entry */
  data: Array<SourceSpec & { as: string }>;
  /** props a page gets for free: dictionary references and fixture data, used by the gallery and as the base of every use */
  sample: { props: Record<string, Value> };
}

/** the catalog of a composed screen: sections of categories, each category a list of blocks (all their variants, or the named ones), and pages made of blocks */
export interface CatalogTree {
  sections: Array<{ id: string; categories: Array<{ id: string; entries: Array<{ block: string; variants?: string[] }> }> }>;
  pages: Array<{ id: string; uses: BlockUse[] }>;
}

/** the board of the Skins screen: the skins (data-skin values, "default" first), Google fonts with Latin and Cyrillic, corner radii */
export interface SkinsBoard {
  skins: string[];
  /** a font: an id and the Google Fonts family name */
  fonts: Array<{ id: string; family: string }>;
  /** a radius: an id and a CSS length */
  radii: Array<{ id: string; value: string }>;
}

/** A screen that is a list of block uses. It expands to a page screen; `gallery` builds the areas from the catalog of blocks */
export interface ComposedSpec {
  $schema?: string;
  specVersion: 1;
  id: string;
  name: string;
  kind: "composed";
  docs: string;
  routes: Array<{ path: string; area: string }>;
  /** blocks above and below the routed area (header, footer) */
  frame: { before: BlockUse[]; after: BlockUse[] };
  areas: Record<string, BlockUse[]>;
  /** the routes and areas are the catalog of blocks: an index and one page per block with all its variants */
  gallery?: boolean;
  /** the routes and areas are the catalog: an index of sections and categories, one page per category with its blocks and variants, and full pages */
  catalog?: CatalogTree;
  /** the routes and areas are the Skins screen: rows of tiles that switch the skin, the font and the radius of the preview */
  skins?: SkinsBoard;
  /** every area is its own page file next to the screen (`ThemeMarketingLandingScreen/HomePage`); the screen keeps the routes and the frame */
  chunks?: boolean;
  /** every area must hold exactly one level 1 heading (an h1 per page) */
  requireH1?: boolean;
  /** every block of an area after the lead is named after its block and variant (`landmarkLabel`): different blocks of one page
   *  may share a heading or a nav name (the theme pages) and landmark names must stay unique */
  nameLandmarks?: boolean;
  /** the frame reads the menu: `nav.links` (from `menu`) and `nav.current` (the id of the current route) */
  nav?: boolean;
  /** the menu of the screen, in order; required when `nav` is set */
  menu?: MenuRoute[];
  portable: OrganismSpec["portable"];
}
