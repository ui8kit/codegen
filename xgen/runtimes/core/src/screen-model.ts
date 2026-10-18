// What a collection screen needs besides markup: the constants of its list, routes and Codex mapping, and the route plan.
import { printPretty, sourcesOf, type ScreenSpec, type SourceSpec, type Value, type ViewNode } from "@ui8kit/xgen-screens";

/** the roots a view tree reads: `{"$":"TOPICS"}` -> TOPICS */
const rootsOf = (nodes: unknown): Set<string> => new Set([...JSON.stringify(nodes).matchAll(/"\$":"([A-Za-z0-9_]+)/g)].map((m) => m[1]!));

/** the sources the screen file itself reads: all of them, or with chunks only those of the frame (the pages read their own) */
export const pageSources = (s: ScreenSpec): Array<SourceSpec & { as: string }> =>
  s.chunks ? sourcesOf(s).filter((x) => rootsOf(s.layout).has(x.as)) : sourcesOf(s);

/** the named values of the screen a view tree reads */
const constsRead = (s: ScreenSpec, nodes: unknown): Array<[string, Value]> => {
  const roots = rootsOf(nodes);
  return Object.entries(s.consts ?? {}).filter(([k]) => roots.has(k));
};

/** `const TOPICS = [...] as const;` for each named value of the screen the view reads; printed after the sources, which they may read */
export function namedConsts(s: ScreenSpec, nodes: unknown): string[] {
  const ctx = { emit: () => "", helpers: new Set<string>(), optional: new Set<string>() };
  return constsRead(s, nodes).map(([k, v]) => `const ${k} = ${printPretty(v, ctx, "", 136)} as const;`);
}

export function printConst(name: string, v: unknown, width = 150): string {
  const one = `const ${name} = ${JSON.stringify(v)} as const;`;
  if (one.length <= width || !v || typeof v !== "object") return one;
  const arr = Array.isArray(v);
  const items = arr ? (v as unknown[]).map((x) => JSON.stringify(x)) : Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${JSON.stringify(x)}`);
  return [`const ${name} = ${arr ? "[" : "{"}`, ...items.map((i) => `  ${i},`), `${arr ? "]" : "}"} as const;`].join("\n");
}

export interface ScreenModel {
  listPath: string;
  listArea: string;
  recordArea: string | null;
  recordParam: string | null;
  /** `plans/${id}` as a TS template literal body */
  recordPathTemplate: string | null;
  /** areas other than the default one, in order */
  otherAreas: string[];
  constsTs: string;
  /** the named values the screen file reads (`const TOPICS = ...`), after its sources */
  namedTs: string;
  file: string;
}

export function screenModel(s: ScreenSpec): ScreenModel {
  const list = s.routes.find((r) => !r.path.includes(":"))!;
  if (s.kind === "page") {
    // a page: the routes table and one field map per source; unknown addresses go to the `notfound` area when there is one, else to the first route
    const q = (v: unknown): string => JSON.stringify(v);
    const fallback = s.areas["notfound"] ? "notfound" : list.area;
    return {
      listPath: list.path, listArea: fallback, recordArea: null, recordParam: null, recordPathTemplate: null,
      otherAreas: [...new Set(s.routes.map((r) => r.area))].filter((a) => a !== fallback),
      constsTs: [
        printConst("ROUTES", s.routes),
        ...pageSources(s).map((x) => printConst(`${x.as.toUpperCase()}_FIELDS`, x.fields)),
      ].join("\n"),
      namedTs: namedConsts(s, s.chunks ? s.layout : [s.layout, s.areas]).join("\n"),
      file: s.name,
    };
  }
  if (!s.list || !s.source) throw new Error(`${s.name}: a collection screen needs source and list`);
  const rec = s.routes.find((r) => r.path.includes(":")) ?? null;
  const param = rec?.path.match(/:([A-Za-z0-9_]+)/)?.[1] ?? null;
  const q = (v: unknown): string => JSON.stringify(v);
  const constsTs = [
    `const LIST = { searchFields: ${q(s.list.searchFields)}, pageSize: ${s.list.pageSize}, defaultSort: ${q(s.list.defaultSort)} } as const;`,
    printConst("ROUTES", s.routes),
    printConst("FIELDS", s.source.fields),
  ].join("\n");
  return {
    listPath: list.path,
    listArea: list.area,
    recordArea: rec?.area ?? null,
    recordParam: param,
    recordPathTemplate: rec && param ? rec.path.replace(`:${param}`, "${id}") : null,
    otherAreas: s.routes.filter((r) => r !== list).map((r) => r.area),
    constsTs,
    namedTs: "",
    file: s.name,
  };
}

/** an area of a page screen emitted as its own component file: what it reads, so the file imports only that */
export interface ChunkModel {
  area: string;
  /** the nodes of the file: the area, or the part */
  nodes: ViewNode[];
  /** the comment line of the file: `The index page of BlocksScreen.` */
  doc: string;
  /** component name: `AccordionPage` */
  name: string;
  /** folder of the chunk files, next to the screen: `BlocksScreen` */
  dir: string;
  sources: Array<SourceSpec & { as: string }>;
  actions: boolean;
  /** `const X_FIELDS = ...` of its sources */
  constsTs: string;
  /** the named values it reads (`const HERO_ACTIONS = ...`), after its sources */
  namedTs: string;
}

const pascal = (s: string): string => s.split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join("");

/** the chunks of a screen with `chunks`: one per area; an area that reads the route, the menu or the url state cannot leave the screen */
export function chunksOf(s: ScreenSpec): ChunkModel[] {
  if (!s.chunks || s.kind !== "page") return [];
  const all = sourcesOf(s);
  return Object.entries(s.areas).map(([area, nodes]) => {
    const json = JSON.stringify(nodes);
    const roots = rootsOf([nodes, constsRead(s, nodes)]);
    for (const r of ["route", "nav", "url", "record", "view"]) if (roots.has(r)) throw new Error(`${s.name}.${area}: the area reads ${r}, so it cannot be its own file`);
    const sources = all.filter((x) => roots.has(x.as));
    return {
      area, nodes, doc: `The ${area} page of ${s.name}.`, name: `${pascal(area)}Page`, dir: s.name, sources, actions: json.includes('"call":"actions.'),
      constsTs: sources.map((x) => printConst(`${x.as.toUpperCase()}_FIELDS`, x.fields)).join("\n"),
      namedTs: namedConsts(s, nodes).join("\n"),
    };
  });
}

/** the parts of a page screen (`ScreenSpec.parts`): one file each next to the screen, placed by a `{ part }` node of the layout */
export function partsOf(s: ScreenSpec): ChunkModel[] {
  if (s.kind !== "page") return [];
  const all = sourcesOf(s);
  return Object.entries(s.parts ?? {}).map(([name, nodes]) => {
    const roots = rootsOf([nodes, constsRead(s, nodes)]);
    for (const r of ["route", "nav", "url", "record", "view"]) if (roots.has(r)) throw new Error(`${s.name}.parts.${name}: a part reads ${r}; only the screen reads it`);
    const sources = all.filter((x) => roots.has(x.as));
    return {
      area: name, nodes, doc: `The ${name} part of ${s.name}: its own file, so each file of the screen opens on one Block.`, name, dir: s.name, sources,
      actions: JSON.stringify(nodes).includes('"call":"actions.'),
      constsTs: sources.map((x) => printConst(`${x.as.toUpperCase()}_FIELDS`, x.fields)).join("\n"),
      namedTs: namedConsts(s, nodes).join("\n"),
    };
  });
}
