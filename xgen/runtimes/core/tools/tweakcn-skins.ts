// Imports skins from the tweakcn presets (github.com/jnsahaj/tweakcn, Apache-2.0; see assets/styles/skins/NOTICE.md).
// For each preset in PICK it writes assets/styles/skins/<slug>.css (the light and dark tokens, the font, the radius, the shadows
// and the tracking, as tweakcn exports them), records the Google fonts of the skin in skins.json and lists the files in skins.css.
// The values are tweakcn's; only the selectors are ours: data-skin on <html> (the whole page) or on any element (a tile of /skins/).
// Run from the workspace root: bun xgen/runtimes/core/tools/tweakcn-skins.ts   (needs the network: GitHub and Google Fonts)
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FIXES, toHslCss } from "./skin-colors";

/** the tweakcn commit the presets are read from */
const COMMIT = "a3b47b37cba97dd637de517aab52c45ec0f83456";
const PRESETS_URL = `https://raw.githubusercontent.com/jnsahaj/tweakcn/${COMMIT}/utils/theme-presets.ts`;
const SKINS_DIR = join(import.meta.dir, "..", "assets", "styles", "skins");

/** the presets we take, in the order of the Skins screen: 14 that look different from each other */
export const PICK = [
  "modern-minimal", "violet-bloom", "t3-chat", "bubblegum", "doom-64", "amber-minimal", "supabase",
  "kodama-grove", "perpetuity", "cosmic-night", "claude", "mocha-mousse", "neo-brutalism", "notebook",
];

type Styles = Record<string, string>;
interface Preset { label: string; styles: { light: Styles; dark: Styles } }

// tweakcn's defaults (config/theme.ts): a preset only lists what differs from them
const DEFAULT_LIGHT: Styles = {
  background: "oklch(1 0 0)", foreground: "oklch(0.145 0 0)", card: "oklch(1 0 0)", "card-foreground": "oklch(0.145 0 0)",
  popover: "oklch(1 0 0)", "popover-foreground": "oklch(0.145 0 0)", primary: "oklch(0.205 0 0)", "primary-foreground": "oklch(0.985 0 0)",
  secondary: "oklch(0.97 0 0)", "secondary-foreground": "oklch(0.205 0 0)", muted: "oklch(0.97 0 0)", "muted-foreground": "oklch(0.556 0 0)",
  accent: "oklch(0.97 0 0)", "accent-foreground": "oklch(0.205 0 0)", destructive: "oklch(0.577 0.245 27.325)", "destructive-foreground": "oklch(1 0 0)",
  border: "oklch(0.922 0 0)", input: "oklch(0.922 0 0)", ring: "oklch(0.708 0 0)",
  "chart-1": "oklch(0.81 0.10 252)", "chart-2": "oklch(0.62 0.19 260)", "chart-3": "oklch(0.55 0.22 263)", "chart-4": "oklch(0.49 0.22 264)", "chart-5": "oklch(0.42 0.18 266)",
  radius: "0.625rem",
  sidebar: "oklch(0.985 0 0)", "sidebar-foreground": "oklch(0.145 0 0)", "sidebar-primary": "oklch(0.205 0 0)", "sidebar-primary-foreground": "oklch(0.985 0 0)",
  "sidebar-accent": "oklch(0.97 0 0)", "sidebar-accent-foreground": "oklch(0.205 0 0)", "sidebar-border": "oklch(0.922 0 0)", "sidebar-ring": "oklch(0.708 0 0)",
  "font-sans": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
  "font-serif": 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  "font-mono": 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  "shadow-color": "oklch(0 0 0)", "shadow-opacity": "0.1", "shadow-blur": "3px", "shadow-spread": "0px", "shadow-offset-x": "0", "shadow-offset-y": "1px",
  "letter-spacing": "0em",
};
const DEFAULT_DARK: Styles = {
  ...DEFAULT_LIGHT,
  background: "oklch(0.145 0 0)", foreground: "oklch(0.985 0 0)", card: "oklch(0.205 0 0)", "card-foreground": "oklch(0.985 0 0)",
  popover: "oklch(0.269 0 0)", "popover-foreground": "oklch(0.985 0 0)", primary: "oklch(0.922 0 0)", "primary-foreground": "oklch(0.205 0 0)",
  secondary: "oklch(0.269 0 0)", "secondary-foreground": "oklch(0.985 0 0)", muted: "oklch(0.269 0 0)", "muted-foreground": "oklch(0.708 0 0)",
  accent: "oklch(0.371 0 0)", "accent-foreground": "oklch(0.985 0 0)", destructive: "oklch(0.704 0.191 22.216)", "destructive-foreground": "oklch(0.985 0 0)",
  border: "oklch(0.275 0 0)", input: "oklch(0.325 0 0)", ring: "oklch(0.556 0 0)",
  sidebar: "oklch(0.205 0 0)", "sidebar-foreground": "oklch(0.985 0 0)", "sidebar-primary": "oklch(0.488 0.243 264.376)", "sidebar-primary-foreground": "oklch(0.985 0 0)",
  "sidebar-accent": "oklch(0.269 0 0)", "sidebar-accent-foreground": "oklch(0.985 0 0)", "sidebar-border": "oklch(0.275 0 0)", "sidebar-ring": "oklch(0.439 0 0)",
};

