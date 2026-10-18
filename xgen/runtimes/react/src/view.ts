// React output for organisms, screens and the app scaffold. Blocks are ternaries and `.map`, render-prop slots are function props.
import { fileName, presetFile, printBare, printValue, sourcesOf, tierDir, typesPath, type OrganismSpec, type ScreenSpec } from "@ui8kit/xgen-screens";
import { reactPropName } from "@ui8kit/xgen-spec";
import { assetFile, assetTables, BANNER, chainLines, chunksOf, partsOf, cnLines, pageSources, optionalGroups, printVariantTable, wrapList, wrapText, screenModel, type ChunkModel, type RecipeLike, typeName, walkNodes, recordTypes, type GeneratedFile, type PartRef, type Syntax, type WalkEnv } from "@ui8kit/xgen-runtime-core";

const pad = (lines: string[], n = 1): string[] => lines.map((l) => (l ? "  ".repeat(n) + l : l));
const cap = (s: string): string => s[0]!.toUpperCase() + s.slice(1);
/** the lines are one JSX element (an opening line, the end of a long opening tag, the closing tag): no fragment needed around them */
const singleRoot = (lines: string[]): boolean => {
  if (!lines.length || !/^<[A-Za-z]/.test(lines[0]!)) return false;
  const top = lines.filter((l) => l && !l.startsWith(" "));
  return top.slice(1).every((l, i, a) => l === ">" || l === "/>" || (i === a.length - 1 && /^<\/[A-Za-z.]+>$/.test(l)));
};
/** the lines wrapped in a fragment unless they are one element */
const inner = (lines: string[]): string[] => (singleRoot(lines) ? pad(lines) : ["  <>", ...pad(lines, 2), "  </>"]);
const frag = (lines: string[]): string[] => ["(", ...inner(lines), ")"];
/** `key` on the root element of a loop body, or a keyed Fragment around the body */
const keyed = (body: string[], key: string): string[] =>
  singleRoot(body)
    ? pad([body[0]!.replace(/^<([A-Za-z.]+)/, `<$1 key={${key}}`), ...body.slice(1)])
    : [`  <Fragment key={${key}}>`, ...pad(body, 2), "  </Fragment>"];

export const reactSyntax: Syntax = {
  runtime: "react",
  propName(ref: PartRef, canonical: string) {
    if (canonical === "Class") return "className";
    const d = ref.part.props.find((x) => x.name === canonical);
    if (!d) throw new Error(`${ref.part.name}: prop ${canonical} does not exist`);
    return reactPropName(d);
  },
  attrName: (name) => (name === "tabindex" ? "tabIndex" : name),
  eventProp: (ev) => (ev === "input" ? "onChange" : `on${cap(ev)}`),
  callbackName: (ev) => `on${cap(ev)}`,
  eventType: "ChangeEvent<HTMLInputElement>",
  classProp: "className",
  ifChain(branches, rest) {
    const out: string[] = [];
    branches.forEach(([c, lines], i) => { out.push(i === 0 ? `{${c} ? (` : `) : ${c} ? (`, ...inner(lines)); });
    if (rest.length) out.push(") : (", ...inner(rest), ")}");
    else out.push(") : null}");
    return out;
  },
  each: (items, as, key, body, index) => [`{(${items} ?? []).map((${as}${index ? `, ${index}` : ""}) => (`, ...keyed(body, key), "))}"],
  slot: (name, args, fn) => [fn ? `{${name}?.(${args.join(", ")})}` : `{${name}}`],
  slotProp: (name, params, body, fn) => ({ attr: [fn ? `${name}={(${params}) => ${frag(body).join("\n")}}` : `${name}={${frag(body).join("\n")}}`] }),
  fragment: frag,
};

export interface ViewDeps {
  parts: Record<string, PartRef>;
  organisms: Record<string, OrganismSpec>;
  /** import path of the file of a part, from the folder of the component (`src/blocks/`, `src/components/`) */
  partPath(name: string): string;
  /** the recipes (specs/recipes), by file name: printed as variant tables at the top of the organisms that read them */
  recipes?: Record<string, RecipeLike>;
}

/** the variant tables of the recipes an organism reads (shadcn/cva style), printed at the top of its file */
function recipeTables(org: OrganismSpec, deps: ViewDeps): string[] {
  return Object.entries(org.recipes ?? {}).map(([local, file]) => {
    const recipe = deps.recipes?.[file];
    if (!recipe) throw new Error(`${org.name}: recipe ${file} not found in specs/recipes`);
    return `/** ${org.name}: the classes of each value (shadcn/cva style). */\n${printVariantTable(`${local}Variants`, recipe)}`;
  });
}

