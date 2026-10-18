// The portable runtime of a generated app: pure TypeScript, shared by the Svelte and the React runtime.
// It holds everything a screen does that is not markup: the Codex mapping, search/sort/page, routes and the URL as a port.

export type SortDir = "asc" | "desc";
export interface ListConfig { searchFields: readonly string[]; pageSize: number; defaultSort: string }
export interface ListState { q?: string; sort?: string; page?: string }
export interface ListView<T> {
  rows: T[];
  total: number;
  page: number;
  pages: number;
  sort: { field: string; dir: SortDir };
  q: string;
  /** 1-based position of the first and the last row on the page (0 when empty) */
  from: number;
  to: number;
  /** the query string of the current list state ("?sort=price:desc&page=2" or ""), appended to links so a record keeps the list state */
  qs: string;
}

/**
 * The clock of relative dates. Fixtures are static, so the kit renders them against a fixed instant: every screen,
 * runtime and screenshot shows the same "2 min ago". A live app passes its own `now` to `fromCodex`.
 */
export const DEMO_NOW = "2026-03-30T12:00:00Z";

/** the locale of the kit's fixtures and of an entry that names none */
export const DEFAULT_LOCALE = "en";

const dateFmts = new Map<string, Intl.DateTimeFormat>();
/** an RFC 3339 date-time -> a short date in the locale, UTC ("Mar 09, 2026" in en); a value that is not a date stays as it is */
export function fmtDate(iso: unknown, locale: string = DEFAULT_LOCALE): unknown {
  const t = typeof iso === "string" ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return iso;
  let f = dateFmts.get(locale);
  if (!f) { f = new Intl.DateTimeFormat(locale, { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }); dateFmts.set(locale, f); }
  return f.format(t);
}

export type AgoStyle = "ago" | "ago-days" | "ago-short";
const isEnglish = (locale: string): boolean => /^en(-|$)/i.test(locale);
const upperFirst = (s: string, locale: string): string => s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
/** n units before now in the locale: Intl.RelativeTimeFormat (long; numeric auto, so 1 day is "yesterday" in the "ago" style) */
function relative(n: number, unit: "minute" | "hour" | "day" | "week", locale: string, style: AgoStyle): string {
  // the kit's compact English units ("2 min ago", "1 h ago", "3 d ago") stay as they were; every other form comes from Intl
  if (isEnglish(locale) && (unit === "minute" || unit === "hour" || (unit === "day" && style === "ago-short"))) return `${n} ${unit === "minute" ? "min" : unit === "hour" ? "h" : "d"} ago`;
  const numeric = style === "ago" ? "auto" : "always";
  return upperFirst(new Intl.RelativeTimeFormat(locale, { numeric, style: style === "ago-short" ? "short" : "long" }).format(-n, unit), locale);
}
/**
 * an RFC 3339 date-time -> time before `now`, in the locale (en shown):
 *   ago        "2 min ago", "1 h ago", "Yesterday", "3 days ago", "2 weeks ago"   (activity feeds)
 *   ago-days   "1 day ago", "5 days ago", "1 week ago", "2 weeks ago"            (postings)
 *   ago-short  "2 min ago", "5 h ago", "3 d ago"                                  (compact cards)
 */
export function fmtAgo(iso: unknown, now: string | number = DEMO_NOW, style: AgoStyle = "ago", locale: string = DEFAULT_LOCALE): unknown {
  const t = typeof iso === "string" ? Date.parse(iso) : NaN;
  const ref = typeof now === "number" ? now : Date.parse(now);
  if (Number.isNaN(t) || Number.isNaN(ref)) return iso;
  const min = Math.max(0, Math.round((ref - t) / 60000));
  const h = Math.floor(min / 60), d = Math.floor(min / 1440), w = Math.floor(d / 7);
  if (style === "ago-days") return d < 7 ? relative(Math.max(d, 1), "day", locale, style) : relative(w, "week", locale, style);
  if (min < 60) return relative(min, "minute", locale, style);
  if (h < 24) return relative(h, "hour", locale, style);
  if (style === "ago-short") return relative(d, "day", locale, style);
  return d < 7 ? relative(d, "day", locale, style) : relative(w, "week", locale, style);
}

/** the units a figure may carry (`metadata.unit` of the entry), as Intl unit identifiers */
const FIGURE_UNITS = ["percent", "second", "millisecond", "minute", "hour", "day", "kilobyte", "megabyte", "gigabyte"] as const;

