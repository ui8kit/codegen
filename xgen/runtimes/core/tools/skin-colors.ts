// Colour helpers for the skin CSS: every colour of a skin is written as hsl() (old browsers read hsl, not oklch), and the
// contrast fixes of shots/discovery/contrast-report.md section 4 (OKLCH lightness only, >= 4.6:1) live in FIXES.
// Used by tweakcn-skins.ts (the importer) and by skins-hsl.ts (the one-off converter of the existing files).

export type Rgb = [number, number, number];

const gammaOut = (x: number): number => Math.min(1, Math.max(0, x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055));
const gammaIn = (x: number): number => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);

/** oklch (l 0-1, c, h degrees) to sRGB 0-1, clamped */
export function oklchToRgb(l: number, c: number, h: number): Rgb {
  const a = c * Math.cos((h * Math.PI) / 180), b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3, m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3, s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    gammaOut(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    gammaOut(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    gammaOut(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ];
}

/** a colour string (#rgb, #rrggbb, rgb(), hsl(), oklch(); alpha apart) to sRGB 0-1 and its alpha text ("" when opaque) */
export function parseColor(c: string): { rgb: Rgb; alpha: string } | null {
  const s = c.trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i))) {
    const hex = m[1]!.length === 3 ? m[1]!.replace(/./g, (x) => x + x) : m[1]!;
    const v = parseInt(hex, 16);
    return { rgb: [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255], alpha: "" };
  }
  const alphaOf = (a: string | undefined): string => (a ? a.trim() : "");
  if ((m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[\/,]\s*([\d.]+%?))?\s*\)$/i))) {
    return { rgb: [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255], alpha: alphaOf(m[4]) };
  }
  if ((m = s.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?))?\s*\)$/i))) {
    const l = m[1]!.endsWith("%") ? parseFloat(m[1]!) / 100 : Number(m[1]);
    return { rgb: oklchToRgb(l, Number(m[2]), Number(m[3])), alpha: alphaOf(m[4]) };
  }
  if ((m = s.match(/^hsl\(\s*([\d.]+)(?:deg)?\s+([\d.]+)%\s+([\d.]+)%\s*(?:\/\s*([\d.]+%?))?\s*\)$/i))) {
    const [h, sat, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
    const k = (n: number): number => (n + h / 30) % 12, a = sat * Math.min(l, 1 - l);
    const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return { rgb: [f(0), f(8), f(4)], alpha: alphaOf(m[4]) };
  }
  return null;
}

export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d < 1e-9) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return [h < 0 ? h + 360 : h, s * 100, l * 100];
}

export const luminance = ([r, g, b]: Rgb): number => 0.2126 * gammaIn(r) + 0.7152 * gammaIn(g) + 0.0722 * gammaIn(b);
export function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** CIE76 delta E between two sRGB colours (D65) */
export function deltaE(a: Rgb, b: Rgb): number {
  const lab = (c: Rgb): number[] => {
    const [r, g, bl] = c.map(gammaIn) as Rgb;
    const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
    const x = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * bl) / 0.95047), y = f(0.2126729 * r + 0.7151522 * g + 0.072175 * bl), z = f((0.0193339 * r + 0.119192 * g + 0.9503041 * bl) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
}

const fmt = (n: number, d: number): string => String(Number(n.toFixed(d)));

/** hsl() with the fewest decimals (0, 1, 2, 4) that stay within `maxDE` of the source colour; the alpha is kept as written */
export function toHslCss(color: string, maxDE = 0.5): string {
  const p = parseColor(color);
  if (!p) throw new Error(`skin-colors: cannot read ${color}`);
  const [h, s, l] = rgbToHsl(p.rgb);
  for (const d of [0, 1, 2, 4]) {
    const out = [Number(fmt(h, d)), Number(fmt(s, d)), Number(fmt(l, d))] as const;
    const back = parseColor(`hsl(${out[0]} ${out[1]}% ${out[2]}%)`)!.rgb;
    if (deltaE(back, p.rgb) <= maxDE || d === 4) return `hsl(${out[0]} ${out[1]}% ${out[2]}%${p.alpha ? ` / ${p.alpha}` : ""})`;
  }
  return "";
}

/** contrast fixes (report section 4, OKLCH lightness only): skin -> theme -> token -> sRGB hex of the fixed value */
export const FIXES: Record<string, Record<"light" | "dark", Record<string, string>>> = {
  default: { light: { "muted-foreground": "#6f6f6f", destructive: "#f11d1b" }, dark: { destructive: "#d13842" } },
  "modern-minimal": { light: { primary: "#2a70e3", destructive: "#dd3035" }, dark: { primary: "#2a70e3", destructive: "#dd3035" } },
  "violet-bloom": { light: { accent: "#ebf4ff", destructive: "#d53b42" }, dark: { primary: "#8453f5", destructive: "#ca474b" } },
  bubblegum: { light: { "muted-foreground": "#5d5d5d", primary: "#c4448e", destructive: "#cc464b" }, dark: { accent: "#97506b" } },
  "doom-64": { light: { "muted-foreground": "#424242", accent: "#3d79aa" }, dark: { primary: "#dd302e" } },
  "amber-minimal": { light: { destructive: "#dd3035" }, dark: { destructive: "#dd3035" } },
  "kodama-grove": { light: { "muted-foreground": "#625449", primary: "#6b792a", destructive: "#a55c50" }, dark: { "muted-foreground": "#bab2a8", destructive: "#94584d" } },
  perpetuity: { light: { "muted-foreground": "#376f73", primary: "#00818a" }, dark: { destructive: "#d3232a" } },
  "cosmic-night": { light: { "muted-foreground": "#6a6a88", destructive: "#db2f54" }, dark: { destructive: "#db2f54" } },
  claude: { light: { "muted-foreground": "#696863", primary: "#bb5836" }, dark: { primary: "#b8593a", destructive: "#dd3035" } },
  "mocha-mousse": { light: { "muted-foreground": "#704d43", primary: "#966b59", secondary: "#81735c" }, dark: { "muted-foreground": "#d0b4a5", secondary: "#886358" } },
  "neo-brutalism": { light: { primary: "#e90a1d" }, dark: {} },
  notebook: { light: { destructive: "#aa5f60" }, dark: { "muted-foreground": "#b4b4b4", secondary: "#4d4d4d" } },
  sky: { light: { primary: "#c84e00", destructive: "#d92c32" }, dark: { primary: "#cc4a00" } },
};
