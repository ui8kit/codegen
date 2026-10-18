// The accessible name of the landmarks of a component: every organism whose view holds a landmark (a Block with a
// sectioning or landmark tag, or an organism that holds one, such as NavBlock) gets the optional prop `landmarkLabel`.
// - the root landmark: `aria-label` = landmarkLabel, which replaces its default name (the heading by aria-labelledby, or
//   its own aria-label); without it the default stays;
// - a nested landmark keeps its own name and adds the label after it ("Main navigation, Navigation bar, open panel"),
//   so landmarks of one type stay distinct when a page shows the same block more than once (gallery, catalog, themes);
// - an organism inside passes the label on.
// Pages that repeat a block (variants) set it from the dictionary; elsewhere it is left out and nothing changes.
import { coalesce, cond, ref, tpl, undef, uniq } from "../build";
import type { OrganismSpec, Value, ViewNode } from "../ir";


const PROP = "landmarkLabel";
const LANDMARK_TAGS = new Set(["section", "nav", "aside", "header", "footer"]);
const label = (): Value => ref(PROP);

/** a primitive that renders a landmark: Block with a landmark tag (a computed tag counts) */
function isLandmark(n: ViewNode): boolean {
  if (!("use" in n) || n.use !== "Block") return false;
  const tag = n.props?.["Tag"];
  return typeof tag === "string" ? LANDMARK_TAGS.has(tag) : tag !== undefined;
}

const kids = (n: ViewNode): ViewNode[][] => {
  if ("use" in n) return n.children ? [n.children] : [];
  if ("when" in n) return [n.then, ...(n.else ? [n.else] : [])];
  if ("each" in n) return [n.do];
  if ("organism" in n) return Object.values(n.slots ?? {}).map((s) => s.do);
  return [];
};

function holds(nodes: ViewNode[], labelled: Set<string>): boolean {
  return nodes.some((n) => isLandmark(n) || ("organism" in n && labelled.has(n.organism)) || kids(n).some((k) => holds(k, labelled)));
}

/** name the root landmark: the label replaces the default name */
function nameRoot(n: Extract<ViewNode, { use: string }>): void {
  const attrs = (n.attrs ??= {});
  const by = attrs["aria-labelledby"];
  if (by !== undefined) attrs["aria-labelledby"] = cond(label(), undef(), by);
  const own = attrs["aria-label"];
  attrs["aria-label"] = own !== undefined ? coalesce(label(), own) : label();
}

/** name a nested landmark: its own name, then the label */
function nameNested(n: Extract<ViewNode, { use: string }>): void {
  const attrs = (n.attrs ??= {});
  const own = attrs["aria-label"];
  if (own !== undefined) attrs["aria-label"] = cond(label(), uniq(tpl("{0}, {1}", own, label())), own);
}

function walk(nodes: ViewNode[], root: boolean, labelled: Set<string>): void {
  for (const n of nodes) {
    if ("use" in n && isLandmark(n)) {
      if (root) nameRoot(n); else nameNested(n);
      for (const k of kids(n)) walk(k, false, labelled);
      continue;
    }
    if ("organism" in n && labelled.has(n.organism)) {
      const props = (n.props ??= {});
      // a nested NavBlock (a nav inside a header, a footer, a sidebar) keeps its own name and adds the label after it
      const own = props["label"];
      if (!root && n.organism === "NavBlock" && own !== undefined) props["label"] = cond(label(), uniq(tpl("{0}, {1}", own, label())), own);
      else if (props[PROP] === undefined) props[PROP] = label();
      for (const k of kids(n)) walk(k, false, labelled);
      continue;
    }
    // a root is a top node, or a top node of a branch; a loop body is nested (a landmark per item is never a root)
    if ("when" in n) for (const k of kids(n)) walk(k, root, labelled);
    else for (const k of kids(n)) walk(k, false, labelled);
  }
}

/** add `landmarkLabel` to every organism that holds a landmark (in place, idempotent) */
export function withLandmarkLabels(specs: OrganismSpec[]): void {
  const labelled = new Set<string>();
  for (let grew = true; grew;) {
    grew = false;
    for (const s of specs) if (!labelled.has(s.name) && holds(s.view, labelled)) { labelled.add(s.name); grew = true; }
  }
  for (const s of specs) {
    if (!labelled.has(s.name) || s.props.some((p) => p.name === PROP)) continue;
    // a copy: two specs may share one props array (footer-split-parts), and each needs its own walk
    s.props = [...s.props, { name: PROP, type: "string", docs: "accessible name of the landmark of this component when the page shows it more than once (a variant); replaces the heading name of the root landmark, follows the name of a nested one" }];
    walk(s.view, true, labelled);
  }
}
export const LANDMARK_LABEL = PROP;

/** leave out an organism prop given as a literal equal to the default of that prop (the same output, a shorter file) */
export function dropDefaultProps(specs: OrganismSpec[]): void {
  const byName = new Map(specs.map((s) => [s.name, s]));
  const visit = (nodes: ViewNode[]): void => {
    for (const n of nodes) {
      if ("organism" in n && n.props) {
        const target = byName.get(n.organism);
        for (const [k, v] of Object.entries(n.props)) {
          const p = target?.props.find((x) => x.name === k);
          if (p && p.default !== undefined && (typeof v === "string" || typeof v === "number" || typeof v === "boolean") && v === p.default) delete n.props[k];
        }
      }
      for (const k of kids(n)) visit(k);
    }
  };
  for (const s of specs) visit(s.view);
}
