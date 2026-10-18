// Composed screens: a page that is a list of block uses. The expansion turns it into an ordinary page screen
// (organism nodes with the axes of the variant as literal props), so the emitters, the validators and the drift check see one thing.
import { call, each, op, ref, text, use, outlet, part } from "./build";
import { type BlockSpec, type BlockUse, type ComposedSpec, type OrganismSpec, type ScreenSpec, type Value, type ViewNode } from "./ir";
import { blockKey, blockNode, drawnBy, expandUse, galleryOf, hoistShared, labelledGroup, pageSection, skipLink, TEXT, THEMES, variantSection, type OrganismNode } from "./compose-kit";
export * from "./compose-kit";

function sourcesOfBlocks(used: BlockSpec[], problems: string[], where: string): NonNullable<ScreenSpec["sources"]> {
  const out: NonNullable<ScreenSpec["sources"]> = [];
  for (const b of used) for (const d of b.data) {
    const have = out.find((x) => x.as === d.as);
    if (!have) out.push({ as: d.as, collection: d.collection, kind: d.kind, record: d.record, fields: d.fields });
    else if (JSON.stringify(have) !== JSON.stringify({ as: d.as, collection: d.collection, kind: d.kind, record: d.record, fields: d.fields })) problems.push(`${where}: blocks read ${d.as} in different ways`);
  }
  return out;
}

import { wide } from "./authoring/components/frames";
import { catalog, catalogChrome } from "./compose-catalog";
import { skinsBoard, skinsChrome } from "./compose-skins";

/** the catalog as a page set: an index of blocks and one area per block with every variant on the fixtures */
function gallery(c: ComposedSpec, blocks: BlockSpec[], org: Record<string, OrganismSpec>): { areas: Record<string, ViewNode[]>; routes: ScreenSpec["routes"]; consts: Record<string, Value> } {
  const list = galleryOf(blocks);
  const routes: ScreenSpec["routes"] = [{ path: "", area: "index" }, ...list.map((b) => ({ path: blockKey(b), area: blockKey(b) }))];
  const themes = THEMES.filter((t) => list.some((b) => b.theme === t));
  // the index reads one list: the topics in order, each with its blocks
  const topics = op("list", ...themes.map((t) => ({
    id: t, titleId: `theme-${t}-title`, title: TEXT(`blocks.themes.${t}.title`), text: TEXT(`blocks.themes.${t}.text`),
    blocks: op("list", ...list.filter((b) => b.theme === t).map((b) => ({
      key: blockKey(b), href: `#/${blockKey(b)}`, name: TEXT(`blocks.names.${blockKey(b)}`), docs: TEXT(`blocks.docs.${blockKey(b)}`),
    }))),
  })));
  const index: ViewNode[] = [pageSection(
    use("Container", { props: { Class: `${wide} py-10` } },
      use("Stack", { props: { Gap: "8", Align: "stretch" } },
        use("Stack", { props: { Gap: "4", Align: "stretch" } },
          use("Title", { props: { As: 1, Size: "4xl", Weight: "bold" }, attrs: { "data-testid": "gallery-title" } }, text(TEXT("blocks.title"))),
          use("Text", { props: { Class: "max-w-2xl text-muted-foreground" } }, text(TEXT("blocks.intro")))),
        each(ref("TOPICS"), "topic", ref("topic.id"),
          labelledGroup("4", ref("topic.titleId"), { "data-testid": "theme-section", "data-theme-id": ref("topic.id") },
            use("Stack", { props: { Gap: "2", Align: "stretch" } },
              use("Title", { props: { As: 2, Size: "2xl", Weight: "bold" }, attrs: { id: ref("topic.titleId") } }, text(ref("topic.title"))),
              use("Text", { props: { Size: "sm", Class: "max-w-2xl text-muted-foreground" } }, text(ref("topic.text")))),
            use("List", { props: { Tag: "ul", Class: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" }, attrs: { "data-testid": "block-list" } },
              each(ref("topic.blocks"), "block", ref("block.key"),
                use("ListItem", { props: { Class: "flex flex-col gap-1 rounded-xl p-4 inset-ring inset-ring-border" } },
                  use("Link", { props: { Href: ref("block.href"), Variant: "default", Class: "font-bold" }, attrs: { "data-testid": "block-link", "data-block": ref("block.key"), "data-theme-id": ref("topic.id") } }, text(ref("block.name"))),
                  use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("block.docs")))))))))),
  )];
  const areas: Record<string, ViewNode[]> = { index };
  const consts: Record<string, Value> = { TOPICS: topics };
  for (const b of list) {
    const key = blockKey(b);
    const drawn: OrganismNode[] = [];
    areas[key] = [pageSection(
      use("Container", { props: { Class: `${wide} py-10` } },
        use("Stack", { props: { Gap: "8", Align: "stretch" } },
          use("Group", {}, use("Link", { props: { Href: "#/", Variant: "default" }, attrs: { "data-testid": "back" } }, text(TEXT("blocks.back")))),
          use("Stack", { props: { Gap: "2", Align: "stretch" } },
            use("Text", { props: { Size: "sm", Class: "font-medium text-muted-foreground" }, attrs: { "data-testid": "block-theme", "data-theme-id": b.theme } }, text(TEXT(`blocks.themes.${b.theme}.title`))),
            use("Title", { props: { As: 1, Size: "4xl", Weight: "bold" }, attrs: { "data-testid": "block-title" } }, text(TEXT(`blocks.names.${key}`))),
            use("Text", { props: { Class: "max-w-2xl text-muted-foreground" } }, text(TEXT(`blocks.docs.${key}`)))),
          ...b.variants.map((v) => variantSection(b, v, org, drawn, 2)))),
    )];
    hoistShared(b, drawn, consts);
  }
  areas["notfound"] = [pageSection(
    use("Container", { props: { Class: `${wide} py-10` } },
      use("Stack", { props: { Gap: "4", Align: "stretch" } },
        use("Title", { props: { As: 1, Size: "4xl", Weight: "bold" } }, text(TEXT("site.notFound.title"))),
        use("Group", {}, use("Button", { props: { Variant: "default", Size: "default", Href: "#/" } }, text(TEXT("blocks.back")))))),
  )];
  void c;
  return { areas, routes, consts };
}

