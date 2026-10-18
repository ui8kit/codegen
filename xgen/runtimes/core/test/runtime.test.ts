import { expect, test } from "bun:test";
import { isRouteHash, buildHash, collectionView, fromCodex, matchRoute, parseHash, parseSort, screenActions, type UrlPort } from "../assets/app/core";
import { at, fmtMoney, fmtNumber, tpl } from "../assets/ts/format";

const rows = [
  { name: "Beta", price: 20, tagline: "second" },
  { name: "Alpha", price: 30, tagline: "first" },
  { name: "Gamma", price: 10, tagline: "third" },
  { name: "Delta", price: 5, tagline: "alpha again" },
];
const cfg = { searchFields: ["name", "tagline"], pageSize: 3, defaultSort: "price:asc" } as const;

test("collectionView sorts, searches and pages", () => {
  const v = collectionView(rows, cfg, {});
  expect(v.rows.map((r) => r.name)).toEqual(["Delta", "Gamma", "Beta"]);
  expect([v.total, v.page, v.pages, v.from, v.to]).toEqual([4, 1, 2, 1, 3]);
  expect(collectionView(rows, cfg, { sort: "name:desc" }).rows.map((r) => r.name)).toEqual(["Gamma", "Delta", "Beta"]);
  expect(collectionView(rows, cfg, { q: "ALPHA" }).rows.map((r) => r.name)).toEqual(["Delta", "Alpha"]);
  const p2 = collectionView(rows, cfg, { page: "2" });
  expect(p2.rows.map((r) => r.name)).toEqual(["Alpha"]);
  expect(p2.qs).toBe("?page=2");
  expect(collectionView(rows, cfg, { page: "99" }).page).toBe(2);
  expect(collectionView(rows, cfg, { q: "zzz" })).toMatchObject({ total: 0, from: 0, to: 0, pages: 1 });
});

test("the query string keeps only what differs from the defaults", () => {
  expect(collectionView(rows, cfg, { sort: "price:asc" }).qs).toBe("");
  expect(collectionView(rows, cfg, { sort: "name:desc", q: "a" }).qs).toBe("?q=a&sort=name:desc");
  expect(parseSort(undefined, "price:asc")).toEqual({ field: "price", dir: "asc" });
});

test("fromCodex flattens entries by path", () => {
  const out = fromCodex<{ title: string; price: number }>([{ title: "X", locale: "en", metadata: { price: { value: 7 } } }], { title: "title", price: "metadata.price.value" });
  expect(out).toEqual([{ title: "X", price: 7 }]);
});

test("routes match with params", () => {
  const routes = [{ path: "plans", area: "list" }, { path: "plans/:id", area: "record" }];
  expect(matchRoute(routes, "plans")).toEqual({ area: "list", params: {} });
  expect(matchRoute(routes, "plans/a%20b")).toEqual({ area: "record", params: { id: "a b" } });
  expect(matchRoute(routes, "other")).toBeNull();
});

test("hash parse and build round-trip", () => {
  const h = buildHash("plans", { sort: "price:desc", page: undefined, q: "a b" });
  expect(h).toBe("#/plans?sort=price:desc&q=a+b");
  expect(parseHash(h)).toEqual({ path: "plans", query: { sort: "price:desc", q: "a b" } });
  expect(parseHash("")).toEqual({ path: "", query: {} });
  expect([isRouteHash(""), isRouteHash("#/pricing"), isRouteHash("#main-content")]).toEqual([true, true, false]);
});

test("screen actions only change the URL and keep the list state", () => {
  const calls: Array<[string, Record<string, string | undefined> | undefined]> = [];
  const url: UrlPort = { path: "plans", query: { sort: "name:asc" }, go: (p, q) => calls.push([p, q]) };
  const view = collectionView(rows, cfg, { sort: "name:asc" });
  const a = screenActions(url, view, "plans", (id) => `plans/${id}`, () => {});
  a.sort("name");
  a.search("x");
  a.page(2);
  a.open("p1");
  a.back();
  expect(calls).toEqual([
    ["plans", { sort: "name:desc", page: undefined }],
    ["plans", { sort: "name:asc", q: "x", page: undefined }],
    ["plans", { sort: "name:asc", page: "2" }],
    ["plans/p1", { sort: "name:asc" }],
    ["plans", { sort: "name:asc" }],
  ]);
});