/** a number of an entry in the locale (Intl), with its unit: (12400) -> "12,400", (99.99, percent) -> "99.99%", (0.8, second) -> "0.8s" */
export function fmtFigure(value: unknown, unit: unknown, locale: string = DEFAULT_LOCALE): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const known = typeof unit === "string" && (FIGURE_UNITS as readonly string[]).includes(unit);
  return new Intl.NumberFormat(locale, known ? { style: "unit", unit: unit as string, unitDisplay: "narrow", maximumFractionDigits: 2 } : { maximumFractionDigits: 2 }).format(value);
}

/** a count in short form, in the locale (1200 -> "1.2K", 96 -> "96"): views, likes, followers */
export function fmtCompact(value: unknown, locale: string = DEFAULT_LOCALE): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** an amount of money in integer minor units ("4820000", "USD" -> "$48,200"), in the locale; whole amounts show no cents */
export function fmtCurrency(minor: unknown, currency: string, locale: string = DEFAULT_LOCALE): string | undefined {
  if (typeof minor !== "number" || !Number.isFinite(minor)) return undefined;
  const digits = new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const value = minor / 10 ** digits;
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: Number.isInteger(value) ? 0 : digits }).format(value);
}

export interface ReadOptions {
  now?: string | number;
  /** the locale of the app; without it a date is formatted in the `locale` of its entry (then DEFAULT_LOCALE) */
  locale?: string;
  /** the entries of kind `media`: `featured_media_id|media` resolves to the `file` of the published one with that id; without it: undefined (the placeholder) */
  media?: readonly unknown[];
  /** the entries of kind `user`: `author_id|author` resolves to the `display_name` of the one with that id; without it: undefined */
  users?: readonly unknown[];
  /** the Codex terms (of every taxonomy): `terms|term:<taxonomy>` resolves to the `name` of the entry's first term of that taxonomy; without it: undefined */
  terms?: readonly unknown[];
  /** the entries of kind `menu_item` that sit under another (parent_id): `id|menu` lists the children of an item as NavLink
   *  records { id, name, icon, href } in their `order`; without it: [] */
  menus?: readonly unknown[];
  /** the address of an entry by its kind, with `{slug}`: `{ product: "#/product/{slug}" }`; `slug|route` builds it; without a route: undefined (no link) */
  routes?: Readonly<Record<string, string>>;
}

const field = (o: unknown, k: string): unknown => (o !== null && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined);

/** a record is keyed by (id, locale): of the records with one id, the one in the locale, else the first */
const byLocale = (records: readonly unknown[], locale: string): unknown => records.find((r) => field(r, "locale") === locale) ?? records[0];

/**
 * a value by a dotted path, with an optional formatter after a pipe:
 *   "metadata.date.value|date"  -> fmtDate      "metadata.time.value|ago" (or ago-days, ago-short) -> fmtAgo   (in the locale)
 *   "featured_media_id|media"   -> the file of that media entry      "slug|route" -> the address from the route of the entry's kind
 *   "author_id|author"          -> the display name of that user     "terms|term:category" -> the name of the entry's term of that taxonomy
 *   "terms|term-slug:faq_category" -> the slug of that term (a filter key)
 *   "metadata.value.value|number" -> the number in the locale, with the entry's `metadata.unit` (percent, second): 12400 -> "12,400"
 *   "metadata.views.value|compact" -> the count in short form: 1200 -> "1.2K"
 *   "id|menu"                   -> the menu items under this one (parent_id), as { id, name, icon, href } (href only with a route)
 */
