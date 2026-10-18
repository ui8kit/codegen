// One scenario per screen, one host per runtime: the same steps run against the Svelte, the React and the Vue host at /<screen>/, built from the
// same screen spec and fixtures. Then the DOM of every host is read in the same states and compared with the first (tags, classes, ARIA, data, text).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { hostedScreens, planBuild } from "@ui8kit/xgen-generator";
import { screenKey } from "@ui8kit/xgen-runtime-core";
import { serve, structure, waitPort, type E2eResult } from "./common";
import { scenario } from "./plans";
import { siteScenario, type SiteData } from "./site";
import { blocksScenario, type BlocksData } from "./blocks";
import { catalogScenario } from "./catalog";
import { skinsScenario } from "./skins";
import type { CatalogTree, SkinsBoard } from "@ui8kit/xgen-screens";
import { THEME_SCREEN, themeScenario } from "./theme";
import type { ChildProcess } from "node:child_process";
import { documentHtml, validateStates, type HtmlStates } from "./html";

export type { E2eResult } from "./common";

type ScenarioKind = "site" | "blocks" | "catalog" | "skins" | "theme" | "plans";
/** which scenario runs on a screen */
const scenarioKind = (screen: string): ScenarioKind => (screen === "screen.site" ? "site" : screen === "screen.blocks" ? "blocks" : screen === "screen.catalog" ? "catalog" : screen === "screen.skins" ? "skins" : THEME_SCREEN.test(screen) ? "theme" : "plans");
/** the width of the window per scenario, in px: the gallery is wider because its responsive grids reach their widest column count from 1280 px */
const VIEWPORT: Record<ScenarioKind, number> = { site: 1100, blocks: 1400, catalog: 1400, skins: 1400, theme: 1100, plans: 1100 };
const VIEWPORT_HEIGHT = 900;
export interface E2eReport { results: E2eResult[]; pair: { states: number; differences: string[] }; html: { states: number; documents: number; problems: string[]; warnings: Record<string, number> }; shots: string[] }

export async function runE2e(workspace: string, shotsDir = join(workspace, "shots")): Promise<E2eReport> {
  const plan = planBuild(workspace);
  mkdirSync(shotsDir, { recursive: true });
  const procs: ChildProcess[] = [];
  const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  const results: E2eResult[] = [];
  const shots: string[] = [];
  const snaps: Record<string, Record<string, string[]>> = {};
  const screenOf: Record<string, string> = {};
  const html: HtmlStates = new Map();
  let htmlStates = 0;
  const coll = (name: string): any[] => (plan.inputs.collections.find((c) => c.value.collection === name)?.value.entries ?? []) as any[];
  const siteData: SiteData = {
    dict: plan.inputs.dictionary.value,
    features: coll("features").length,
    faq: coll("faq").length,
    tiers: coll("tiers").map((e) => ({ price: e.metadata.price.value as number, currency: e.metadata.currency.value as string, highlighted: e.metadata.highlighted.value as boolean })),
  };
  // the Design topic of the posts: the term category-design of the taxonomy category
  const inDesign = (e: any): boolean => (e.terms ?? []).some((t: { taxonomy: string; term_id: string }) => t.taxonomy === "category" && t.term_id === "category-design");
  // the billing topic of the questions: the term faq-category-billing of the taxonomy faq_category
  const inBilling = (e: any): boolean => (e.terms ?? []).some((t: { taxonomy: string; term_id: string }) => t.taxonomy === "faq_category" && t.term_id === "faq-category-billing");
  const blocksData: BlocksData = { dict: siteData.dict, blocks: plan.inputs.blocks.map((b) => b.value), features: siteData.features, faq: siteData.faq, tiers: siteData.tiers, counts: { ...Object.fromEntries(plan.inputs.collections.map((c) => [c.value.collection, (c.value.entries ?? []).length])), "faq:billing": coll("faq").filter(inBilling).length, "posts:Design": coll("posts").filter(inDesign).length }, done: coll("checklist").filter((e) => e.metadata.done.value).length };
  const tree = plan.inputs.screens.find((s) => s.composed?.catalog)?.composed?.catalog as CatalogTree | undefined;
  const board = plan.inputs.screens.find((s) => s.composed?.skins)?.composed?.skins as SkinsBoard | undefined;
  try {
    // XGEN_E2E_ONLY=site,plans (screen keys) or host-svelte (a host) narrows the run
    const only = process.env["XGEN_E2E_ONLY"]?.split(",").filter(Boolean);
    const all = plan.inputs.screens.map((s) => s.value);
    for (const { app, dir } of plan.apps) {
      const screens = hostedScreens(app, all).screens.filter((s) => !only || only.some((o) => o === app.name || screenKey(s.id).startsWith(o)));
      if (!screens.length) continue;
      procs.push(serve(dir));
      const origin = `http://127.0.0.1:${app.port}`;
      await waitPort(origin);
      for (const s of screens) {
        const key = screenKey(s.id);
        const name = `${key}-${app.runtime}`;
        const base = `${origin}/${key}`;
        const kind = scenarioKind(s.id);
        const ctx = await browser.newContext({ viewport: { width: VIEWPORT[kind], height: VIEWPORT_HEIGHT } });
        const page = await ctx.newPage();
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
        snaps[name] = {};
        screenOf[name] = s.id;
        const shot = async (label: string, full = false): Promise<void> => { const f = join(shotsDir, `${name}-${label}.png`); await page.screenshot({ path: f, fullPage: full }); shots.push(f); };
        const snap = async (label: string): Promise<void> => { snaps[name]![label] = await structure(page); const doc = await documentHtml(page); htmlStates++; html.set(doc, [...(html.get(doc) ?? []), `${name} ${label}`]); };
        const r = kind === "site" ? await siteScenario(page, base, siteData, shot, snap)
          : kind === "blocks" ? await blocksScenario(page, base, blocksData, shot, snap)
          : kind === "catalog" ? await catalogScenario(page, base, { dict: siteData.dict, blocks: blocksData.blocks, tree: tree! }, shot, snap)
          : kind === "skins" ? await skinsScenario(page, base, { dict: siteData.dict, board: board! }, shot, snap)
          : kind === "theme" ? await themeScenario(page, base, s.id, shot, snap)
          : await scenario(page, base, shot, snap);
        r.name = name;
        for (const e of errors) r.failures.push(`browser console: ${e}`);
        results.push(r);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    for (const p of procs) p.kill();
  }
  // the pair test: the DOM of every runtime of one screen, in the same states, matches the DOM of the first runtime within the spec
  const differences: string[] = [];
  let states = 0;
  for (const id of new Set(Object.values(screenOf))) {
    const [a = "", ...others] = Object.keys(snaps).filter((n) => screenOf[n] === id);
    for (const b of others) for (const label of Object.keys(snaps[a]!)) {
      states++;
      const x = snaps[a]![label]!, y = snaps[b]![label] ?? [];
      const n = Math.max(x.length, y.length);
      let shown = 0;
      for (let i = 0; i < n && shown < 6; i++) if (x[i] !== y[i]) { differences.push(`${id} ${label} line ${i + 1}:\n    ${a}: ${x[i] ?? "(none)"}\n    ${b}: ${y[i] ?? "(none)"}`); shown++; }
    }
  }
  const checked = await validateStates(workspace, html);
  return { results, pair: { states, differences }, html: { states: htmlStates, ...checked }, shots };
}