test("formatters", () => {
  expect(tpl("{0} of {1}", 2, 5)).toBe("2 of 5");
  expect(fmtMoney(149900, "USD")).toBe("$1,499");
  expect(fmtMoney(1250, "USD")).toBe("$12.50");
  expect(fmtMoney(5, "EUR")).toBe("€0.05");
  expect(fmtMoney(-2500, "USD")).toBe("-$25");
  expect(fmtMoney(1500, "JPY")).toBe("¥1,500");
  expect(fmtNumber(12000)).toBe("12,000");
  expect(at({ a: "A" }, "a")).toBe("A");
  expect(at({ a: "A" }, "b")).toBe("b");
});

test("uniqLabel drops a segment equal to the one before it", async () => {
  const { uniqLabel } = await import("../assets/ts/format");
  expect(uniqLabel("Footer, Footer, Centered")).toBe("Footer, Centered");
  expect(uniqLabel("Main navigation, main navigation, Bar")).toBe("Main navigation, Bar");
  expect(uniqLabel("Footer, Centered, Footer")).toBe("Footer, Centered, Footer");
  expect(uniqLabel(undefined)).toBe("");
});

test("dates: absolute, relative against the demo clock, pipes in field paths", async () => {
  const { fmtDate, fmtAgo, readPath, DEMO_NOW } = await import("../assets/app/core");
  expect(fmtDate("2026-03-09T10:00:00Z")).toBe("Mar 09, 2026");
  expect(fmtDate("not a date")).toBe("not a date");
  const before = (min: number) => new Date(Date.parse(DEMO_NOW) - min * 60000).toISOString();
  expect([2, 60, 1440, 2880, 20160].map((m) => fmtAgo(before(m)))).toEqual(["2 min ago", "1 h ago", "Yesterday", "2 days ago", "2 weeks ago"]);
  expect([1440, 7200, 10080].map((m) => fmtAgo(before(m), DEMO_NOW, "ago-days"))).toEqual(["1 day ago", "5 days ago", "1 week ago"]);
  expect([300, 4320].map((m) => fmtAgo(before(m), DEMO_NOW, "ago-short"))).toEqual(["5 h ago", "3 d ago"]);
  const e = { metadata: { date: { value: "2026-03-18T10:00:00Z" } } };
  expect(readPath(e, "metadata.date.value|date")).toBe("Mar 18, 2026");
  expect(readPath(e, "metadata.date.value|ago", { now: "2026-03-18T10:05:00Z" })).toBe("5 min ago");
  expect(readPath(e, "metadata.nope.value|date")).toBeUndefined();
  expect(() => readPath(e, "metadata.date.value|weird")).toThrow();
});

