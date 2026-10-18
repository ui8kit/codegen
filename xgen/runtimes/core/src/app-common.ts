// Pieces of the host apps and of the shared app package that do not depend on the runtime.
// A landing is data: a screen spec. Two host apps (one per runtime) serve every screen by name: /<key>/#/<route>.
// What both hosts read (dictionary, fixtures, menus, url core, theme, skins, the screen registry) is emitted once, in SHARED_DIR.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AppSpec, CollectionFile, Dictionary, ScreenSpec, TaxonomyFile } from "@ui8kit/xgen-screens";
import { BANNER, type GeneratedFile } from "./common";

/** the package every host imports content, data, menus and the url core from */
export const SHARED = "@ui8kit/app-shared";
export const SHARED_DIR = "packages/shared/app";
/** folder of generated sources inside a host app (DO NOT EDIT); src/ is the front controller */
export const HOST_GEN = "xgen";
/** the name of a screen in a URL: its id without `screen.` */
export const screenKey = (id: string): string => id.replace(/^screen\./, "");
/** the look of a screen: every screen uses the default skin (the shadcn neutral theme); skins.css holds no extra skins */
export const screenSkin = (_id: string): "default" => "default";

export const assetsDir = join(import.meta.dir, "..", "assets");
export const readAsset = (...p: string[]): string => readFileSync(join(assetsDir, ...p), "utf8");

export const withBanner = (src: string): string => `// ${BANNER}\n${src}`;

export const jsonFile = (path: string, data: Record<string, unknown>): GeneratedFile => ({ path, contents: JSON.stringify({ "//": BANNER, ...data }, null, 2) + "\n" });

export function indexHtml(app: AppSpec): string {
  return `<!doctype html>
<!-- ${BANNER} -->
<html lang="${app.locale}" data-theme="${app.theme === "dark" ? "dark" : "light"}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:," />
    <title>${app.title}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.${"__EXT__"}"></script>
  </body>
</html>
`;
}

export const appCss = (uiPackage: string): GeneratedFile => ({
  path: "src/app.css",
  contents: `/* ${BANNER} */\n@import "${uiPackage}/styles/index.css";\n@import "${SHARED}/styles/skins.css";\n`,
});

export const viteConfig = (imports: string[], plugins: string, app: AppSpec): GeneratedFile => ({
  path: "vite.config.ts",
  contents: withBanner(`import tailwindcss from "@tailwindcss/vite";\n${imports.join("\n")}\nimport { defineConfig } from "vite";\n\nexport default defineConfig({\n  plugins: [tailwindcss(), ${plugins}],\n  server: { host: "127.0.0.1", port: ${app.port}, strictPort: true, proxy: { "/__inspect": "http://127.0.0.1:5190" } },\n  preview: { host: "127.0.0.1", port: ${app.port}, strictPort: true },\n});\n`),
});

/** the url runtime of a host (runtime specific), reading the shared core */
export const hostUrlAsset = (file: string, contents: string): GeneratedFile => ({
  path: `${HOST_GEN}/runtime/${file}`,
  contents: withBanner(contents.replace(/from "\.\/core"/g, `from "${SHARED}/runtime/core"`)),
});

/** the dictionary path `a.b-c.d` as a TS member chain of `ui` */
const uiPath = (key: string): string => "ui" + key.split(".").map((k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? `.${k}` : `[${JSON.stringify(k)}]`)).join("");

