// The Skins screen (/skins/): three rows of tiles that change the look of the whole preview.
//   Skins:  the default theme and the tweakcn skins; each tile is drawn in its own skin (data-skin on the tile).
//   Fonts:  Google fonts with Latin and Cyrillic letters, put over the font of the skin.
//   Radius: corner radii, put over the radius of the skin.
// The tiles are static markup with data attributes. The preview runtime of the shared app package (runtime/skins.ts) wires the
// clicks, keeps the choice in localStorage for every screen and reload, and marks the current tile with aria-pressed.
import { call, each, op, ref, text, use } from "./build";
import type { ScreenSpec, SkinsBoard, Value, ViewNode } from "./ir";
import { dictKey, labelledGroup, pageSection, skipLink, TEXT } from "./compose-kit";
import { wide } from "./authoring/components/frames";
import { navBlockOf } from "./authoring/components/landmarks";

/** a tile: a plain button with an edge; the pressed one (the current choice) gets a thicker edge in the primary colour */
const TILE = "group flex w-full cursor-pointer flex-col gap-2 rounded text-start inset-ring inset-ring-border hover:bg-muted aria-pressed:inset-ring-2 aria-pressed:inset-ring-primary";

/** the name of a tile and a check mark that shows only on the pressed tile */
const tileName = (name: Value, pad: string): ViewNode =>
  use("Inline", { props: { Class: `flex items-center justify-between gap-2 ${pad} text-sm font-medium` } },
    use("Inline", {}, text(name)),
    use("Inline", { props: { Class: "hidden text-primary group-aria-pressed:inline-flex" }, attrs: { "data-testid": "tile-check" } },
      use("LucideIcon", { props: { Name: "check", Size: 16 } })));

/** one colour of a skin: a small square */
const swatch = (bg: string): ViewNode => use("Inline", { props: { Class: `size-6 rounded ${bg} inset-ring inset-ring-border` } });

/** a skin tile: its colours, a small card with a button, all drawn in the skin of the tile, then its name */
const skinTile = use("ListItem", { props: { Class: "flex" } },
  use("ButtonPlain", { props: { Type: "button", Class: `${TILE} p-2` }, attrs: { "aria-pressed": false, "data-skin-pick": ref("s.id"), "data-testid": "skin-tile" } },
    use("Inline", { props: { Class: "flex flex-col gap-4 rounded p-4 inset-ring inset-ring-border" }, attrs: { "data-skin": ref("s.id"), "data-testid": "skin-preview" } },
      use("Inline", { props: { Class: "flex flex-wrap gap-2" } }, swatch("bg-primary"), swatch("bg-secondary"), swatch("bg-accent"), swatch("bg-muted"), swatch("bg-foreground")),
      use("Inline", { props: { Class: "flex flex-col gap-2 rounded bg-card p-4 text-card-foreground inset-ring inset-ring-border" } },
        use("Inline", { props: { Class: "text-sm font-semibold" } }, text(TEXT("skins.sample.card"))),
        use("Inline", { props: { Class: "text-xs text-muted-foreground" } }, text(TEXT("skins.sample.text"))),
        use("Inline", { props: { Class: "inline-flex h-8 w-fit items-center rounded bg-primary px-4 text-sm font-medium text-primary-foreground" } }, text(TEXT("skins.sample.button"))))),
    tileName(ref("s.name"), "px-2 pb-2")));

/** a font tile: Latin and Cyrillic letters and a pangram; the runtime draws the tile in its font (data-font-family) */
const fontTile = use("ListItem", { props: { Class: "flex" } },
  use("ButtonPlain", { props: { Type: "button", Class: `${TILE} p-4` }, attrs: { "aria-pressed": false, "data-font-pick": ref("f.id"), "data-font-family": ref("f.family"), "data-testid": "font-tile" } },
    use("Inline", { props: { Class: "text-3xl" } }, text(TEXT("skins.fonts.specimen"))),
    use("Inline", { props: { Class: "text-sm text-muted-foreground" } }, text(TEXT("skins.fonts.pangram"))),
    tileName(ref("f.name"), "")));

/** a radius tile: a box with that radius (the runtime sets --radius on the box from data-radius) */
const radiusTile = use("ListItem", { props: { Class: "flex" } },
  use("ButtonPlain", { props: { Type: "button", Class: `${TILE} p-4` }, attrs: { "aria-pressed": false, "data-radius-pick": ref("r.id"), "data-radius": ref("r.value"), "data-testid": "radius-tile" } },
    use("Inline", { props: { Class: "block h-16 w-full rounded bg-primary" }, attrs: { "data-radius-sample": "" } }),
    tileName(ref("r.name"), "")));

