// Vue 3 output for organisms, screens and chunks. Blocks are `<template v-if>` / `<template v-for>`, render-prop slots are
// scoped slots (`<slot name="item" :item>` / `<template #item="{ item }">`), events are `defineEmits`, derived values `computed`.
import { fileName, presetFile, printBare, printValue, tierDir, typesPath, type OrganismSpec, type ScreenSpec } from "@ui8kit/xgen-screens";
import { htmlPropName } from "@ui8kit/xgen-spec";
import { assetFile, assetTables, BANNER, chainLines, chunksOf, partsOf, cnLines, pageSources, optionalGroups, printVariantTable, wrapList, wrapText, screenModel, type ChunkModel, type RecipeLike, typeName, walkNodes, recordTypes, type GeneratedFile, type PartRef, type Syntax, type WalkEnv } from "@ui8kit/xgen-runtime-core";
import { attrExpr, each, ifChain, slotName, vueAttr } from "./template";

const pad = (lines: string[], n = 1): string[] => lines.map((l) => (l ? "  ".repeat(n) + l : l));

export const vueSyntax: Syntax = {
  runtime: "vue",
  propName(ref: PartRef, canonical: string) {
    if (canonical === "Class") return "class";
    const d = ref.part.props.find((x) => x.name === canonical);
    if (!d) throw new Error(`${ref.part.name}: prop ${canonical} does not exist`);
    return htmlPropName(d);
  },
  eventProp: (ev) => `@${ev}`,
  attrName: (name) => name,
  callbackName: (ev) => `@${ev}`,
  eventType: "Event & { currentTarget: HTMLInputElement }",
  classProp: "class",
  ifChain,
  each,
  slot(name, args, _fn, argNames) {
    const named = name === "children" ? [] : [`name="${name}"`];
    const bound = args.map((a, i) => vueAttr(`${argNames?.[i] ?? `arg${i}`}={${a}}`));
    return [`<${["slot", ...named, ...bound].join(" ")} />`];
  },
  slotProp(name, _params, body, _fn, argNames = [], locals = []) {
    const fields = argNames.map((a, i) => (locals[i] === undefined || locals[i] === a ? a : `${a}: ${locals[i]}`));
    return { child: [`<template #${slotName(name)}${fields.length ? `="{ ${fields.join(", ")} }"` : ""}>`, ...pad(body), "</template>"] };
  },
  // a slot handed on only when the parent filled it, so the inner organism sees the same `$slots`
  forward: (name, from) => ({
    child: [`<template v-if="$slots.${slotName(from)}" #${slotName(name)}><slot${from === "children" ? "" : ` name="${from}"`} /></template>`],
  }),
  attr: vueAttr,
  text: (expr) => `{{ ${expr} }}`,
  fragment: (lines) => lines,
};