/** the menu of one screen, from `menu` of its spec: the links (id, label, href, area of the route) and the current one per area */
export function navFile(s: ScreenSpec): GeneratedFile {
  const lines = (s.menu ?? []).map((r) => {
    const area = s.routes.find((x) => x.path === r.path)?.area ?? r.id;
    return `  { id: ${JSON.stringify(r.id)}, name: ${uiPath(r.titleKey)}, icon: ${JSON.stringify(r.icon ?? "link")}, href: ${JSON.stringify(r.path === "" ? "#/" : `#/${r.path}`)}, area: ${JSON.stringify(area)} },`;
  });
  return {
    path: `src/nav/${s.name}.ts`,
    contents: withBanner([
      `// The menu of ${s.id}, from "menu" of its screen spec`,
      `import { ui } from "../content";`,
      ``,
      `export const NAV = [`,
      ...lines,
      `];`,
      ``,
      `/** the links of the menu and the id of the one that leads to the area on screen ("" when none does) */`,
      `export const navOf = (area: string): { links: typeof NAV; current: string } => ({ links: NAV, current: NAV.find((l) => l.area === area)?.id ?? "" });`,
      ``,
    ].join("\n")),
  };
}

/** the files of the skins folder: one CSS file per skin, the tile reset (base.css), the scoped default, and NOTICE.md (sources and licences) */
const skinFiles = (): string[] => readdirSync(join(assetsDir, "styles", "skins")).filter((f) => f.endsWith(".css") || f === "NOTICE.md").sort();

/** the Google fonts each skin loads when it is on, from skins/skins.json (the tweakcn import tool writes it; sky is ours) */
function skinFontsFile(): GeneratedFile {
  const skins = JSON.parse(readAsset("styles", "skins", "skins.json")) as Record<string, { fonts: string[] }>;
  const rows = Object.entries(skins).filter(([, v]) => v.fonts.length).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v.fonts)},`);
  return {
    path: "src/runtime/skin-fonts.ts",
    contents: withBanner([
      `// The Google fonts a skin needs (family:axes for the css2 API), loaded only while that skin is on; the default skin uses the system font.`,
      `// From xgen/runtimes/core/assets/styles/skins/skins.json.`,
      `export const SKIN_FONTS: Record<string, readonly string[]> = {`,
      ...rows,
      `};`,
      ``,
    ].join("\n")),
  };
}

function registryFile(screens: ScreenSpec[]): GeneratedFile {
  const rows = screens.map((s) => `  { key: ${JSON.stringify(screenKey(s.id))}, id: ${JSON.stringify(s.id)}, name: ${JSON.stringify(s.name)}, skin: ${JSON.stringify(screenSkin(s.id))} },`);
  return {
    path: "src/screens.ts",
    contents: withBanner([
      `// The screens the host apps serve: /<key>/#/<route> (or ?screen=<key>). One entry per screen spec of xgen/specs/screens.`,
      `import { initTheme, type ThemeMode } from "./runtime/theme";`,
      `import { applyOverrides, applySkin, mountLook, storedSkin } from "./runtime/skins";`,
      ``,
      `export interface ScreenEntry { key: string; id: string; name: string; skin: "default" }`,
      ``,
      `export const SCREENS: readonly ScreenEntry[] = [`,
      ...rows,
      `];`,
      ``,
      `/** the screen a visit asks for: the first segment of the path, else the \`screen\` query parameter; "" (the index) when there is no such screen */`,
      `export function screenKeyOf(loc: { pathname: string; search: string }): string {`,
      `  const key = loc.pathname.split("/").filter(Boolean)[0] || new URLSearchParams(loc.search).get("screen") || "";`,
      `  return SCREENS.some((s) => s.key === key) ? key : "";`,
      `}`,
      ``,
      `/** the skin of a build: the VITE_SKIN build variable, else the screen's own */`,
      `const buildSkin = (own: string): string => (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SKIN || own;`,
      ``,
      `/** the skin of a visit: the \`skin\` query parameter, else the one picked on /skins/ (stored), else the build skin */`,
      `export function skinOf(search: string, own: string): string {`,
      `  return new URLSearchParams(search).get("skin") || storedSkin() || buildSkin(own);`,
      `}`,
      ``,
      `/** before the first paint: the skin of the screen (and its fonts), the font and radius picked on /skins/, the title of the tab and the theme of the host */`,
      `export function bootScreen(key: string, theme: ThemeMode, title: string): void {`,
      `  const s = SCREENS.find((x) => x.key === key);`,
      `  const own = s?.skin ?? "default";`,
      `  applySkin(skinOf(location.search, own));`,
      `  applyOverrides();`,
      `  document.title = s ? \`\${s.key} · \${title}\` : title;`,
      `  initTheme(theme);`,
      `  // the tiles of /skins/ (static markup) are wired by their data attributes`,
      `  mountLook(buildSkin(own));`,
      `  // preview tooling only: the Ins button (VITE_INSPECT=1 builds); other builds drop this branch and its chunk`,
      `  // @ts-ignore import.meta.env is Vite's`,
      `  if (import.meta.env.VITE_INSPECT === "1") void import("./runtime/inspect").then((m) => m.mountInspect());`,
      `  // @ts-ignore import.meta.env is Vite's`,
      `  if (import.meta.env.VITE_INSPECT === "1") void import("./runtime/visited").then((m) => m.mountVisited());`,
      `}`,
      ``,
    ].join("\n")),
  };
}