test("locale: dates and relative times follow the entry's locale (or the app's), en stays as it was", async () => {
  const { fmtDate, fmtAgo, readPath, DEMO_NOW } = await import("../assets/app/core");
  const iso = "2026-03-09T10:00:00Z";
  expect(fmtDate(iso, "de")).toBe(new Intl.DateTimeFormat("de", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(Date.parse(iso)));
  expect(fmtDate(iso, "en-US")).toBe("Mar 09, 2026");
  const before = (min: number) => new Date(Date.parse(DEMO_NOW) - min * 60000).toISOString();
  const rt = (loc: string, n: number, u: Intl.RelativeTimeFormatUnit, numeric: "auto" | "always" = "auto") => { const s = new Intl.RelativeTimeFormat(loc, { numeric }).format(-n, u); return s.charAt(0).toLocaleUpperCase(loc) + s.slice(1); };
  expect(fmtAgo(before(2), DEMO_NOW, "ago", "de")).toBe(rt("de", 2, "minute"));
  expect(fmtAgo(before(1440), DEMO_NOW, "ago", "de")).toBe(rt("de", 1, "day"));
  expect(fmtAgo(before(7200), DEMO_NOW, "ago-days", "fr")).toBe(rt("fr", 5, "day", "always"));
  const e = { locale: "de", metadata: { date: { value: "2026-03-18T10:00:00Z" } } };
  expect(readPath(e, "metadata.date.value|date")).toBe(fmtDate("2026-03-18T10:00:00Z", "de"));
  expect(readPath(e, "metadata.date.value|date", { locale: "en" })).toBe("Mar 18, 2026");
});

test("media and routes: an image from featured_media_id, a link from the slug, nothing without them", async () => {
  const { readPath, fromCodex } = await import("../assets/app/core");
  const media = [{ id: "media-a", kind: "media", status: "published", metadata: { file: { value: "/media/a.webp" } } }];
  const e = { id: "p", kind: "product", slug: "arc lamp", featured_media_id: "media-a" };
  expect(readPath(e, "featured_media_id|media", { media })).toBe("/media/a.webp");
  expect(readPath(e, "featured_media_id|media")).toBeUndefined();
  expect(readPath({ ...e, featured_media_id: "media-x" }, "featured_media_id|media", { media })).toBeUndefined();
  expect(readPath(e, "slug|route", { routes: { product: "#/product/{slug}" } })).toBe("#/product/arc%20lamp");
  expect(readPath(e, "slug|route", { routes: { post: "#/post/{slug}" } })).toBeUndefined();
  expect(fromCodex([e], { href: "slug|route", image: "featured_media_id|media" })).toEqual([{ href: undefined, image: undefined }]);
  // a draft media entry (no uploaded asset) gives no file: the placeholder
  expect(readPath(e, "featured_media_id|media", { media: [{ ...media[0], status: "draft" }] })).toBeUndefined();
});

test("authors and terms: author_id prints the user's display name, terms|term:<taxonomy> the name of the term, by locale", async () => {
  const { readPath } = await import("../assets/app/core");
  const users = [{ id: "user-a", locale: "en", kind: "user", title: "a", metadata: { display_name: { value: "Ann Lee" } } }];
  const terms = [
    { id: "category-design", locale: "en", taxonomy_id: "category", name: "Design", slug: "design" },
    { id: "category-design", locale: "de", taxonomy_id: "category", name: "Gestaltung", slug: "gestaltung" },
    { id: "tag-x", locale: "en", taxonomy_id: "tag", name: "X", slug: "x" },
  ];
  const e = { id: "p", locale: "en", kind: "post", author_id: "user-a", terms: [{ taxonomy: "tag", term_id: "tag-x" }, { taxonomy: "category", term_id: "category-design" }] };
  expect(readPath(e, "author_id|author", { users })).toBe("Ann Lee");
  expect(readPath(e, "author_id|author", { users: [{ ...users[0], metadata: {} }] })).toBe("a");
  expect(readPath(e, "author_id|author")).toBeUndefined();
  expect(readPath(e, "terms|term:category", { terms })).toBe("Design");
  expect(readPath({ ...e, locale: "de" }, "terms|term:category", { terms })).toBe("Gestaltung");
  expect(readPath(e, "terms|term:tag", { terms })).toBe("X");
  expect(readPath(e, "terms|term:brand", { terms })).toBeUndefined();
  expect(readPath(e, "terms|term:category")).toBeUndefined();
});

test("figures, term slugs and trails: |number formats by locale with the unit, |term-slug: gives the slug, trail() follows parent_id", async () => {
  const { readPath, trail } = await import("../assets/app/core");
  const stat = (value: unknown, unit?: string) => ({ id: "s", locale: "en", kind: "stat", metadata: { value: { value }, ...(unit ? { unit: { value: unit } } : {}) } });
  expect(readPath(stat(12400), "metadata.value.value|number")).toBe("12,400");
  expect(readPath(stat(99.99, "percent"), "metadata.value.value|number")).toBe("99.99%");
  expect(readPath(stat(0.8, "second"), "metadata.value.value|number")).toBe("0.8s");
  expect(readPath(stat(12400), "metadata.value.value|number", { locale: "de" })).toBe("12.400");
  // |compact: a count in short form (template views and likes)
  expect(readPath({ metadata: { views: { value: 1200 } } }, "metadata.views.value|compact")).toBe("1.2K");
  expect(readPath({ metadata: { views: { value: 96 } } }, "metadata.views.value|compact")).toBe("96");
  expect(readPath(stat("12,400"), "metadata.value.value|number")).toBeUndefined();
  const terms = [{ id: "faq-category-billing", locale: "en", taxonomy_id: "faq_category", name: "Billing", slug: "billing" }];
  expect(readPath({ id: "f", locale: "en", terms: [{ taxonomy: "faq_category", term_id: "faq-category-billing" }] }, "terms|term-slug:faq_category", { terms })).toBe("billing");
  const pages = [{ id: "c", parent_id: "b" }, { id: "a" }, { id: "b", parent_id: "a" }, { id: "x", parent_id: "a" }];
  expect(trail(pages, "c").map((p) => p.id)).toEqual(["a", "b", "c"]);
  expect(trail(pages.slice(0, 3)).map((p) => p.id)).toEqual(["a", "b", "c"]);
});
