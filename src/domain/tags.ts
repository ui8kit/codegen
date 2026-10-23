/**
 * Tag groups — the cross-runtime SSOT for the `tag` prop of the polymorphic
 * primitives (Box, Text). Only real HTML5 element names are allowed; layout
 * vocabulary (block, stack, grid, …) is never a tag.
 */

export const BOX_TAGS = [
  "div", "section", "article", "aside", "header", "footer", "main", "nav", "figure", "search",
  "ul", "ol", "li", "dl", "dt", "dd", "fieldset",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
] as const;

export const TEXT_TAGS = [
  "p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "figcaption", "pre", "code",
  "small", "strong", "em", "time", "legend", "del", "ins",
] as const;

export const TAG_GROUPS = {
  Box: BOX_TAGS,
  Text: TEXT_TAGS,
} as const;

export type TagGroupName = keyof typeof TAG_GROUPS;
export type BoxTag = (typeof BOX_TAGS)[number];
export type TextTag = (typeof TEXT_TAGS)[number];

export function allowedTags(group: TagGroupName): readonly string[] {
  return TAG_GROUPS[group];
}

export function isAllowedTag(tag: string, group: TagGroupName): boolean {
  return (TAG_GROUPS[group] as readonly string[]).includes(tag.trim().toLowerCase());
}

/** Returns `tag` when allowed for `group`, otherwise `fallback`. */
export function resolveTag(tag: string | undefined, fallback: string, group: TagGroupName): string {
  const t = (tag ?? "").trim().toLowerCase();
  if (t === "") return fallback;
  return isAllowedTag(t, group) ? t : fallback;
}

export const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
]);
