// The numbers and patterns the audit rules of `xgen check` stand on. One place, so a rule can be read and changed without searching the code.

/** the longest source file of a package, in lines; a longer file is split by concern */
export const MAX_FILE_LINES = 350;
/** the longest line of a source file, in characters (the authoring tables are wide on purpose, not without end) */
export const MAX_LINE_CHARS = 600;

/** limits of the generated code (the `readability` group): what a junior can read in one sitting */
export const READABILITY = {
  /** lines of a generated component file (primitive, component or block) */
  fileLines: 150,
  /** lines of a generated screen of a host app */
  screenLines: 600,
  /** size of a generated component file */
  fileBytes: 8000,
  /** characters of a line of generated code */
  lineChars: 160,
  /** props of a component (variant props included) */
  props: 12,
};

/** the spec folders the `corners` group reads */
export const CORNER_DIRS = ["ui", "recipes", "parts", "patterns", "organisms", "blocks", "screens", "presets"] as const;
/** the only files that may hold rounded-full or rounded-none, how many, and why; everything else is plain `rounded` (the theme radius) */
export const CORNER_ALLOW: Record<string, { full?: number; none?: number; why: string }> = {
  "specs/ui/radio.variants.json": { full: 1, why: "the radio control is a circle: the shape says one of many" },
  "specs/ui/badge.variants.json": { full: 1, why: "a badge is a pill: a short status or count label, never a control" },
  "specs/parts/pill.json": { full: 1, why: "the status pill (a tinted badge with an icon)" },
  "specs/organisms/hero-badge.json": { full: 1, why: "a composite badge on a dark band: a pill around a Badge mark" },
  "specs/ui/switch.variants.json": { full: 1, why: "the switch track is a pill around its round knob" },
  "specs/recipes/avatar.variants.json": { full: 1, why: "an avatar is always round" },
  "specs/parts/timeline.json": { full: 1, why: "the status dot of a timeline entry" },
  "specs/organisms/skeleton-layout.json": { full: 1, why: "the skeleton of an avatar keeps the avatar's circle" },
  "specs/organisms/quote-card.json": { full: 2, why: "the author's avatar picture (a MediaFrame in an avatar's circle), card and plain forms" },
  "specs/organisms/review-list.json": { full: 1, why: "the reviewer's avatar picture" },
  "specs/organisms/profile-form.json": { full: 1, why: "the profile's avatar picture" },
  "specs/organisms/post-header.json": { full: 1, why: "the author's avatar picture" },
  "specs/organisms/post-author.json": { full: 1, why: "the author's avatar picture" },
  "specs/organisms/post-feature.json": { full: 1, why: "the author's avatar picture" },
  "specs/organisms/media-posts.json": { full: 1, why: "the dot before each post (a list marker)" },
  "specs/organisms/story-dots.json": { full: 1, why: "the step dots under the carousel picture" },
  "specs/organisms/sidebar-nav.json": { full: 1, why: "the signed-in user's avatar picture" },
  "specs/organisms/hero-split-extras.json": { full: 2, why: "the faces of the proof row and the quote author (avatar pictures)" },
  "specs/organisms/shell-topbar.json": { full: 1, why: "the signed-in user's avatar picture in the top bar" },
  "specs/ui/dialog.variants.json": { none: 1, why: "the sheet fills the screen; a corner would show the page behind it" },
  "specs/patterns/backdrop.json": { none: 1, why: "the backdrop picture fills its section edge to edge (not a framed picture)" },
  "specs/organisms/over-media.json": { none: 1, why: "the picture under a transparent bar fills the band edge to edge" },
};
/** the shadow classes a spec may use: one per floating layer, from the shadcn scale (flat surfaces use the border edge only) */
export const SHADOWS = ["shadow-md", "shadow-lg"] as const;
/** the only files that may hold a shadow, which one, how many, and why */
export const SHADOW_ALLOW: Record<string, { shadow: (typeof SHADOWS)[number]; n: number; why: string }> = {
  "specs/organisms/hero-split-media.json": { shadow: "shadow-lg", n: 1, why: "the plan cards float over the hero picture" },
  "specs/ui/dialog.variants.json": { shadow: "shadow-lg", n: 1, why: "a dialog or sheet floats over the page" },
  "specs/ui/sheet.json": { shadow: "shadow-lg", n: 1, why: "the sheet panel is a side drawer over the page (fixed overlay)" },
  "specs/organisms/video-modal.json": { shadow: "shadow-lg", n: 1, why: "a modal dialog over the page" },
  "specs/parts/notice.json": { shadow: "shadow-lg", n: 1, why: "the toast is fixed to the corner of the screen, over the page" },
  "specs/recipes/dropdown-menu.variants.json": { shadow: "shadow-md", n: 1, why: "a menu panel floats at its trigger" },
  "specs/organisms/tour-callout.json": { shadow: "shadow-md", n: 1, why: "a popover callout pointing at its target" },
  "specs/organisms/cart-drawer.json": { shadow: "shadow-lg", n: 1, why: "the cart drawer is a sheet over the page (drawn in its open state)" },
  "specs/organisms/offer-media.json": { shadow: "shadow-lg", n: 1, why: "the offer card floats over the hero picture" },
};
/** kit.css utilities whose radius is not derived from --radius, with the only value they may use */
export const KIT_RADIUS_ALLOW: Record<string, string> = {
  "radio-glyph": "9999px",
  "switch-knob": "9999px",
};

