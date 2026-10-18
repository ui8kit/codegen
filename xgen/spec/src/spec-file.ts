// The JSON form of a brick spec (xgen/specs/ui/<name>.json): the typed render model plus the runtime-independent contract
// (slots, events, a11y, data attributes, tokens, examples, portability). Variants live next to it in <name>.variants.json.
import type { PartDef } from "./domain/model";

export type PortableFlag = true | { portable: false; reason: string };
/** the runtimes xgen emits ui packages and hosts for */
export const UI_RUNTIMES = ["svelte", "react", "vue", "solid"] as const;
export type UiRuntime = (typeof UI_RUNTIMES)[number];
/** the portability of a spec to a runtime. Vue shares the template model of Svelte (blocks, slots, attributes): a spec
 * that says nothing about Vue follows its Svelte flag, a spec that does not carry over says so with its own `vue` flag. Solid shares
 * the JSX model of React (render props, no snippets): a spec that says nothing about Solid follows its React flag. */
export const portableTo = (p: { svelte: PortableFlag; react: PortableFlag; vue?: PortableFlag; solid?: PortableFlag }, rt: UiRuntime): PortableFlag =>
  rt === "vue" ? p.vue ?? p.svelte : rt === "solid" ? p.solid ?? p.react : p[rt];

export interface SlotInfo { name: string; docs?: string; /** arguments of a render-prop slot */ args?: string[] }
export interface EventInfo { name: string; payload?: string; docs?: string }
export interface A11yInfo {
  /** root tags the part can render */
  roots: string[];
  /** static role values written by the part */
  roles: string[];
  /** aria-* and role attributes: how they are produced */
  aria: Array<{ name: string; kind: "static" | "expr" | "bool"; value?: string }>;
  /** keyboard contract; primitives are native elements, so none */
  keyboard: string[];
  notes?: string;
}
export interface DataAttr { name: string; kind: "static" | "expr" | "bool"; value?: string }

export interface SpecPart extends PartDef {
  slots: SlotInfo[];
  events: EventInfo[];
  a11y: A11yInfo;
  data: DataAttr[];
  /** theme tokens (--primary …) the recipe classes use */
  tokens: string[];
}

export interface SpecExample { id: string; props: Record<string, unknown>; children?: Record<string, unknown> }

export interface SpecFile {
  $schema?: string;
  specVersion: 1;
  /** `ui.button` */
  id: string;
  tier: "brick";
  dir: string;
  file?: string;
  docs: string;
  /** recipe id -> variants.json file name (next to the spec) */
  variants: Record<string, string>;
  recordTypes?: Array<{ name: string; fields: Array<{ name: string; type: "string" | "bool"; docs?: string }> }>;
  parts: SpecPart[];
  examples: SpecExample[];
  /** per runtime: true, or { portable: false, reason } */
  portable: { svelte: PortableFlag; react: PortableFlag; vue?: PortableFlag };
  /** differences a runtime has on purpose, with the contract that replaces the missing feature */
  runtimeNotes?: Array<{ runtime: "svelte" | "react"; part?: string; note: string }>;
}