export function readPath(source: unknown, path: string, opts: ReadOptions = {}): unknown {
  const [dotted, pipe] = path.split("|") as [string, string | undefined];
  let cur: unknown = source;
  for (const part of dotted.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  if (pipe === undefined || cur === undefined) return cur;
  const own = field(source, "locale");
  const locale = opts.locale ?? (typeof own === "string" ? own : DEFAULT_LOCALE);
  if (pipe === "date") return fmtDate(cur, locale);
  if (pipe === "ago" || pipe === "ago-days" || pipe === "ago-short") return fmtAgo(cur, opts.now ?? DEMO_NOW, pipe, locale);
  // a media entry with no uploaded asset is a draft: no file, the block shows its placeholder
  if (pipe === "media") return field(field(field((opts.media ?? []).find((m) => field(m, "id") === cur && field(m, "status") === "published"), "metadata"), "file"), "value");
  if (pipe === "author") {
    const user = byLocale((opts.users ?? []).filter((u) => field(u, "id") === cur), locale);
    return field(field(field(user, "metadata"), "display_name"), "value") ?? field(user, "title");
  }
  if (pipe === "number") {
    const currency = field(field(field(source, "metadata"), "currency"), "value");
    return typeof currency === "string" ? fmtCurrency(cur, currency, locale) : fmtFigure(cur, field(field(field(source, "metadata"), "unit"), "value"), locale);
  }
  if (pipe === "compact") return fmtCompact(cur, locale);
  if (pipe.startsWith("term:") || pipe.startsWith("term-slug:")) {
    const taxonomy = pipe.slice(pipe.indexOf(":") + 1);
    const ref = Array.isArray(cur) ? cur.find((r) => field(r, "taxonomy") === taxonomy) : undefined;
    if (ref === undefined) return undefined;
    const term = byLocale((opts.terms ?? []).filter((t) => field(t, "taxonomy_id") === taxonomy && field(t, "id") === field(ref, "term_id")), locale);
    return field(term, pipe.startsWith("term-slug:") ? "slug" : "name");
  }
  if (pipe === "menu") {
    const kids = (opts.menus ?? []).filter((m) => field(m, "parent_id") === cur);
    const order = (m: unknown): number => { const o = field(m, "order"); return typeof o === "number" ? o : 0; };
    return [...kids].sort((a, b) => order(a) - order(b)).map((m) => ({
      id: field(m, "id"), name: field(m, "title"), icon: field(field(field(m, "metadata"), "icon"), "value"), href: readPath(m, "slug|route", opts),
    }));
  }
  if (pipe === "route") {
    const kind = field(source, "kind"), route = typeof kind === "string" ? opts.routes?.[kind] : undefined;
    return route === undefined ? undefined : route.replace("{slug}", encodeURIComponent(String(cur)));
  }
  throw new Error(`readPath: unknown formatter "${pipe}" in "${path}"`);
}

/** the trail of pages from the root to `leaf` by their parent_id chain (breadcrumbs); without `leaf`, the one no other names as parent */
export function trail<T>(entries: readonly T[], leaf?: string): T[] {
  const byId = new Map(entries.map((e) => [field(e, "id"), e] as const));
  const parents = new Set(entries.map((e) => field(e, "parent_id")));
  let cur: T | undefined = leaf !== undefined ? byId.get(leaf) : entries.find((e) => !parents.has(field(e, "id")));
  const out: T[] = [];
  while (cur !== undefined && !out.includes(cur)) { out.unshift(cur); cur = byId.get(field(cur, "parent_id")); }
  return out;
}

/** Codex entries -> flat records by the `fields` mapping of the screen ("title", "metadata.price.value", "metadata.date.value|date") */
export function fromCodex<T>(entries: readonly unknown[], fields: Record<string, string>, opts: ReadOptions = {}): T[] {
  return entries.map((e) => Object.fromEntries(Object.entries(fields).map(([name, path]) => [name, readPath(e, path, opts)])) as T);
}

export function parseSort(sort: string | undefined, fallback: string): { field: string; dir: SortDir } {
  const [field, dir] = (sort || fallback).split(":");
  return { field: field || fallback.split(":")[0]!, dir: dir === "desc" ? "desc" : "asc" };
}

const compare = (a: unknown, b: unknown): number => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a ?? "").localeCompare(String(b ?? ""), "en", { numeric: true, sensitivity: "base" });
};

export function listQuery(state: { q: string; sort: string; page: number }, cfg: ListConfig): string {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.sort && state.sort !== cfg.defaultSort) p.set("sort", state.sort);
  if (state.page > 1) p.set("page", String(state.page));
  const s = p.toString().replace(/%3A/gi, ":");
  return s ? `?${s}` : "";
}

export function collectionView<T extends object>(all: readonly T[], cfg: ListConfig, state: ListState): ListView<T> {
  const q = (state.q ?? "").trim();
  const sort = parseSort(state.sort, cfg.defaultSort);
  const needle = q.toLowerCase();
  const found = needle ? all.filter((r) => cfg.searchFields.some((f) => String((r as Record<string, unknown>)[f] ?? "").toLowerCase().includes(needle))) : [...all];
  const sign = sort.dir === "desc" ? -1 : 1;
  found.sort((a, b) => sign * compare((a as Record<string, unknown>)[sort.field], (b as Record<string, unknown>)[sort.field]));
  const total = found.length;
  const pages = Math.max(1, Math.ceil(total / cfg.pageSize));
  const page = Math.min(Math.max(1, Math.floor(Number(state.page)) || 1), pages);
  const start = (page - 1) * cfg.pageSize;
  const rows = found.slice(start, start + cfg.pageSize);
  return {
    rows, total, page, pages, sort, q,
    from: total ? start + 1 : 0,
    to: start + rows.length,
    qs: listQuery({ q, sort: `${sort.field}:${sort.dir}`, page }, cfg),
  };
}