/** Cyrillic letters as \u escapes: the one Cyrillic text of the dictionary is a specimen of letters (the font tiles of /skins/),
 *  and the sources and the generated code stay free of Cyrillic text (xgen check, group text) */
const escapeCyrillic = (s: string): string => s.replace(/[\u0400-\u04FF]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);

/** the shared package: one copy of what every host reads, whatever its runtime */
/** runtime/codex: the lookups `fromCodex` resolves the references of an entry with (ReadOptions of runtime/core): the
 *  media entries (featured_media_id|media), the users (author_id|author), the terms of every taxonomy (terms|term:<id>) and
 *  the child menu items (id|menu) */
function codexFile(collections: CollectionFile[]): GeneratedFile {
  const of = (kind: string) => collections.filter((c) => c.entries.length > 0 && c.entries.every((e) => e.kind === kind)).map((c) => c.collection).sort();
  const media = of("media"), users = of("user");
  // the links under a menu item (kind menu_item with a parent_id): `id|menu` lists the children of an item
  const menus = collections.filter((c) => c.entries.length > 0 && c.entries.every((e) => e.kind === "menu_item" && typeof (e as { parent_id?: unknown }).parent_id === "string")).map((c) => c.collection).sort();
  const imports = [...media, ...users, ...menus].map((c) => `import { ${c} } from "../data/${c}";`);
  const list = (cs: string[]) => (cs.length ? `[${cs.map((c) => `...${c}`).join(", ")}]` : "[]");
  return {
    path: "src/runtime/codex.ts",
    contents: withBanner([
      `// The lookups of the Codex entries: pass CODEX as the options of fromCodex so that featured_media_id, author_id and terms`,
      `// resolve (media file, author name, term label, the links under a menu item). Add \`routes\` for the kinds an app has a page for: without one, no link.`,
      `import type { ReadOptions } from "./core";`,
      ...imports,
      `import { taxonomies } from "../data/taxonomies";`,
      ``,
      `export const CODEX: ReadOptions = {`,
      `  media: ${list(media)},`,
      `  users: ${list(users)},`,
      `  menus: ${list(menus)},`,
      `  terms: (taxonomies as readonly { terms: readonly unknown[] }[]).flatMap((t) => t.terms),`,
      `};`,
      ``,
    ].join("\n")),
  };
}

