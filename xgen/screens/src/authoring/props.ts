// Prop helpers every block shares: literal unions (tsOf), the common axes (tone, density, cols), id and title,
// the action set of a section and its picture. Blocks and components import them from here.
import { cond, eq, gt, len, ref, undef, organism, when } from "../build";
import type { ViewNode } from "../ir";
import { groupFields, requireFields, ts } from "./kit";

export const tsOf = (...v: string[]) => ts(v.map((x) => JSON.stringify(x)).join(" | "));

export const tone = tsOf("default", "muted");
export const density = tsOf("roomy", "default", "compact");
export const cols = tsOf("1-2", "1-3", "1-4");
export const id = { name: "id", type: "string" as const, required: true };
export const title = { name: "title", type: "string" as const, required: true };
/** the text of the empty state of a list block (no records), from the dictionary */
export const empty = { name: "empty", type: "string" as const, default: "", docs: "the text of the empty state (no records), from the dictionary" };
/** the list `list` or, when it has no records, the EmptyState with the `empty` text (Codex rule: every list block has an empty state) */
/** the part `nodes` only when `list` has records (emptyMode omit: an empty secondary list is left out) */
export const ifAny = (list: string, nodes: ViewNode[]): ViewNode => when(gt(len(ref(list)), 0), nodes);
export const orEmpty = (list: string, icon: string, nodes: ViewNode[], wrap: (n: ViewNode[]) => ViewNode[] = (n) => n): ViewNode =>
  when(eq(len(ref(list)), 0), wrap([organism("EmptyState", { icon, title: ref("empty") })]), nodes);

/** the ActionGroup of a section: from flat props (cta, href, secondary, secondaryHref, actions), or from a grouped prop `group` (group.cta ... group.mode) */
export const actions = (center: ReturnType<typeof eq>, group = ""): ViewNode => {
  const f = (name: string): ReturnType<typeof ref> => ref(group ? `${group}.${name}` : name);
  return organism("ActionGroup", {
    primary: f("cta"), primaryHref: f("href"),
    secondary: cond(eq(group ? f("mode") : ref("actions"), "two"), f("secondary"), undef()), secondaryHref: f("secondaryHref"),
    align: cond(center, "center", "start"),
  });
};
/** the fields of an action set (record ActionSet of CtaActions): one or two links, or a form (an email field, or the prompt box of HeroPrompt) */
export const actionSet = requireFields(groupFields(
  ["mode", tsOf("one", "two", "form"), "one or two links, or a form", "one"],
  ["cta", "string", "primary action label"], ["href", "string", "the address of the primary action; none: a button, not a link"], ["secondary", "string"], ["secondaryHref", "string"],
  ["emailLabel", "string", "label of the form field (the email field, or the prompt line of HeroPrompt)"],
), "cta");
/** an action set without the form: one or two links (record LinkActions of ErrorPage) */
export const linkActions = actionSet
  .filter((f) => f.name !== "emailLabel")
  .map((f) => (f.name === "mode" ? { ...f, type: `"one" | "two"`, docs: "one or two links" } : f));
export const mediaOf = (alt: ReturnType<typeof ref>): ViewNode[] => [organism("MediaFrame", { alt, ratio: "4/3" })];

/** the two-value axes of the lighter blocks */
export const toneLite = tsOf("default", "muted");
export const denseLite = tsOf("default", "compact");
export const roomyLite = tsOf("default", "roomy");