// ---- routes -----------------------------------------------------------------------------------------------

export interface RouteDef { path: string; area: string }
export interface RouteMatch { area: string; params: Record<string, string> }

export function matchRoute(routes: readonly RouteDef[], path: string): RouteMatch | null {
  const parts = path.split("/").filter(Boolean);
  for (const r of routes) {
    const pat = r.path.split("/").filter(Boolean);
    if (pat.length !== parts.length) continue;
    const params: Record<string, string> = {};
    if (pat.every((seg, i) => (seg.startsWith(":") ? ((params[seg.slice(1)] = decodeURIComponent(parts[i]!)), true) : seg === parts[i]))) return { area: r.area, params };
  }
  return null;
}

/** does a route of this list own the path (decides which screen of an app shows) */
export const ownsPath = (routes: readonly RouteDef[], path: string): boolean => matchRoute(routes, path) !== null;

// ---- the URL as a port --------------------------------------------------------------------------------------
// A screen never touches window.location. It gets a UrlPort: Svelte wraps the store in runes, React in useSyncExternalStore.

export interface UrlState { path: string; query: Record<string, string> }
export interface UrlPort extends UrlState { go(path: string, query?: Record<string, string | undefined>): void }

/** `#/pricing` and the empty hash are routes; `#main-content` is an in-page anchor (the skip link) and leaves the route alone */
export const isRouteHash = (hash: string): boolean => hash === "" || hash === "#" || hash.startsWith("#/");

export function parseHash(hash: string): UrlState {
  const raw = hash.replace(/^#\/?/, "");
  const [path = "", search = ""] = raw.split("?");
  const query: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(search)) query[k] = v;
  return { path: path.replace(/\/+$/, ""), query };
}

export function buildHash(path: string, query: Record<string, string | undefined> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") p.set(k, v);
  const s = p.toString().replace(/%3A/gi, ":");
  return `#/${path}${s ? `?${s}` : ""}`;
}

export interface HashStore { getSnapshot(): UrlState; subscribe(fn: () => void): () => void; go: UrlPort["go"] }

/** the URL state in location.hash; the snapshot object changes only when the hash changes (useSyncExternalStore needs that) */
export function createHashStore(win: Window = window): HashStore {
  let hash = win.location.hash;
  let snap = parseHash(isRouteHash(hash) ? hash : "");
  const subs = new Set<() => void>();
  const read = (): void => {
    if (win.location.hash === hash) return;
    hash = win.location.hash;
    if (!isRouteHash(hash)) return;
    snap = parseHash(hash);
    subs.forEach((f) => f());
  };
  win.addEventListener("hashchange", read);
  return {
    getSnapshot: () => snap,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    go(path, query) { win.location.hash = buildHash(path, query); read(); },
  };
}

// ---- screen actions ---------------------------------------------------------------------------------------

export interface ScreenActions {
  sort(field: string): void;
  search(q: string): void;
  page(n: number): void;
  open(id: string): void;
  back(): void;
  toggleTheme(): void;
}

/** the actions of a collection screen; every one of them only changes the URL */
export function screenActions(url: UrlPort, view: ListView<object>, listPath: string, recordPath: (id: string) => string, toggleTheme: () => void): ScreenActions {
  const q = (extra: Record<string, string | undefined>): Record<string, string | undefined> => ({ ...url.query, ...extra });
  return {
    sort(field) {
      const dir: SortDir = view.sort.field === field && view.sort.dir === "asc" ? "desc" : "asc";
      url.go(listPath, q({ sort: `${field}:${dir}`, page: undefined }));
    },
    search(text) { url.go(listPath, q({ q: text || undefined, page: undefined })); },
    page(n) { url.go(listPath, q({ page: n > 1 ? String(n) : undefined })); },
    open(id) { url.go(recordPath(id), url.query); },
    back() { url.go(listPath, url.query); },
    toggleTheme,
  };
}
