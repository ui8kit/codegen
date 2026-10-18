// The catalog: the blocks of the kit grouped by a tree of sections and categories (Marketing > Team), one page per category with
// its blocks and their variants drawn on the fixtures, and full pages composed of blocks (a store home, a checkout). The tree is data
// (`ComposedSpec.catalog`); this file turns it into routes and areas, like the gallery.
import { call, each, op, ref, text, use, tpl } from "./build";
import type { BlockSpec, CatalogTree, OrganismSpec, ScreenSpec, Value, ViewNode } from "./ir";
import { blockKey, dictKey, expandUse, hoistShared, labelledGroup, pageSection, skipLink, TEXT, variantSection, type OrganismNode } from "./compose-kit";
import { wide } from "./authoring/components/frames";
import { navBlockOf } from "./authoring/components/landmarks";

const CARD = "flex flex-col gap-2 rounded p-4 inset-ring inset-ring-border";
const page = (...children: ViewNode[]): ViewNode => pageSection(use("Container", { props: { Class: `${wide} py-10` } }, use("Stack", { props: { Gap: "8", Align: "stretch" } }, ...children)));
const head = (eyebrow: Value | null, title: Value, intro: Value, testid: string): ViewNode =>
  use("Stack", { props: { Gap: "2", Align: "stretch" } },
    ...(eyebrow ? [use("Text", { props: { Size: "sm", Class: "font-medium text-muted-foreground" }, attrs: { "data-testid": "catalog-eyebrow" } }, text(eyebrow))] : []),
    use("Title", { props: { As: 1, Size: "4xl", Weight: "bold" }, attrs: { "data-testid": testid } }, text(title)),
    use("Text", { props: { Class: "max-w-2xl text-muted-foreground" } }, text(intro)));
const back = (href: string, label: string): ViewNode => use("Group", {}, use("Link", { props: { Href: href, Variant: "default" }, attrs: { "data-testid": "back" } }, text(TEXT(label))));

/** the variants of a block a category shows: the named ones, in the order of the block */
const variantsOf = (b: BlockSpec, names?: string[]): BlockSpec["variants"] => (names ? b.variants.filter((v) => names.includes(v.id)) : b.variants);