/** packages of the generation layer, lowest first: a package may import only the ones before it and must declare them in its package.json */
export const LAYERS: ReadonlyArray<{ dir: string; name: string }> = [
  { dir: "schema", name: "@ui8kit/xgen-schema" },
  { dir: "spec", name: "@ui8kit/xgen-spec" },
  { dir: "screens", name: "@ui8kit/xgen-screens" },
  { dir: "runtimes/core", name: "@ui8kit/xgen-runtime-core" },
  { dir: "runtimes/svelte", name: "@ui8kit/xgen-runtime-svelte" },
  { dir: "runtimes/react", name: "@ui8kit/xgen-runtime-react" },
  { dir: "runtimes/vue", name: "@ui8kit/xgen-runtime-vue" },
  { dir: "generator", name: "@ui8kit/xgen-generator" },
  { dir: "check", name: "@ui8kit/xgen-check" },
  { dir: "cli", name: "@ui8kit/xgen" },
];
/** packages that do not know each other, whatever their order above */
export const SIBLINGS: ReadonlyArray<readonly [string, string]> = [
  ["@ui8kit/xgen-runtime-svelte", "@ui8kit/xgen-runtime-react"],
  ["@ui8kit/xgen-runtime-svelte", "@ui8kit/xgen-runtime-vue"],
  ["@ui8kit/xgen-runtime-react", "@ui8kit/xgen-runtime-vue"],
];
/** the packages below the apps: they must not name an app, a screen or a theme */
export const CORE_DIRS = ["schema", "spec", "runtimes/core", "runtimes/svelte", "runtimes/react", "runtimes/vue", "generator"];
export const APP_SPECIFIC = /screen\.(site|blocks|plans|theme)|Northwind|\b(blocks|demo|landing|marketing|commerce|promo|content|account|dashboard|onboarding|support)-(svelte|react|vue|landing|product|pricing|shop|campaign|blog|portal|console|flow|center)\b/;

/** what an organism, a pattern or a part may not carry in a class string: sizes and colors outside the scale and the shadcn tokens (a grid template such as grid-cols-[16rem_1fr] is a layout, not a size, and passes) */
export const HARDCODE = {
  arbitrary: /(?<!grid-cols|grid-rows)-\[[^\]]*(\d(px|rem|em|%|vh|vw|ch)|#[0-9a-fA-F]{3,8}|rgb|hsl|oklch)[^\]]*\]/g,
  hex: /#[0-9a-fA-F]{6}\b/g,
  palette: /\b(?:bg|text|border|ring|fill|stroke|inset-ring|divide|outline|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g,
  stringified: /\[object /g,
};
/** specs that keep values the rules forbid: how many (exactly) and why. A file with more fails (a new hardcoded value);
 * a file with fewer fails until its number here is lowered, so the list only shrinks. Every other file must hold none. */
export const HARDCODE_ALLOW: Record<string, { n: number; why: string }> = {
  "specs/parts/pill.json": { n: 48, why: "tones of a status chip are the palette on purpose; shadcn has no tokens for them" },
  "specs/parts/timeline.json": { n: 4, why: "the dots of a timeline are data colors (success, info, warning, danger)" },
};

/** every rounded-* class of a text (with or without a variant prefix such as `open:` or `[&::-webkit-slider-thumb]:`) */
export const cornerClasses = (text: string): string[] => [...text.matchAll(/(?<![\w-])rounded-(\[[^\]\s"]*\]|[a-z0-9]+(?:-[a-z0-9]+)*)/g)].map((m) => m[0]);
/** every shadow class of a text (shadow, shadow-*, drop-shadow-*, inset-shadow-*, with or without a variant prefix) */
export const shadowClasses = (text: string): string[] => [...text.matchAll(/(?<![\w-])(?:drop-|inset-)?shadow(?:-(?:\[[^\]\s"]*\]|[a-z0-9]+(?:-[a-z0-9]+)*))?(?![\w-])/g)].map((m) => m[0]);