const COLORS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary", "primary-foreground",
  "secondary", "secondary-foreground", "muted", "muted-foreground", "accent", "accent-foreground", "destructive", "destructive-foreground",
  "border", "input", "ring", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
  "sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground", "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
];

/** a preset merged with the defaults the way tweakcn does it: dark = defaults, then the light values, then the dark ones */
const merged = (p: Preset): { light: Styles; dark: Styles } => ({
  light: { ...DEFAULT_LIGHT, ...p.styles.light },
  dark: { ...DEFAULT_DARK, ...p.styles.light, ...p.styles.dark },
});

// ---- the shadow colour as "h s% l%", the way tweakcn prints it (utils/color-converter.ts) ----

/** tweakcn's number format: whole numbers as they are, others with 4 decimals, 0 for nothing */
const num = (n: number | undefined): string => (!n ? "0" : n % 1 === 0 ? String(n) : n.toFixed(4));

function rgbToHsl(r: number, g: number, b: number): [number | undefined, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d === 0) return [undefined, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return [h < 0 ? h + 360 : h, s, l];
}

/** oklch (l 0-1, c, h in degrees) to sRGB 0-1 */
function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180), b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3, m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3, s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_];
  const gamma = (x: number): number => Math.min(1, Math.max(0, x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055));
  return [gamma(lin[0]!), gamma(lin[1]!), gamma(lin[2]!)];
}

