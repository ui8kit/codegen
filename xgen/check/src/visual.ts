// `xgen visual`: the pixel gate of a refactor. Shoots every route of every screen in every host, in the light and the dark
// theme (1600 wide, full page; the first route of every screen also at 390), and writes a manifest of PNG hashes; a dark state
// is named like its light twin plus `__dark`. `--against <dir>` compares with a saved run;
// a state the saved run has for another runtime only (a host added since) must give the same pixels as that runtime did.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Browser, type BrowserContext } from "playwright-core";
import { hostedScreens, planBuild } from "@ui8kit/xgen-generator";
import { screenKey } from "@ui8kit/xgen-runtime-core";
import { serve, waitPort } from "./e2e/common";

export interface VisualReport { dir: string; states: number; changed: string[]; missing: string[]; errors: string[] }

type Theme = "light" | "dark";
type State = { name: string; url: string; width: number; theme: Theme };
const THEMES: Theme[] = ["light", "dark"];

/** the routes a screen answers: its routes table, the gallery index and pages, a sample record for a list */
async function routesOf(browser: Browser, origin: string, key: string, spec: { routes?: Array<{ path: string }>; gallery?: boolean }): Promise<string[]> {
  if (spec.gallery) {
    const page = await browser.newPage();
    await page.goto(`${origin}/${key}/#/`, { waitUntil: "networkidle" });
    const blocks = await page.$$eval('[data-testid="block-link"]', (as) => as.map((a) => a.getAttribute("data-block") ?? ""));
    await page.close();
    return ["", ...blocks.filter(Boolean)];
  }
  const routes = (spec.routes ?? [{ path: "" }]).map((r) => r.path.replace(/:id$/, "plan-team"));
  // the catalog: its index and its composed pages; a category page shows the same variants as the gallery, which is shot already
  return key === "catalog" ? routes.filter((r) => r === "" || r === "pages" || r.startsWith("page-")) : routes;
}

/** Google Fonts answers one CSS URL in two ways: per-subset woff2 files, or now and then `font?kit=` files whose glyphs
 * raster a shade apart. The gate takes the woff2 answer (asked again up to 10 times) and keeps it for the whole run, in
 * every context. */
async function pinGoogleFonts(ctx: BrowserContext, css: Map<string, Promise<string>>): Promise<void> {
  await ctx.route("https://fonts.googleapis.com/**", async (route) => {
    const url = route.request().url();
    const headers = { "user-agent": route.request().headers()["user-agent"] ?? "" };
    if (!css.has(url)) {
      css.set(url, (async () => {
        let body = "";
        for (let i = 0; i < 10; i++) {
          body = await (await fetch(url, { headers })).text();
          if (!body.includes("font?kit=")) break;
        }
        return body;
      })());
    }
    const body = await css.get(url)!.catch(() => undefined);
    if (body === undefined) return route.continue();
    await route.fulfill({ status: 200, contentType: "text/css; charset=utf-8", headers: { "access-control-allow-origin": "*" }, body });
  });
}

export async function runVisual(workspace: string, o: { out: string; against?: string; only?: string[] }): Promise<VisualReport> {
  const plan = planBuild(workspace);
  const dir = resolve(workspace, o.out);
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  const manifest: Record<string, string> = {};
  const fontCss = new Map<string, Promise<string>>();
  const errors: string[] = [];
  const procs = [];
  try {
    for (const { app, dir: appDir } of plan.apps) {
      procs.push(serve(appDir));
      const origin = `http://127.0.0.1:${app.port}`;
      await waitPort(origin);
      const states: State[] = [];
      for (const s of hostedScreens(app, plan.inputs.screens.map((x) => x.value)).screens) {
        const key = screenKey(s.id);
        if (o.only && !o.only.some((p) => key.startsWith(p))) continue;
        const routes = await routesOf(browser, origin, key, s as never);
        routes.forEach((r, i) => {
          const url = `${origin}/${key}/#/${r}`;
          const label = `${app.runtime}__${key}__${r.replace(/\//g, "~") || "index"}`;
          for (const theme of THEMES) {
            const tag = theme === "light" ? "" : `__${theme}`;
            states.push({ name: `${label}__1600${tag}`, url, width: 1600, theme });
            if (i === 0) states.push({ name: `${label}__390${tag}`, url, width: 390, theme });
          }
        });
      }
      for (const theme of THEMES) {
        const queue = states.filter((st) => st.theme === theme);
        const worker = async (): Promise<void> => {
          const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
          await pinGoogleFonts(ctx, fontCss);
          await ctx.addInitScript((t) => { try { localStorage.setItem("xgen-theme", t); } catch { /* about:blank */ } }, theme);
          const page = await ctx.newPage();
          page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
          for (let st = queue.shift(); st; st = queue.shift()) {
            await page.setViewportSize({ width: st.width, height: 900 });
            // a load that asked Google for a font stylesheet the run had not pinned yet waited on the network for it, so its
            // fonts landed at another moment than in every later load: that page is loaded once more
            for (let pinned = -1; pinned !== fontCss.size; ) {
              pinned = fontCss.size;
              await page.goto("about:blank");
              await page.goto(st.url, { waitUntil: "networkidle" });
            }
            await page.waitForFunction(() => (document.querySelector("#app")?.children.length ?? 0) > 0, undefined, { timeout: 10000 }).catch(() => errors.push(`${st!.name}: nothing rendered`));
            // fonts and every picture decoded, so two runs of the same DOM give the same pixels
            await page.evaluate(async () => {
              for (const i of document.images) i.loading = "eager";
              const settle = (i: HTMLImageElement): Promise<unknown> => Promise.race([i.decode().catch(() => undefined), new Promise((r) => setTimeout(r, 3000))]);
              await document.fonts.ready;
              await Promise.all([...document.images].map(settle));
            });
            const png = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
            writeFileSync(join(dir, `${st.name}.png`), png);
            manifest[st.name] = createHash("sha256").update(png).digest("hex");
          }
          await ctx.close();
        };
        await Promise.all([worker(), worker(), worker(), worker()]);
      }
    }
  } finally {
    await browser.close();
    for (const p of procs) p.kill();
  }
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(sorted, null, 2) + "\n");
  const changed: string[] = [];
  const missing: string[] = [];
  if (o.against) {
    const base = JSON.parse(readFileSync(join(resolve(workspace, o.against), "manifest.json"), "utf8")) as Record<string, string>;
    for (const [name, sha] of Object.entries(base)) {
      if (o.only && !o.only.some((p) => name.split("__")[1]!.startsWith(p))) continue;
      if (!(name in sorted)) missing.push(name);
      else if (sorted[name] !== sha) changed.push(name);
    }
    for (const name of Object.keys(sorted)) {
      if (name in base) continue;
      const [, ...rest] = name.split("__");
      const twin = Object.keys(base).find((b) => b.split("__").slice(1).join("__") === rest.join("__"));
      if (!twin) missing.push(`new: ${name}`);
      else if (base[twin] !== sorted[name]) changed.push(`${name} (differs from ${twin})`);
    }
  }
  return { dir, states: Object.keys(sorted).length, changed, missing, errors };
}

export const visualExists = (workspace: string, d: string): boolean => existsSync(join(resolve(workspace, d), "manifest.json"));
