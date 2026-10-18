// The built-in placeholders of MediaFrame: neutral SVG pictures (a sun over two hills) as base64 data URIs, one for the light theme and one for the dark.
// Flat colors, no gradients, no external files, nothing from a design kit. They stand in for a real `src` so a page looks like it has pictures.
const svg = (bg: string, shape: string, line: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="${bg}"/><circle cx="296" cy="96" r="30" fill="${shape}"/><path d="M0 300V214l96-76 88 70 64-48 152 96v44z" fill="${shape}"/><path d="M0 300v-52l120-60 110 62 60-30 110 80v0z" fill="${line}" opacity="0.55"/></svg>`;
const uri = (s: string): string => `data:image/svg+xml;base64,${Buffer.from(s, "utf8").toString("base64")}`;

export const placeholders = {
  light: uri(svg("#e2e8f0", "#cbd5e1", "#94a3b8")),
  dark: uri(svg("#1e293b", "#334155", "#475569")),
};