/** a colour of a preset (hex, hsl() or oklch()) as tweakcn's "h s% l%" (alpha dropped: the shadow opacity carries it) */
export function hslOf(color: string): string {
  const c = color.trim();
  let h: number | undefined, s: number, l: number;
  const hex = c.match(/^#([0-9a-f]{6})$/i);
  const hsl = c.match(/^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/i);
  const ok = c.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (hex) {
    const v = parseInt(hex[1]!, 16);
    [h, s, l] = rgbToHsl(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
  } else if (hsl) {
    [h, s, l] = [Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100];
  } else if (ok) {
    [h, s, l] = rgbToHsl(...oklchToRgb(Number(ok[1]), Number(ok[2]), Number(ok[3])));
  } else throw new Error(`tweakcn-skins: cannot read the colour ${color}`);
  return `${num(h)} ${num(s * 100)}% ${num(l * 100)}%`;
}

/** the shadow scale of one mode, as tweakcn builds it (utils/shadows.ts) */
export function shadowsOf(st: Styles): Array<[string, string]> {
  const hsl = hslOf(st["shadow-color"]!);
  const [x, y, blur, spread] = [st["shadow-offset-x"], st["shadow-offset-y"], st["shadow-blur"], st["shadow-spread"]];
  const opacity = parseFloat(st["shadow-opacity"]!);
  const color = (times: number): string => `hsl(${hsl} / ${(opacity * times).toFixed(2)})`;
  const first = (times: number): string => `${x} ${y} ${blur} ${spread} ${color(times)}`;
  const second = (y2: string, blur2: string): string => `${x} ${y2} ${blur2} ${parseFloat(spread ?? "0") - 1}px ${color(1)}`;
  return [
    ["shadow-2xs", first(0.5)], ["shadow-xs", first(0.5)],
    ["shadow-sm", `${first(1)}, ${second("1px", "2px")}`], ["shadow", `${first(1)}, ${second("1px", "2px")}`],
    ["shadow-md", `${first(1)}, ${second("2px", "4px")}`], ["shadow-lg", `${first(1)}, ${second("4px", "6px")}`],
    ["shadow-xl", `${first(1)}, ${second("8px", "10px")}`], ["shadow-2xl", first(2.5)],
  ];
}

// ---- fonts ----

/** families every system has (or the generic ones): never fetched, even when Google Fonts happens to answer for the name */
const SYSTEM = new Set(["sans-serif", "serif", "monospace", "system-ui", "cursive", "Courier New", "Courier", "Georgia", "Times New Roman", "Times", "Arial", "Helvetica", "Menlo"]);
/** the first family of a font stack, without quotes: "\"Oxanium\", sans-serif" is Oxanium */
const familyOf = (stack: string): string => stack.split(",")[0]!.trim().replace(/^["']|["']$/g, "");

/** the weights Google Fonts serves for a family (400-700 asked), or null when it is not a Google font */
async function googleWeights(family: string): Promise<number[] | null> {
  if (SYSTEM.has(family) || family.startsWith("ui-")) return null;
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@400;500;600;700&display=swap`;
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36" } });
  if (!res.ok) return null;
  return [...new Set([...(await res.text()).matchAll(/font-weight: (\d+)/g)].map((m) => Number(m[1])))].sort();
}

// ---- the CSS of one skin ----

const block = (selector: string, lines: string[]): string => `${selector} {\n${lines.map((l) => `  ${l}`).join("\n")}\n}\n`;
const DARK = (slug: string): string => `:is(.dark, [data-theme="dark"]) [data-skin="${slug}"],\n[data-skin="${slug}"]:is(.dark, [data-theme="dark"])`;

/** a token as hsl() (old browsers read hsl, not oklch), with the contrast fix of skin-colors.ts FIXES when the token has one */
const colorOf = (slug: string, theme: "light" | "dark", token: string, value: string): string =>
  toHslCss(FIXES[slug]?.[theme]?.[token] ?? value, FIXES[slug]?.[theme]?.[token] ? 0.25 : 0.5);

async function skinCss(slug: string, p: Preset): Promise<{ css: string; fonts: string[] }> {
  const { light, dark } = merged(p);
  const fonts: string[] = [];
  const weightLines: string[] = [];
  for (const stack of new Set([light["font-sans"]!, dark["font-sans"]!])) {
    const family = familyOf(stack);
    const weights = await googleWeights(family);
    if (!weights) continue;
    fonts.push(`${family.replace(/ /g, "+")}:wght@${weights.join(";")}`);
    // a family without medium or semibold faces: point those weights at real faces (as sky does for Istok Web)
    if (stack === light["font-sans"] && !weights.includes(500)) weightLines.push(`--font-weight-medium: ${weights.includes(400) ? 400 : weights[0]};`);
    if (stack === light["font-sans"] && !weights.includes(600)) weightLines.push(`--font-weight-semibold: ${weights.includes(700) ? 700 : weights[weights.length - 1]};`);
  }
  const tracking = light["letter-spacing"] !== "0em";
  const lightLines = [
    ...COLORS.map((k) => `--${k}: ${colorOf(slug, "light", k, light[k]!)};`),
    `--font-sans: ${light["font-sans"]};`, `--font-serif: ${light["font-serif"]};`, `--font-mono: ${light["font-mono"]};`,
    ...weightLines,
    `--radius: ${light.radius};`,
    ...shadowsOf(light).map(([k, v]) => `--${k}: ${v};`),
    ...(tracking ? [
      `--tracking-normal: ${light["letter-spacing"]};`,
      "--tracking-tighter: calc(var(--tracking-normal) - 0.05em);", "--tracking-tight: calc(var(--tracking-normal) - 0.025em);",
      "--tracking-wide: calc(var(--tracking-normal) + 0.025em);", "--tracking-wider: calc(var(--tracking-normal) + 0.05em);", "--tracking-widest: calc(var(--tracking-normal) + 0.1em);",
    ] : []),
  ];
  const darkLines = [
    ...COLORS.map((k) => `--${k}: ${colorOf(slug, "dark", k, dark[k]!)};`),
    ...(["font-sans", "font-serif", "font-mono", "radius"] as const).filter((k) => dark[k] !== light[k]).map((k) => `--${k}: ${dark[k]};`),
    ...shadowsOf(dark).map(([k, v]) => `--${k}: ${v};`),
  ];
  const head = [
    `/* Skin "${slug}" (${p.label}): the tweakcn preset "${slug}" (Apache-2.0, see NOTICE.md), written by xgen/runtimes/core/tools/tweakcn-skins.ts.`,
    `   On when data-skin="${slug}" is on <html> (the page) or on any element (a tile of /skins/). Values as tweakcn exports them;`,
    `   the spacing scale stays the kit's 0.25rem. Fonts: ${fonts.length ? fonts.map((f) => f.split(":")[0]!.replace(/\+/g, " ")).join(", ") + " (Google Fonts, loaded when the skin is on)" : "system"}. */`,
  ].join("\n");
  const shadowUse = ["shadow-xs", "shadow-sm", "shadow", "shadow-md", "shadow-lg", "shadow-xl"].map((k) => `[data-skin="${slug}"] .${k} { --tw-shadow: var(--${k}); }`).join("\n");
  const css = [
    head,
    block(`[data-skin="${slug}"]`, lightLines),
    block(DARK(slug), darkLines),
    ...(tracking ? [`:root[data-skin="${slug}"] body { letter-spacing: var(--tracking-normal); }`] : []),
    shadowUse,
    "",
  ].join("\n");
  return { css, fonts };
}

async function main(): Promise<void> {
  // the presets file is TypeScript with one type import: drop the types, then import it
  const source = await (await fetch(PRESETS_URL)).text();
  const dir = mkdtempSync(join(tmpdir(), "tweakcn-"));
  const file = join(dir, "presets.ts");
  writeFileSync(file, source.replace(/^import .*$/m, "").replace(": Record<string, ThemePreset>", ""));
  const { defaultPresets } = (await import(file)) as { defaultPresets: Record<string, Preset> };
  const registry = JSON.parse(readFileSync(join(SKINS_DIR, "skins.json"), "utf8")) as Record<string, { label: string; source: string; fonts: string[] }>;
  for (const slug of PICK) {
    const p = defaultPresets[slug];
    if (!p) throw new Error(`tweakcn-skins: no preset ${slug}`);
    const { css, fonts } = await skinCss(slug, p);
    writeFileSync(join(SKINS_DIR, `${slug}.css`), css);
    registry[slug] = { label: p.label, source: `tweakcn ${COMMIT.slice(0, 7)}`, fonts };
    console.log(`${slug}: ${p.label}${fonts.length ? `, ${fonts.join(" ")}` : ""}`);
  }
  writeFileSync(join(SKINS_DIR, "skins.json"), JSON.stringify(registry, null, 2) + "\n");
}

if (import.meta.main) await main();