export function expandComposed(c: ComposedSpec, blocks: BlockSpec[], organisms: Record<string, OrganismSpec>): { screen: ScreenSpec; problems: string[] } {
  const problems: string[] = [];
  const where = c.name;
  let areas: Record<string, ViewNode[]> = {};
  let routes = c.routes;
  let before: ViewNode[] = [], after: ViewNode[] = [];
  let chrome: ViewNode[] | null = null;
  let consts: Record<string, Value> | undefined;
  const used = new Set<BlockSpec>();
  const remember = (us: BlockUse[]): void => { for (const u of us) { const b = blocks.find((x) => blockKey(x) === u.block); if (b) used.add(b); } };
  if (c.skins) {
    if (c.routes.length || Object.keys(c.areas).length) problems.push(`${where}: the Skins screen builds its own routes and areas`);
    const g = skinsBoard(c.skins, problems, where);
    areas = g.areas; routes = g.routes; consts = g.consts;
    chrome = skinsChrome();
  } else if (c.catalog) {
    if (c.routes.length || Object.keys(c.areas).length) problems.push(`${where}: a catalog builds its own routes and areas`);
    const g = catalog(c.catalog, blocks, organisms, problems, where);
    areas = g.areas; routes = g.routes; consts = g.consts; g.used.forEach((b) => used.add(b));
    chrome = catalogChrome();
  } else if (c.gallery) {
    if (c.routes.length || Object.keys(c.areas).length) problems.push(`${where}: a gallery builds its own routes and areas`);
    const g = gallery(c, blocks, organisms);
    areas = g.areas; routes = g.routes; consts = g.consts; blocks.forEach((b) => used.add(b));
    chrome = [
      use("Block", { props: { Tag: "header", Class: "border-b border-border" } },
        skipLink("sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow"),
        use("Container", { props: { Class: `${wide} flex flex-wrap items-center justify-between gap-4 py-3` } },
          use("Link", { props: { Href: "#/", Variant: "default", Class: "text-lg font-bold" }, attrs: { "data-testid": "brand" } }, text(TEXT("blocks.title"))),
          use("Group", { props: { Gap: "4", Align: "center", Class: "flex-wrap" } },
            use("Link", { props: { Href: "/catalog/", Variant: "default", Class: "text-sm font-medium" }, attrs: { "data-testid": "catalog-link" } }, text(TEXT("catalog.title"))),
            use("Link", { props: { Href: "/skins/", Variant: "default", Class: "text-sm font-medium" }, attrs: { "data-testid": "skins-link" } }, text(TEXT("skins.title"))),
            use("Link", { props: { Href: "/discovery/", Variant: "default", Class: "text-sm font-medium" }, attrs: { "data-testid": "discovery-link" } }, text(TEXT("discovery.title"))),
            use("Button", { props: { Variant: "outline", Size: "sm" }, on: { click: call("actions.toggleTheme") }, attrs: { "data-testid": "theme-toggle" } }, text(TEXT("theme.toggle")))))),
    ];
  } else {
    remember(c.frame.before); remember(c.frame.after);
    // landmark names stay unique on a page: a block used twice is named after its variant, and in an area every block after the
    // first (the lead with the h1) is too on screens that ask for it (nameLandmarks), since different blocks may share a heading (cart, summary) or a nav name with the frame
    const run = (us: BlockUse[], at: string, prefix: string, area = false): { nodes: ViewNode[]; h1: number } => {
      const out = us.map((u, i) => expandUse(u, blocks, organisms, `${where}.${at}[${i}]`, `${prefix}-${u.block}${us.filter((x) => x.block === u.block).length > 1 ? `-${i}` : ""}`, problems, us.filter((x) => x.block === u.block).length > 1 || (area && i > 0)));
      return { nodes: out.flatMap((x) => x.nodes), h1: out.filter((x) => x.h1).length };
    };
    const fb = run(c.frame.before, "frame.before", "before"), fa = run(c.frame.after, "frame.after", "after");
    before = fb.nodes; after = fa.nodes;
    if (fb.h1 + fa.h1) problems.push(`${where}: the frame holds a level 1 heading; a page has one h1 and it belongs to the area`);
    for (const [area, uses] of Object.entries(c.areas)) {
      remember(uses);
      const r = run(uses, area, area, c.nameLandmarks === true);
      areas[area] = r.nodes;
      if (c.requireH1 && r.h1 !== 1) problems.push(`${where}.${area}: the page needs exactly one level 1 heading (found ${r.h1})`);
    }
    for (const r of c.routes) if (!(r.area in c.areas)) problems.push(`${where}: route ${r.path} points to the missing area ${r.area}`);
  }
  const main = use("Block", { props: { Tag: "main", ID: "main-content" }, attrs: { tabindex: -1, "data-testid": "main" } }, outlet());
  // a frame chrome (the header of the gallery, the catalog, the Skins screen) is a part: its own file opening on its Block, so the
  // screen file opens on that part and holds one Block, the main (rule 01)
  const parts: Record<string, ViewNode[]> | undefined = chrome ? { ScreenHeader: chrome } : undefined;
  const layout = chrome ? [part("ScreenHeader"), main] : [...before, main, ...after];
  const orgNames = new Set<string>();
  const scan = (n: unknown): void => { if (Array.isArray(n)) n.forEach(scan); else if (n && typeof n === "object") { const o = n as Record<string, unknown>; if (typeof o["organism"] === "string") orgNames.add(o["organism"]); Object.values(o).forEach(scan); } };
  scan(layout); scan(parts ?? {}); scan(areas);
  // a source is read only when a node refers to it: a block whose data the use replaced (the menu of a theme app) does not pull its fixture in
  const roots = new Set([...JSON.stringify([layout, parts ?? {}, areas, consts ?? {}]).matchAll(/"\$":"([A-Za-z0-9_]+)/g)].map((m) => m[1]!));
  const sources = sourcesOfBlocks([...used], problems, where).filter((x) => roots.has(x.as));
  const screen: ScreenSpec = {
    specVersion: 1, id: c.id, name: c.name, docs: c.docs, kind: "page", sources,
    routes, ...(c.nav ? { nav: true } : {}), ...(c.menu ? { menu: c.menu } : {}), organisms: [...orgNames].sort(), layout, ...(parts ? { parts } : {}), areas,
    ...(c.gallery || c.catalog || c.skins || c.chunks ? { chunks: true } : {}), ...(consts ? { consts } : {}), portable: c.portable,
  };
  return { screen, problems };
}


