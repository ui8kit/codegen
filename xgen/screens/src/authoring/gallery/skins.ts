// The Skins screen (/skins/): tiles that change the look of the whole preview (see compose-skins.ts for the markup).
// Row 1: the default theme and 14 tweakcn skins (CSS in xgen/runtimes/core/assets/styles/skins; sources in skins/NOTICE.md).
// Row 2: ten Google fonts whose subsets hold both latin and cyrillic (checked against the Google Fonts css2 API).
// Row 3: five corner radii. The names and notes go to the dictionary under `skins` (screens/tools/author-block-texts.ts writes them).
import type { ComposedSpec, SkinsBoard } from "../../ir";
import { dictKey } from "../../compose-kit";

/** the skin tiles: data-skin value and name; "default" (the shadcn neutral theme) comes first */
const SKINS: Array<[string, string]> = [
  ["default", "Default"],
  ["modern-minimal", "Modern Minimal"], ["violet-bloom", "Violet Bloom"], ["t3-chat", "T3 Chat"], ["bubblegum", "Bubblegum"],
  ["doom-64", "Doom 64"], ["amber-minimal", "Amber Minimal"], ["supabase", "Supabase"], ["kodama-grove", "Kodama Grove"],
  ["perpetuity", "Perpetuity"], ["cosmic-night", "Cosmic Night"], ["claude", "Claude"], ["mocha-mousse", "Mocha Mousse"],
  ["neo-brutalism", "Neo Brutalism"], ["notebook", "Notebook"],
];

/** the font tiles: Google fonts with latin and cyrillic subsets and the 400 to 700 faces */
const FONTS = ["Inter", "Roboto", "Manrope", "Montserrat", "Rubik", "Nunito", "IBM Plex Sans", "Golos Text", "Onest", "Open Sans"];
const fontId = (family: string): string => family.toLowerCase().replace(/ /g, "-");

/** the radius tiles, in px */
const RADII = [0, 4, 8, 12, 16];

export const skinsBoardSpec: SkinsBoard = {
  skins: SKINS.map(([id]) => id),
  fonts: FONTS.map((family) => ({ id: fontId(family), family })),
  radii: RADII.map((px) => ({ id: `r${px}`, value: `${px}px` })),
};

/** the dictionary part of the Skins screen (ui.skins). The specimen shows Cyrillic letters; it is written as \u escapes so that the
 *  sources stay free of Cyrillic text (xgen check, group text) */
export const skinsTexts = {
  title: "Skins",
  intro: "Change the look of the whole preview: pick a skin, then a font or a corner radius on top of it. The choice applies to every screen and stays after a reload.",
  navLabel: "Skins",
  back: "Back to the skins",
  sample: { card: "Card title", text: "Muted text on a card", button: "Button" },
  skins: {
    title: "Skins",
    text: "The default theme and 14 presets from tweakcn. Each tile is drawn in its own skin.",
    reset: "Back to the build skin",
    names: Object.fromEntries(SKINS.map(([id, name]) => [dictKey(id), name])),
  },
  fonts: {
    title: "Fonts",
    text: "Google fonts with Latin and Cyrillic letters. A font replaces the font of the skin; click it again to go back.",
    reset: "Back to the skin font",
    specimen: "Aa \u0411\u0431 \u042f\u044f",
    pangram: "The quick brown fox jumps over the lazy dog",
    names: Object.fromEntries(FONTS.map((family) => [dictKey(fontId(family)), family])),
  },
  radius: {
    title: "Corner radius",
    text: "A radius replaces the radius of the skin on every plain rounded corner; click it again to go back.",
    reset: "Back to the skin radius",
    names: Object.fromEntries(RADII.map((px) => [`r${px}`, px === 0 ? "0" : `${px} px`])),
  },
};

const portable = { svelte: true, react: true } as const;

/** the Skins screen: built from the board above; nothing is written by hand */
export const skinsComposed: ComposedSpec = {
  $schema: "../../schema/schemas/composed.schema.json",
  specVersion: 1,
  id: "screen.skins",
  name: "SkinsScreen",
  kind: "composed",
  docs: "The Skins screen: tiles that switch the look of the whole preview. A row of skins (the default theme and 14 tweakcn presets, each tile drawn in its skin), a row of Google fonts with Latin and Cyrillic over the font of the skin, and a row of corner radii over the radius of the skin. The tiles are static; the preview runtime (runtime/skins.ts) applies and stores the choice.",
  routes: [],
  frame: { before: [], after: [] },
  areas: {},
  skins: skinsBoardSpec,
  portable,
};