/** the one-line description on top, cut under the width */
const docsLines = (docs: string): string[] => { const l = wrapText(docs); return l.length === 1 ? [`/** ${l[0]} */`] : ["/**", ...l.map((x) => ` * ${x}`), " */"]; };

const header = `// ${BANNER}`;

function envFor(deps: ViewDeps, optional: string[] = []): WalkEnv {
  return { syntax: reactSyntax, parts: deps.parts, organisms: deps.organisms, print: { emit: (ev) => `on${cap(ev)}?.`, helpers: new Set(), presets: new Set(), optional: new Set(optional), runtime: "react" }, usedParts: new Set(), usedOrganisms: new Set(), usesEach: { value: false } };
}

function groupImports(names: string[], pathOf: (n: string) => string): string[] {
  const byFile = new Map<string, string[]>();
  for (const n of names) { const f = pathOf(n); byFile.set(f, [...(byFile.get(f) ?? []), n]); }
  return [...byFile].sort(([a], [b]) => a.localeCompare(b)).map(([f, ns]) => `import { ${ns.sort().join(", ")} } from "${f}";`);
}

function reactImports(markup: string[], needChangeEvent: boolean): string {
  const names = [markup.some((l) => l.includes("<Fragment")) ? "Fragment" : "", needChangeEvent ? "type ChangeEvent" : ""].filter(Boolean);
  return names.length ? `import { ${names.join(", ")} } from "react";` : "";
}