export interface ViewDeps {
  parts: Record<string, PartRef>;
  organisms: Record<string, OrganismSpec>;
  /** import path of a part's component file from the folder of the component (`src/blocks/`, `src/components/`) */
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
const docsLines = (docs: string): string[] => { const l = wrapText(docs); return l.length === 1 ? [`<!-- ${l[0]} -->`] : ["<!--", ...l.map((x) => `  ${x}`), "-->"]; };

const header = `<!-- ${BANNER} -->`;

/**
 * The print context: the template reads slots as `$slots.x` and computed values by name; the script reads slots as
 * `slots.x` and computed values as `x.value`. `scope.script` switches between the two while a file is printed.
 */
function envFor(deps: ViewDeps, optional: string[] = [], names: { slots?: string[]; computed?: string[] } = {}): WalkEnv & { scope: { script: boolean } } {
  const scope = { script: false };
  const slots = new Set(names.slots ?? []);
  const computedNames = new Set(names.computed ?? []);
  const print: WalkEnv["print"] = {
    emit: (ev) => `emit("${ev}", `, helpers: new Set(), presets: new Set(), optional: new Set(["record", ...optional]), runtime: "vue",
    rename: (n) => (slots.has(n) ? `${scope.script ? "slots" : "$slots"}.${slotName(n)}` : scope.script && computedNames.has(n) ? `${n}.value` : undefined),
  };
  return { syntax: vueSyntax, parts: deps.parts, organisms: deps.organisms, print, usedParts: new Set(), usedOrganisms: new Set(), usesEach: { value: false }, scope };
}

const constLines = (org: OrganismSpec): string[] =>
  Object.entries(org.consts ?? {}).filter(([name]) => !assetTables(org).includes(name)).flatMap(([name, table]) => [`const ${name}: Record<string, string> = {`, ...Object.entries(table).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`), `};`]);

/** `const x = computed(() => value);`, a long value one choice (or one cn argument) per line */
function computedLine(name: string, value: Parameters<typeof printValue>[0], print: WalkEnv["print"]): string {
  const one = `const ${name} = computed(() => ${printBare(value, print)});`;
  const chain = one.length > 100 ? chainLines(printValue(value, print)) ?? cnLines(printBare(value, print)) : undefined;
  if (chain) return `const ${name} = computed(() =>\n${chain.map((l) => `  ${l}`).join("\n")}\n);`;
  return one.length > 150 ? `const ${name} = computed(() =>\n  ${printBare(value, print)}\n);` : one;
}

export function emitOrganism(org: OrganismSpec, deps: ViewDeps): GeneratedFile[] {
  const slotNames = [...org.slots.map((s) => s.name), ...(org.children ? ["children"] : [])];
  const derivedNames = (org.derived ?? []).map((d) => d.name);
  const env = envFor(deps, optionalGroups(org), { slots: slotNames, computed: derivedNames });
  env.print.optional.delete("record");
  env.slotArity = { ...Object.fromEntries(org.slots.map((s) => [s.name, s.args.length])), ...(org.children ? { children: 0 } : {}) };
  env.slotArgs = Object.fromEntries(org.slots.map((s) => [s.name, s.args.map((a) => a.name)]));
  const markup = walkNodes(org.view, env);
  env.scope.script = true;
  const derived = (org.derived ?? []).map((d) => computedLine(d.name, d.value, env.print));
  const name = org.name;
  const dir = tierDir(org.id);
  const recordNames = Object.keys(org.records);
  const lit = (v: string | number | boolean) => JSON.stringify(v);
  const propLines = [...org.props.map((p) => `  ${p.name}${p.required ? "" : "?"}: ${typeName(p.type)};`), ...(org.className ? [`  class?: string;`] : [])];
  const destructure = [...org.props.map((p) => (p.default === undefined ? p.name : `${p.name} = ${lit(p.default)}`)), ...(org.className ? ["class: className"] : [])];
  const slotTypes = [
    ...(org.children ? [`default?(): unknown;`] : []),
    ...org.slots.map((s) => `${s.name}?(${s.args.length ? `props: { ${s.args.map((a) => `${a.name}: ${typeName(a.type)}`).join("; ")} }` : ""}): unknown;`),
  ];
  const usesSlotsInScript = derived.some((l) => /\bslots\./.test(l));
  const eventTypes = org.events.map((e) => `${e.name}: [${e.args.map((a) => `${a.name}: ${typeName(a.type)}`).join(", ")}];`);
  const partImports = [...env.usedParts].sort().map((p) => `import ${p} from "${deps.partPath(p)}";`);
  const orgImports = [...env.usedOrganisms].sort().map((o) => `import ${o} from "../${tierDir(deps.organisms[o]!.id)}/${fileName(o)}.vue";`);
  const tables = recipeTables(org, deps);
  if (tables.length) env.print.helpers.add("variants");
  const helpers = [...env.print.helpers].sort().filter((h) => h !== "variants");
  const presetImports = [...(env.print.presets ?? [])].sort().map((p) => `import { ${p} } from "../presets/${presetFile(p)}";`);
  const typeHead = [
    ...(recordNames.length ? [`import type { ${recordNames.join(", ")} } from "./${fileName(name)}.types";`] : []),
    ...(org.typeImports ?? []).map((t) => `import type { ${t.names.join(", ")} } from "${typesPath(org.id, deps.organisms[t.from] ?? { id: org.id, name: t.from })}";`),
    ...(tables.length ? [`import { variants } from "../utils";`, ``, ...tables] : []),
  ];
  if (typeHead.length) typeHead.push(``);
  const body = [
    header,
    ...docsLines(org.docs),
    `<script lang="ts">`,
    ...typeHead,
    `export type ${name}Props = {`,
    ...propLines,
    `};`,
    `</script>`,
    ``,
    `<script setup lang="ts">`,
    ...(derived.length ? [`import { computed } from "vue";`] : []),
    ...partImports,
    ...orgImports,
    ...presetImports,
    ...(helpers.length ? [`import { ${helpers.join(", ")} } from "../utils";`] : []),
    ...(assetTables(org).length ? [`import { ${assetTables(org).join(", ")} } from "./${fileName(name)}.assets";`] : []),
    ``,
    ...constLines(org),
    ...(destructure.length ? [wrapList("const {", destructure, `} = defineProps<${name}Props>();`, 110)] : [`defineProps<${name}Props>();`]),
    ...(eventTypes.length ? [wrapList("const emit = defineEmits<{", eventTypes.map((e) => e.replace(/;$/, "")), "}>();", 110)] : []),
    ...(slotTypes.length ? [wrapList(`${usesSlotsInScript ? "const slots = " : ""}defineSlots<{`, slotTypes.map((e) => e.replace(/;$/, "")), "}>();", 110)] : []),
    ...derived,
    `</script>`,
    ``,
    `<template>`,
    ...pad(markup),
    `</template>`,
    ``,
  ].join("\n");
  const out: GeneratedFile[] = [{ path: `${dir}/${fileName(name)}.vue`, contents: body }];
  if (recordNames.length) out.push({ path: `${dir}/${fileName(name)}.types.ts`, contents: `// ${BANNER}\n\n${recordTypes(org, deps.organisms)}\n` });
  if (assetTables(org).length) out.push({ path: `${dir}/${fileName(name)}.assets.ts`, contents: assetFile(org, `// ${BANNER}`) });
  return out;
}

export interface ScreenDeps extends ViewDeps {
  /** names the ui package exports */
  ui: string;
  /** package of the shared app outputs: content, data, menus, url runtime core */
  shared: string;
  recordType: string;
}

const indented = (ts: string): string[] => (ts ? ts.split("\n") : []);

function emitPage(s: ScreenSpec, deps: ScreenDeps): GeneratedFile {
  const m = screenModel(s);
  const env = envFor(deps, [], { computed: ["route", "nav"] });
  const chunks = new Map(chunksOf(s).map((c) => [c.area, c]));
  const parts = partsOf(s);
  env.part = (name) => [`<${name} />`];
  const areaLines = (a: string): string[] => (chunks.has(a) ? [`<${chunks.get(a)!.name} />`] : walkNodes(s.areas[a] ?? [], env));
  env.outlet = () => ifChain(m.otherAreas.map((a): [string, string[]] => [`route.area === ${JSON.stringify(a)}`, areaLines(a)]), areaLines(m.listArea));
  const markup = walkNodes(s.layout, env);
  const sources = pageSources(s);
  const imports = [...env.usedParts, ...env.usedOrganisms, ...env.print.helpers].sort();
  const types = [...new Set(sources.map((x) => x.record))].sort().map((r) => `type ${r}`);
  const contents = [
    header,
    ...docsLines(s.docs),
    `<script setup lang="ts">`,
    `import { computed } from "vue";`,
    wrapList("import {", [...imports, ...types], `} from "${deps.ui}";`, 110),
    ...[...chunks.values(), ...parts].map((c) => `import ${c.name} from "./${c.dir}/${c.name}.vue";`),
    `import { fromCodex, matchRoute, type UrlPort } from "${deps.shared}/runtime/core";`,
    ...(sources.length ? [`import { CODEX } from "${deps.shared}/runtime/codex";`] : []),
    `import { toggleTheme } from "${deps.shared}/runtime/theme";`,
    `import { ui } from "${deps.shared}/content";`,
    ...(s.nav ? [`import { navOf } from "${deps.shared}/nav/${s.name}";`] : []),
    ...sources.map((x) => `import { ${x.collection} as ${x.as}Entries } from "${deps.shared}/data/${x.collection}";`),
    ``,
    ...indented(m.constsTs),
    ``,
    `const { url } = defineProps<{ url: UrlPort }>();`,
    ``,
    ...sources.map((x) => `const ${x.as} = fromCodex<${x.record}>(${x.as}Entries, ${x.as.toUpperCase()}_FIELDS, CODEX);`),
    `const route = computed(() => matchRoute(ROUTES, url.path) ?? { area: ${JSON.stringify(m.listArea)}, params: {} as Record<string, string> });`,
    ...(s.nav ? [`const nav = computed(() => navOf(route.value.area));`] : []),
    `const actions = { toggleTheme };`,
    ...(m.namedTs ? [``, ...indented(m.namedTs)] : []),
    `</script>`,
    ``,
    `<template>`,
    ...pad(markup),
    `</template>`,
    ``,
  ].join("\n");
  return { path: `screens/${s.name}.vue`, contents };
}

/** one area of a chunked page as its own component: it imports only the data it shows */
function emitChunk(s: ScreenSpec, c: ChunkModel, deps: ScreenDeps): GeneratedFile {
  const env = envFor(deps);
  const markup = walkNodes(c.nodes, env);
  const imports = [...env.usedParts, ...env.usedOrganisms, ...env.print.helpers].sort();
  const types = [...new Set(c.sources.map((x) => x.record))].sort().map((r) => `type ${r}`);
  const contents = [
    header,
    `<!-- ${c.doc} -->`,
    `<script setup lang="ts">`,
    wrapList("import {", [...imports, ...types], `} from "${deps.ui}";`, 110),
    ...(c.sources.length ? [`import { fromCodex } from "${deps.shared}/runtime/core";`] : []),
    ...(c.sources.length ? [`import { CODEX } from "${deps.shared}/runtime/codex";`] : []),
    ...(c.actions ? [`import { toggleTheme } from "${deps.shared}/runtime/theme";`] : []),
    `import { ui } from "${deps.shared}/content";`,
    ...c.sources.map((x) => `import { ${x.collection} as ${x.as}Entries } from "${deps.shared}/data/${x.collection}";`),
    ...(c.constsTs ? [``, ...indented(c.constsTs)] : []),
    ``,
    ...c.sources.map((x) => `const ${x.as} = fromCodex<${x.record}>(${x.as}Entries, ${x.as.toUpperCase()}_FIELDS, CODEX);`),
    ...(c.actions ? [`const actions = { toggleTheme };`] : []),
    ...(c.namedTs ? [...(c.sources.length || c.actions ? [``] : []), ...indented(c.namedTs)] : []),
    `</script>`,
    ``,
    `<template>`,
    ...pad(markup),
    `</template>`,
    ``,
  ].join("\n");
  return { path: `screens/${c.dir}/${c.name}.vue`, contents };
}

/** the area files of a screen with `chunks`, and the part files of a page screen with `parts` */
export function emitChunks(s: ScreenSpec, deps: ScreenDeps): GeneratedFile[] {
  return [...chunksOf(s), ...partsOf(s)].map((c) => emitChunk(s, c, deps));
}

export function emitScreen(s: ScreenSpec, deps: ScreenDeps): GeneratedFile {
  if (s.kind === "page") return emitPage(s, deps);
  const m = screenModel(s);
  const env = envFor(deps, ["record"], { computed: ["route", "view", "record", "actions"] });
  const areaLines = (a: string): string[] => walkNodes(s.areas[a] ?? [], env);
  env.outlet = () => ifChain(m.otherAreas.map((a): [string, string[]] => [`route.area === ${JSON.stringify(a)}`, areaLines(a)]), areaLines(m.listArea));
  const markup = walkNodes(s.layout, env);
  const imports = [...env.usedParts, ...env.usedOrganisms, ...env.print.helpers].sort();
  const recordPath = m.recordPathTemplate ? `(id) => \`${m.recordPathTemplate}\`` : `() => ${JSON.stringify(m.listPath)}`;
  const recordLookup = m.recordArea ? `route.value.area === ${JSON.stringify(m.recordArea)} ? rows.find((r) => r.id === route.value.params.${m.recordParam}) : undefined` : "undefined";
  const contents = [
    header,
    ...docsLines(s.docs),
    `<script setup lang="ts">`,
    `import { computed } from "vue";`,
    wrapList("import {", [...imports, `type ${deps.recordType}`], `} from "${deps.ui}";`, 110),
    `import { collectionView, fromCodex, matchRoute, screenActions, type UrlPort } from "${deps.shared}/runtime/core";`,
    `import { CODEX } from "${deps.shared}/runtime/codex";`,
    `import { toggleTheme } from "${deps.shared}/runtime/theme";`,
    `import { ui } from "${deps.shared}/content";`,
    `import { ${s.source!.collection} as entries } from "${deps.shared}/data/${s.source!.collection}";`,
    ``,
    ...indented(m.constsTs),
    ``,
    `const { url } = defineProps<{ url: UrlPort }>();`,
    ``,
    `const rows = fromCodex<${deps.recordType}>(entries, FIELDS, CODEX);`,
    `const route = computed(() => matchRoute(ROUTES, url.path) ?? { area: ${JSON.stringify(m.listArea)}, params: {} as Record<string, string> });`,
    `const view = computed(() => collectionView(rows, LIST, url.query));`,
    `const record = computed(() => ${recordLookup});`,
    `const actions = computed(() => screenActions(url, view.value, ${JSON.stringify(m.listPath)}, ${recordPath}, toggleTheme));`,
    `</script>`,
    ``,
    `<template>`,
    ...pad(markup),
    `</template>`,
    ``,
  ].join("\n");
  return { path: `screens/${s.name}.vue`, contents };
}

export { attrExpr };