/** one row of tiles: a heading with a note and a button back to the skin's own choice, then the grid */
const row = (id: "skins" | "fonts" | "radius", grid: string, body: ViewNode): ViewNode =>
  labelledGroup("4", `skins-${id}-title`, { "data-testid": "skins-row", "data-row": id },
    use("Box", { props: { Class: "flex flex-wrap items-end justify-between gap-4" } },
      use("Stack", { props: { Gap: "2", Align: "stretch" } },
        use("Title", { props: { As: 2, Size: "2xl", Weight: "bold" }, attrs: { id: `skins-${id}-title` } }, text(TEXT(`skins.${id}.title`))),
        use("Text", { props: { Size: "sm", Class: "max-w-2xl text-muted-foreground" } }, text(TEXT(`skins.${id}.text`)))),
      use("Button", { props: { Variant: "outline", Size: "sm" }, attrs: { "data-look-reset": id === "skins" ? "skin" : id === "fonts" ? "font" : "radius", "data-testid": `reset-${id}` } }, text(TEXT(`skins.${id}.reset`)))),
    use("List", { props: { Tag: "ul", Class: `grid gap-4 ${grid}` }, attrs: { "data-testid": `${id}-list` } }, body));

export function skinsBoard(board: SkinsBoard, problems: string[], where: string): { areas: Record<string, ViewNode[]>; routes: ScreenSpec["routes"]; consts: Record<string, Value> } {
  if (board.skins[0] !== "default") problems.push(`${where}: the first skin tile is "default"`);
  const consts: Record<string, Value> = {
    SKINS: op("list", ...board.skins.map((id) => ({ id, name: TEXT(`skins.skins.names.${dictKey(id)}`) }))),
    FONTS: op("list", ...board.fonts.map((f) => ({ id: f.id, family: f.family, name: TEXT(`skins.fonts.names.${dictKey(f.id)}`) }))),
    RADII: op("list", ...board.radii.map((r) => ({ id: r.id, value: r.value, name: TEXT(`skins.radius.names.${dictKey(r.id)}`) }))),
  };
  const index = pageSection(use("Container", { props: { Class: `${wide} py-10` } },
    use("Stack", { props: { Gap: "8", Align: "stretch" } },
      use("Stack", { props: { Gap: "2", Align: "stretch" } },
        use("Title", { props: { As: 1, Size: "4xl", Weight: "bold" }, attrs: { "data-testid": "skins-title" } }, text(TEXT("skins.title"))),
        use("Text", { props: { Class: "max-w-2xl text-muted-foreground" } }, text(TEXT("skins.intro")))),
      row("skins", "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5", each(ref("SKINS"), "s", ref("s.id"), skinTile)),
      row("fonts", "sm:grid-cols-2 lg:grid-cols-5", each(ref("FONTS"), "f", ref("f.id"), fontTile)),
      row("radius", "grid-cols-2 sm:grid-cols-5", each(ref("RADII"), "r", ref("r.id"), radiusTile)))));
  const notfound = pageSection(use("Container", { props: { Class: `${wide} py-10` } },
    use("Stack", { props: { Gap: "4", Align: "stretch" } },
      use("Title", { props: { As: 1, Size: "4xl", Weight: "bold" } }, text(TEXT("site.notFound.title"))),
      use("Group", {}, use("Button", { props: { Variant: "default", Size: "default", Href: "#/" } }, text(TEXT("skins.back")))))));
  return { areas: { index: [index], notfound: [notfound] }, routes: [{ path: "", area: "index" }], consts };
}

/** the header part of the Skins screen: the skip link, the brand, links to the catalog and the block gallery, and the theme button */
export function skinsChrome(): ViewNode[] {
  const link = (href: string, key: string, testid: string): ViewNode => use("Link", { props: { Href: href, Variant: "default", Class: "text-sm font-medium" }, attrs: { "data-testid": testid } }, text(TEXT(key)));
  return [
    use("Block", { props: { Tag: "header", Class: "border-b border-border" } },
      skipLink("sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow"),
      use("Container", { props: { Class: `${wide} flex flex-wrap items-center justify-between gap-4 py-3` } },
        use("Link", { props: { Href: "#/", Variant: "default", Class: "text-lg font-bold" }, attrs: { "data-testid": "brand" } }, text(TEXT("skins.title"))),
        navBlockOf(TEXT("skins.navLabel"), "flex flex-wrap items-center gap-4", undefined,
          link("/catalog/", "catalog.title", "catalog-link"), link("/blocks/", "blocks.title", "gallery-link"),
          use("Button", { props: { Variant: "outline", Size: "sm" }, on: { click: call("actions.toggleTheme") }, attrs: { "data-testid": "theme-toggle" } }, text(TEXT("theme.toggle")))))),
  ];
}