const constLines = (org: OrganismSpec): string[] =>
  Object.entries(org.consts ?? {}).filter(([name]) => !assetTables(org).includes(name)).flatMap(([name, table]) => [`const ${name}: Record<string, string> = {`, ...Object.entries(table).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`), `};`, ``]);

export function emitOrganism(org: OrganismSpec, deps: ViewDeps): GeneratedFile[] {
  const env = envFor(deps, optionalGroups(org));
  env.slotArity = { ...Object.fromEntries(org.slots.map((s) => [s.name, s.args.length])), ...(org.children ? { children: 0 } : {}) };
  const markup = walkNodes(org.view, env);
  const name = org.name;
  const dir = tierDir(org.id);
  const recordNames = Object.keys(org.records);
  const propLines = [
    ...org.props.map((p) => `  ${p.name}${p.required ? "" : "?"}: ${typeName(p.type)};`),
    ...(org.className ? [`  className?: string;`] : []),
    ...(org.children ? [`  children?: ReactNode;`] : []),
    ...org.slots.map((s) => (s.args.length ? `  ${s.name}?: (${s.args.map((a, i) => `${a.name || "arg" + i}: ${typeName(a.type)}`).join(", ")}) => ReactNode;` : `  ${s.name}?: ReactNode;`)),
    ...org.events.map((e) => `  on${cap(e.name)}?: (${e.args.map((a) => `${a.name}: ${typeName(a.type)}`).join(", ")}) => void;`),
  ];
  const lit = (v: string | number | boolean) => JSON.stringify(v);
  const destructure = [
    ...org.props.map((p) => (p.default === undefined ? p.name : `${p.name} = ${lit(p.default)}`)),
    ...(org.className ? ["className"] : []),
    ...(org.children ? ["children"] : []),
    ...org.slots.map((s) => s.name),
    ...org.events.map((e) => `on${cap(e.name)}`),
  ];
  const derived = (org.derived ?? []).map((d) => {
    const one = `  const ${d.name} = ${printBare(d.value, env.print)};`;
    const chain = one.length > 100 ? chainLines(printValue(d.value, env.print)) ?? cnLines(printBare(d.value, env.print)) : undefined;
    return chain ? `  const ${d.name} =\n${chain.map((l) => `    ${l}`).join("\n")};` : one;
  });
  const tables = recipeTables(org, deps);
  if (tables.length) env.print.helpers.add("variants");
  const helpers = [...env.print.helpers].sort();
  const reactNames = [markup.some((l) => l.includes("<Fragment")) ? "Fragment" : "", markup.join("\n").includes("ChangeEvent<") ? "type ChangeEvent" : "", "type ReactNode"].filter(Boolean);
  const orgImports = [...env.usedOrganisms].sort().map((o) => `import { ${o} } from "../${tierDir(deps.organisms[o]!.id)}/${fileName(o)}";`);
  const contents = [
    header,
    ...docsLines(org.docs),
    `import { ${reactNames.join(", ")} } from "react";`,
    ...groupImports([...env.usedParts].sort(), (n) => deps.partPath(n)),
    ...orgImports,
    ...[...(env.print.presets ?? [])].sort().map((p) => `import { ${p} } from "../presets/${presetFile(p)}";`),
    ...(helpers.length ? [`import { ${helpers.join(", ")} } from "../utils";`] : []),
    ...(assetTables(org).length ? [`import { ${assetTables(org).join(", ")} } from "./${fileName(name)}.assets";`] : []),
    ...(recordNames.length ? [`import type { ${recordNames.join(", ")} } from "./${fileName(name)}.types";`] : []),
    ...(org.typeImports ?? []).map((t) => `import type { ${t.names.join(", ")} } from "${typesPath(org.id, deps.organisms[t.from] ?? { id: org.id, name: t.from })}";`),
    ``,
    ...tables.flatMap((t) => [t, ``]),
    ...constLines(org),
    `export type ${name}Props = {`,
    ...propLines,
    `};`,
    ``,
    `${wrapList(`export function ${name}({`, destructure, `}: ${name}Props) {`)}`,
    ...derived,
    `  return (`,
    ...pad(singleRoot(markup) ? markup : ["<>", ...pad(markup), "</>"], 2),
    `  );`,
    `}`,
    ``,
  ].join("\n");
  const out: GeneratedFile[] = [{ path: `${dir}/${fileName(name)}.tsx`, contents }];
  if (recordNames.length) out.push({ path: `${dir}/${fileName(name)}.types.ts`, contents: `${header}\n\n${recordTypes(org, deps.organisms)}\n` });
  if (assetTables(org).length) out.push({ path: `${dir}/${fileName(name)}.assets.ts`, contents: assetFile(org, header) });
  return out;
}

export interface ScreenDeps extends ViewDeps {
  ui: string;
  /** package of the shared app outputs: content, data, menus, url runtime core */
  shared: string;
  recordType: string;
}

function emitPage(s: ScreenSpec, deps: ScreenDeps): GeneratedFile {
  const m = screenModel(s);
  const env = envFor(deps);
  const chunks = new Map(chunksOf(s).map((c) => [c.area, c]));
  const parts = partsOf(s);
  env.part = (name) => [`<${name} />`];
  const areaLines = (a: string): string[] => (chunks.has(a) ? [`<${chunks.get(a)!.name} />`] : walkNodes(s.areas[a] ?? [], env));
  env.outlet = () => reactSyntax.ifChain(m.otherAreas.map((a): [string, string[]] => [`route.area === ${JSON.stringify(a)}`, areaLines(a)]), areaLines(m.listArea));
  const markup = walkNodes(s.layout, env);
  const sources = pageSources(s);
  const imports = [...env.usedParts, ...env.usedOrganisms, ...env.print.helpers].sort();
  const types = [...new Set(sources.map((x) => x.record))].sort().map((r) => `type ${r}`);
  const contents = [
    header,
    ...docsLines(s.docs),
    reactImports(markup, JSON.stringify(chunks.size ? s.layout : [s.layout, s.areas]).includes('"$":"event')),
    wrapList("import {", [...imports, ...types], `} from "${deps.ui}";`),
    ...[...chunks.values(), ...parts].map((c) => `import { ${c.name} } from "./${c.dir}/${c.name}";`),
    `import { fromCodex, matchRoute, type UrlPort } from "${deps.shared}/runtime/core";`,
    ...(sources.length ? [`import { CODEX } from "${deps.shared}/runtime/codex";`] : []),
    `import { toggleTheme } from "${deps.shared}/runtime/theme";`,
    `import { ui } from "${deps.shared}/content";`,
    ...(s.nav ? [`import { navOf } from "${deps.shared}/nav/${s.name}";`] : []),
    ...sources.map((x) => `import { ${x.collection} as ${x.as}Entries } from "${deps.shared}/data/${x.collection}";`),
    ``,
    m.constsTs,
    ``,
    ...sources.map((x) => `const ${x.as} = fromCodex<${x.record}>(${x.as}Entries, ${x.as.toUpperCase()}_FIELDS, CODEX);`),
    `const HOME = { area: ${JSON.stringify(m.listArea)}, params: {} as Record<string, string> };`,
    `const actions = { toggleTheme };`,
    ...(m.namedTs ? [``, m.namedTs] : []),
    ``,
    `export function ${s.name}({ url }: { url: UrlPort }) {`,
    `  const route = matchRoute(ROUTES, url.path) ?? HOME;`,
    ...(s.nav ? [`  const nav = navOf(route.area);`] : []),
    `  return (`,
    ...pad(singleRoot(markup) ? markup : ["<>", ...pad(markup), "</>"], 2),
    `  );`,
    `}`,
    ``,
  ].join("\n");
  return { path: `screens/${s.name}.tsx`, contents };
}

/** one area of a chunked page as its own component: it imports only the data it shows */
function emitChunk(s: ScreenSpec, c: ChunkModel, deps: ScreenDeps): GeneratedFile {
  const env = envFor(deps);
  const nodes = c.nodes;
  const markup = walkNodes(nodes, env);
  const imports = [...env.usedParts, ...env.usedOrganisms, ...env.print.helpers].sort();
  const types = [...new Set(c.sources.map((x) => x.record))].sort().map((r) => `type ${r}`);
  const contents = [
    header,
    `// ${c.doc}`,
    reactImports(markup, JSON.stringify(nodes).includes('"$":"event')),
    wrapList("import {", [...imports, ...types], `} from "${deps.ui}";`),
    ...(c.sources.length ? [`import { fromCodex } from "${deps.shared}/runtime/core";`] : []),
    ...(c.sources.length ? [`import { CODEX } from "${deps.shared}/runtime/codex";`] : []),
    ...(c.actions ? [`import { toggleTheme } from "${deps.shared}/runtime/theme";`] : []),
    `import { ui } from "${deps.shared}/content";`,
    ...c.sources.map((x) => `import { ${x.collection} as ${x.as}Entries } from "${deps.shared}/data/${x.collection}";`),
    ...(c.constsTs ? [``, c.constsTs] : []),
    ``,
    ...c.sources.map((x) => `const ${x.as} = fromCodex<${x.record}>(${x.as}Entries, ${x.as.toUpperCase()}_FIELDS, CODEX);`),
    ...(c.actions ? [`const actions = { toggleTheme };`] : []),
    ...(c.sources.length || c.actions ? [``] : []),
    ...(c.namedTs ? [c.namedTs, ``] : []),
    `export function ${c.name}() {`,
    `  return (`,
    ...pad(singleRoot(markup) ? markup : ["<>", ...pad(markup), "</>"], 2),
    `  );`,
    `}`,
    ``,
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
  return { path: `screens/${c.dir}/${c.name}.tsx`, contents };
}