export function sharedPackage(dictionary: Dictionary, collections: CollectionFile[], screens: ScreenSpec[], taxonomies: TaxonomyFile[] = []): GeneratedFile[] {
  const files: GeneratedFile[] = [
    { path: "src/content.ts", contents: withBanner(`// The content dictionary (xgen/content/ui/en.json): every text of every screen\nexport const ui = ${escapeCyrillic(JSON.stringify(dictionary, null, 2))} as const;\n`) },
    { path: "src/runtime/core.ts", contents: withBanner(readAsset("app", "core.ts")) },
    { path: "src/runtime/fields.ts", contents: withBanner(readAsset("app", "fields.ts")) },
    { path: "src/runtime/theme.ts", contents: withBanner(readAsset("app", "theme.ts")) },
    { path: "src/runtime/inspect.ts", contents: withBanner(readAsset("app", "inspect.ts")) },
    { path: "src/runtime/visited.ts", contents: withBanner(readAsset("app", "visited.ts")) },
    { path: "src/runtime/skins.ts", contents: withBanner(readAsset("app", "skins.ts")) },
    skinFontsFile(),
    { path: "src/styles/skins.css", contents: `/* ${BANNER} */\n${readAsset("styles", "skins.css")}` },
    ...skinFiles().map((f) => ({ path: `src/styles/skins/${f}`, contents: f.endsWith(".md") ? `<!-- ${BANNER} -->\n${readAsset("styles", "skins", f)}` : `/* ${BANNER} */\n${readAsset("styles", "skins", f)}` })),
    registryFile(screens),
    ...collections.map((c) => ({
      path: `src/data/${c.collection}.ts`,
      contents: withBanner(`// Fixture of the Codex collection "${c.collection}" (xgen/fixtures/${c.collection}.json)\nexport const ${c.collection} = ${JSON.stringify(c.entries, null, 2)} as const;\n`),
    })),
    {
      path: "src/data/taxonomies.ts",
      contents: withBanner(`// The Codex taxonomy bundles (xgen/fixtures/taxonomies/*.json): the terms that entries name in \`terms\`\nexport const taxonomies = ${JSON.stringify(taxonomies, null, 2)} as const;\n`),
    },
    codexFile(collections),
    ...screens.filter((s) => s.nav).map(navFile),
  ];
  files.push(jsonFile("package.json", {
    name: SHARED, version: "0.0.0", private: true, type: "module",
    description: "What the host apps share, generated by xgen once for every screen: the dictionary, the fixtures, the menus, the screen registry, the url core, the theme and the skins. Runtime neutral TypeScript; no build step.",
    sideEffects: ["*.css"],
    exports: {
      "./content": "./src/content.ts",
      "./screens": "./src/screens.ts",
      "./runtime/*": "./src/runtime/*.ts",
      "./data/*": "./src/data/*.ts",
      "./nav/*": "./src/nav/*.ts",
      "./styles/*": "./src/styles/*",
      "./package.json": "./package.json",
    },
    scripts: { check: "tsc --noEmit -p tsconfig.json" },
    dependencies: { "modern-screenshot": "^4.6.0" },
    devDependencies: { typescript: "~6.0.2" },
  }));
  files.push({ path: "tsconfig.json", contents: `// ${BANNER}\n{\n  "compilerOptions": {\n    "target": "ES2023", "lib": ["ES2023", "DOM", "DOM.Iterable"], "module": "ESNext", "moduleResolution": "bundler",\n    "strict": true, "noEmit": true, "skipLibCheck": true, "isolatedModules": true, "verbatimModuleSyntax": true\n  },\n  "include": ["src"]\n}\n` });
  files.push({
    path: "README.md",
    contents: [
      `<!-- ${BANNER} -->`,
      `# ${SHARED}`,
      ``,
      `Generated by xgen (\`bun run build\`). One copy of what the host apps (\`apps/host-svelte\`, \`apps/host-react\`) read for every screen:`,
      ``,
      `- \`content\`: the dictionary (\`xgen/content/ui/en.json\`)`,
      `- \`data/<collection>\`: the fixtures the screens read`,
      `- \`nav/<Screen>\`: the menu of a screen (\`menu\` of its spec)`,
      `- \`screens\`: the registry of screens (key, id, skin) and the boot of a visit`,
      `- \`runtime/core\`, \`runtime/theme\`: url state and light/dark, runtime neutral; \`runtime/fields\`: the Codex field maps by kind; \`runtime/codex\`: the lookups (media, users, terms) of fromCodex`,
      `- \`styles/skins.css\`: skins switched by \`data-skin\` on \`<html>\``,
      ``,
      `${screens.length} screens. A dictionary edit changes \`src/content.ts\` here and nothing in the hosts.`,
      ``,
    ].join("\n"),
  });
  return files;
}