export function catalog(tree: CatalogTree, blocks: BlockSpec[], org: Record<string, OrganismSpec>, problems: string[], where: string): { areas: Record<string, ViewNode[]>; routes: ScreenSpec["routes"]; consts: Record<string, Value>; used: BlockSpec[] } {
  const byKey = new Map(blocks.map((b) => [blockKey(b), b]));
  const used = new Set<BlockSpec>();
  const routes: ScreenSpec["routes"] = [{ path: "", area: "index" }, { path: "pages", area: "pages" }];
  const areas: Record<string, ViewNode[]> = {};
  const consts: Record<string, Value> = {};
  const seen = new Set<string>();
  const hoisted = new Set<string>();
  const sections = tree.sections.map((s) => ({
    id: s.id, titleId: `section-${s.id}-title`, title: TEXT(`catalog.sections.${s.id}.title`), text: TEXT(`catalog.sections.${s.id}.text`),
    categories: s.categories.map((c) => {
      if (seen.has(c.id) || c.id === "pages" || c.id.startsWith("page-")) problems.push(`${where}: category id ${c.id} is taken`);
      seen.add(c.id);
      const shown: Array<{ b: BlockSpec; vs: BlockSpec["variants"] }> = [];
      for (const e of c.entries) {
        const b = byKey.get(e.block);
        if (!b) { problems.push(`${where}: category ${c.id} names no block ${e.block}`); continue; }
        for (const v of e.variants ?? []) if (!b.variants.some((x) => x.id === v)) problems.push(`${where}: category ${c.id}: block ${e.block} has no variant ${v}`);
        if (shown.some((x) => x.b === b)) problems.push(`${where}: category ${c.id} lists ${e.block} twice`);
        shown.push({ b, vs: variantsOf(b, e.variants) });
        used.add(b);
      }
      const count = shown.reduce((n, x) => n + x.vs.length, 0);
      routes.push({ path: c.id, area: c.id });
      areas[c.id] = [page(
        back("#/", "catalog.back"),
        head(TEXT(`catalog.sections.${s.id}.title`), TEXT(`catalog.categories.${dictKey(c.id)}`), tpl(TEXT("catalog.count"), shown.length, count), "category-title"),
        ...shown.map(({ b, vs }) => {
          const key = blockKey(b);
          const drawn: OrganismNode[] = [];
          const node = labelledGroup("6", `catalog-${key}-title`, { "data-testid": "catalog-block", "data-block": key },
            use("Stack", { props: { Gap: "2", Align: "stretch" } },
              use("Title", { props: { As: 2, Size: "2xl", Weight: "bold" }, attrs: { id: `catalog-${key}-title` } }, text(TEXT(`blocks.names.${key}`))),
              use("Text", { props: { Size: "sm", Class: "max-w-2xl text-muted-foreground" } }, text(TEXT(`blocks.docs.${key}`)))),
            ...vs.map((v) => variantSection(b, v, org, drawn, 3)));
          // a block shown in two categories names its shared values after the second category
          hoistShared(b, drawn, consts, hoisted.has(key) ? `${c.id}_${key}` : key);
          hoisted.add(key);
          return node;
        }))];
      return { id: c.id, href: `#/${c.id}`, name: TEXT(`catalog.categories.${dictKey(c.id)}`), blocks: shown.length, variants: count };
    }),
  }));
  // every variant of every block is in at least one category: the catalog is the whole kit
  for (const b of blocks) for (const v of b.variants) {
    const listed = tree.sections.some((s) => s.categories.some((c) => c.entries.some((e) => e.block === blockKey(b) && (!e.variants || e.variants.includes(v.id)))));
    if (!listed) problems.push(`${where}: ${blockKey(b)}.${v.id} is in no category`);
  }
  const pages = tree.pages.map((p) => {
    const id = `page-${p.id}`;
    routes.push({ path: id, area: id });
    const out = p.uses.map((u, i) => expandUse(u, blocks, org, `${where}.pages.${p.id}[${i}]`, `${p.id}-${u.block}${p.uses.filter((x) => x.block === u.block).length > 1 ? `-${i}` : ""}`, problems, p.uses.filter((x) => x.block === u.block).length > 1));
    for (const u of p.uses) { const b = byKey.get(u.block); if (b) used.add(b); }
    if (out.filter((x) => x.h1).length !== 1) problems.push(`${where}: page ${p.id} needs exactly one level 1 heading (found ${out.filter((x) => x.h1).length})`);
    areas[id] = [
      use("Block", { props: { Tag: "div", Class: "border-b border-border bg-muted" }, attrs: { "data-testid": "page-bar" } },
        use("Container", { props: { Class: `${wide} flex flex-wrap items-center justify-between gap-4 py-2` } },
          use("Link", { props: { Href: "#/pages", Variant: "default", Class: "text-sm" }, attrs: { "data-testid": "back" } }, text(TEXT("catalog.backPages"))),
          use("Text", { props: { Size: "sm", Class: "text-muted-foreground" }, attrs: { "data-testid": "page-name" } }, text(TEXT(`catalog.pages.${dictKey(p.id)}.title`))))),
      use("Box", { props: { Class: "flex flex-col" }, attrs: { "data-testid": "page-body", "data-page": p.id } }, ...out.flatMap((x) => x.nodes)),
    ];
    return { id: p.id, visit: id, href: `#/${id}`, name: TEXT(`catalog.pages.${dictKey(p.id)}.title`), text: TEXT(`catalog.pages.${dictKey(p.id)}.text`), blocks: p.uses.length };
  });
  consts["CATALOG"] = op("list", ...sections.map((s) => ({ ...s, categories: op("list", ...s.categories) })));
  consts["PAGES"] = op("list", ...pages);
  const categoryCard = use("ListItem", { props: { Class: CARD } },
    use("Link", { props: { Href: ref("cat.href"), Variant: "default", Class: "font-bold" }, attrs: { "data-testid": "category-link", "data-category": ref("cat.id"), "data-visit": ref("cat.id") } }, text(ref("cat.name"))),
    use("Text", { props: { Size: "sm", Class: "text-muted-foreground" }, attrs: { "data-testid": "category-count" } }, text(tpl(TEXT("catalog.count"), ref("cat.blocks"), ref("cat.variants")))));
  const pageCard = use("ListItem", { props: { Class: CARD } },
    use("Link", { props: { Href: ref("p.href"), Variant: "default", Class: "font-bold" }, attrs: { "data-testid": "page-link", "data-page": ref("p.id"), "data-visit": ref("p.visit") } }, text(ref("p.name"))),
    use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("p.text"))),
    use("Text", { props: { Size: "xs", Class: "text-muted-foreground" }, attrs: { "data-testid": "page-count" } }, text(tpl(TEXT("catalog.pageCount"), ref("p.blocks")))));
  const grid = (testid: string, ...body: ViewNode[]): ViewNode => use("List", { props: { Tag: "ul", Class: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" }, attrs: { "data-testid": testid } }, ...body);
  const pagesSection = (h: 1 | 2): ViewNode => labelledGroup("4", `pages-title-${h}`, { "data-testid": "pages-section" },
    use("Stack", { props: { Gap: "2", Align: "stretch" } },
      use("Title", { props: { As: 2, Size: "2xl", Weight: "bold" }, attrs: { id: `pages-title-${h}` } }, text(TEXT("catalog.pagesTitle"))),
      use("Text", { props: { Size: "sm", Class: "max-w-2xl text-muted-foreground" } }, text(TEXT("catalog.pagesText")))),
    grid("page-list", each(ref("PAGES"), "p", ref("p.id"), pageCard)));
  areas["index"] = [page(
    head(null, TEXT("catalog.title"), TEXT("catalog.intro"), "catalog-title"),
    each(ref("CATALOG"), "section", ref("section.id"),
      labelledGroup("4", ref("section.titleId"), { "data-testid": "catalog-section", "data-section": ref("section.id") },
        use("Stack", { props: { Gap: "2", Align: "stretch" } },
          use("Title", { props: { As: 2, Size: "2xl", Weight: "bold" }, attrs: { id: ref("section.titleId") } }, text(ref("section.title"))),
          use("Text", { props: { Size: "sm", Class: "max-w-2xl text-muted-foreground" } }, text(ref("section.text")))),
        grid("category-list", each(ref("section.categories"), "cat", ref("cat.id"), categoryCard)))),
    pagesSection(2))];
  areas["pages"] = [page(back("#/", "catalog.back"), head(null, TEXT("catalog.pagesTitle"), TEXT("catalog.pagesText"), "pages-title"), grid("page-list", each(ref("PAGES"), "p", ref("p.id"), pageCard)))];
  areas["notfound"] = [page(
    use("Title", { props: { As: 1, Size: "4xl", Weight: "bold" } }, text(TEXT("site.notFound.title"))),
    use("Group", {}, use("Button", { props: { Variant: "default", Size: "default", Href: "#/" } }, text(TEXT("catalog.back")))))];
  return { areas, routes, consts, used: [...used] };
}

/** the header part of the catalog: the skip link, the brand, the tabs (categories, pages), links to the block gallery, the Skins screen and the Discovery panorama, and the theme button */
export function catalogChrome(): ViewNode[] {
  const tab = (href: string, key: string, testid: string): ViewNode => use("Link", { props: { Href: href, Variant: "default", Class: "text-sm font-medium" }, attrs: { "data-testid": testid } }, text(TEXT(key)));
  return [
    use("Block", { props: { Tag: "header", Class: "border-b border-border" } },
      skipLink("sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow"),
      use("Container", { props: { Class: `${wide} flex flex-wrap items-center justify-between gap-4 py-3` } },
        use("Link", { props: { Href: "#/", Variant: "default", Class: "text-lg font-bold" }, attrs: { "data-testid": "brand" } }, text(TEXT("catalog.title"))),
        navBlockOf(TEXT("catalog.navLabel"), "flex flex-wrap items-center gap-4", undefined,
          tab("#/", "catalog.categoriesTab", "tab-categories"), tab("#/pages", "catalog.pagesTitle", "tab-pages"), tab("/blocks/", "blocks.title", "gallery-link"), tab("/skins/", "skins.title", "skins-link"), tab("/discovery/", "discovery.title", "discovery-link"),
          use("Button", { props: { Variant: "outline", Size: "sm" }, on: { click: call("actions.toggleTheme") }, attrs: { "data-testid": "theme-toggle" } }, text(TEXT("theme.toggle")))))),
  ];
}
