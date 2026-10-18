// Landmark parts: a nav, a figure and an article that sit inside another Block (a block root, a frame) or repeat in a loop. Each opens
// on its own Block in its own file, so no file nests a Block or repeats one (rule 01). Composition across files is allowed.
import { cn, organism, ref, slot, use } from "../../build";
import type { OrganismSpec, Value, ViewNode } from "../../ir";
import { spec } from "../kit";

const P = "pattern.";
const testid = { name: "testid", type: "string" as const, docs: "data-testid of the root" };

const navBlock = spec(`${P}nav-block`, "NavBlock", "A navigation region in its own file: Block tag nav named by `label`.", {
  props: [{ name: "label", type: "string", docs: "accessible name of the navigation" }, testid],
  className: true,
  children: true,
  view: [use("Block", { props: { Tag: "nav", Class: cn(ref("className")) }, attrs: { "aria-label": ref("label"), "data-testid": ref("testid") } }, slot("children"))],
});

const figureBlock = spec(`${P}figure-block`, "FigureBlock", "Self-contained content with an optional caption (a quote, a picture, a stat) in its own file: Block tag figure.", {
  props: [testid],
  className: true,
  children: true,
  view: [use("Block", { props: { Tag: "figure", Class: cn(ref("className")) }, attrs: { "data-testid": ref("testid") } }, slot("children"))],
});

const articleBlock = spec(`${P}article-block`, "ArticleBlock", "A self-contained item (a review, a card, a project) in its own file: Block tag article.", {
  props: [testid],
  className: true,
  children: true,
  view: [use("Block", { props: { Tag: "article", Class: cn(ref("className")) }, attrs: { "data-testid": ref("testid") } }, slot("children"))],
});

const fill = (children: ViewNode[]) => ({ slots: { children: { args: [] as string[], do: children } } });
const opt = (o: Record<string, Value | undefined>): Record<string, Value> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Record<string, Value>;

/** a nav inside a block: NavBlock */
export const navBlockOf = (label: Value, className: Value | undefined, id: string | undefined, ...children: ViewNode[]): ViewNode =>
  organism("NavBlock", opt({ label, className, testid: id }), fill(children));
/** a figure inside a block or a loop: FigureBlock */
export const figureBlockOf = (className: Value | undefined, id: string | undefined, ...children: ViewNode[]): ViewNode =>
  organism("FigureBlock", opt({ className, testid: id }), fill(children));
/** an article inside a block or a loop: ArticleBlock */
export const articleBlockOf = (className: Value | undefined, id: string | undefined, ...children: ViewNode[]): ViewNode =>
  organism("ArticleBlock", opt({ className, testid: id }), fill(children));

export const landmarkParts: OrganismSpec[] = [navBlock, figureBlock, articleBlock];