/** the area files of a screen with `chunks`, and the part files of a page screen with `parts` */
export function emitChunks(s: ScreenSpec, deps: ScreenDeps): GeneratedFile[] {
  return [...chunksOf(s), ...partsOf(s)].map((c) => emitChunk(s, c, deps));
}

export function emitScreen(s: ScreenSpec, deps: ScreenDeps): GeneratedFile {
  if (s.kind === "page") return emitPage(s, deps);
  const m = screenModel(s);
  const env = envFor(deps, ["record"]);
  const areaLines = (a: string): string[] => walkNodes(s.areas[a] ?? [], env);
  env.outlet = () => {
    const branches: Array<[string, string[]]> = m.otherAreas.map((a) => [`route.area === ${JSON.stringify(a)}`, areaLines(a)]);
    return reactSyntax.ifChain(branches, areaLines(m.listArea));
  };
  const markup = walkNodes(s.layout, env);
  const imports = [...env.usedParts, ...env.usedOrganisms, ...env.print.helpers].sort();
  const recordPath = m.recordPathTemplate ? `(id: string) => \`${m.recordPathTemplate}\`` : `() => ${JSON.stringify(m.listPath)}`;
  const recordLookup = m.recordArea ? `route.area === ${JSON.stringify(m.recordArea)} ? ROWS.find((r) => r.id === route.params.${m.recordParam}) : undefined` : "undefined";
  const contents = [
    header,
    ...docsLines(s.docs),
    reactImports(markup, JSON.stringify([s.layout, s.areas]).includes('"$":"event')),
    wrapList("import {", [...imports, `type ${deps.recordType}`], `} from "${deps.ui}";`),
    `import { collectionView, fromCodex, matchRoute, screenActions, type UrlPort } from "${deps.shared}/runtime/core";`,
    `import { CODEX } from "${deps.shared}/runtime/codex";`,
    `import { toggleTheme } from "${deps.shared}/runtime/theme";`,
    `import { ui } from "${deps.shared}/content";`,
    `import { ${s.source!.collection} as entries } from "${deps.shared}/data/${s.source!.collection}";`,
    ``,
    m.constsTs,
    ``,
    `const ROWS = fromCodex<${deps.recordType}>(entries, FIELDS, CODEX);`,
    `const HOME = { area: ${JSON.stringify(m.listArea)}, params: {} as Record<string, string> };`,
    ``,
    `export function ${s.name}({ url }: { url: UrlPort }) {`,
    `  const route = matchRoute(ROUTES, url.path) ?? HOME;`,
    `  const view = collectionView(ROWS, LIST, url.query);`,
    `  const record = ${recordLookup};`,
    `  const actions = screenActions(url, view, ${JSON.stringify(m.listPath)}, ${recordPath}, toggleTheme);`,
    `  return (`,
    ...pad(singleRoot(markup) ? markup : ["<>", ...pad(markup), "</>"], 2),
    `  );`,
    `}`,
    ``,
  ].join("\n");
  return { path: `screens/${s.name}.tsx`, contents };
}
