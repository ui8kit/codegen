// The gallery: an index of the blocks, a page per block with every variant, the facts each variant promises, containers, dark theme, an unknown block.
import type { Page } from "playwright-core";
import { galleryOf, THEMES, type BlockSpec } from "@ui8kit/xgen-screens";
import type { E2eResult, Expect, Shot, Snap } from "./common";
import { legacyChecks } from "./generic";
import { factsChecks } from "./facts";
import { pageChecks } from "./page-checks";

/** collection sizes, plus each block data alias (`as`) under its own name */
const withAliases = (b: BlockSpec, counts: Record<string, number>): Record<string, number> => ({ ...counts, ...Object.fromEntries((b.data ?? []).filter((d) => counts[d.collection] !== undefined).map((d) => [d.as, counts[d.collection]!])) });

export interface BlocksData { dict: any; blocks: BlockSpec[]; features: number; faq: number; tiers: Array<{ highlighted: boolean }>; counts: Record<string, number>; done: number }
const keyOf = (b: BlockSpec): string => b.id.slice("block.".length);
const colsOf = (v: string): number => Number(v.replace("1-", ""));

/** the gallery: an index of the blocks, a page per block with every variant, the facts each variant promises (counts, sides, columns, tones), theme, no gradients */
export async function blocksScenario(page: Page, base: string, data: BlocksData, shot: (label: string, full?: boolean) => Promise<void>, snap: (label: string) => Promise<void>): Promise<E2eResult> {
  const failures: string[] = [];
  let steps = 0;
  const expect = (what: string, ok: boolean, got?: unknown): void => { steps++; if (!ok) failures.push(`${what}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ""}`); };
  const d = data.dict.blocks;
  const sorted = galleryOf(data.blocks);
  const h1 = (): Promise<string> => page.locator("h1").first().innerText();
  const theme = (): Promise<string | undefined> => page.evaluate(() => document.documentElement.dataset.theme);
  const xs = (sel: string): Promise<number[]> => page.locator(sel).evaluateAll((els) => [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().left)))].sort((a, b) => a - b));
  const general = (where: string): Promise<void> => pageChecks(page, expect, where);

  // 1. the index
  await page.goto(base + "/");
  await page.waitForSelector('[data-testid="block-list"]');
  expect("index h1 is the gallery title", (await h1()) === d.title, await h1());
  await general("index");
  const links = await page.$$eval('[data-testid="block-link"]', (els) => els.map((e) => `${e.getAttribute("data-block")}=${(e.textContent ?? "").trim()}`));
  expect("one link per block, with its name", JSON.stringify(links) === JSON.stringify(sorted.map((b) => `${keyOf(b)}=${d.names[keyOf(b)]}`)), links);
  const sections = await page.$$eval('[data-testid="theme-section"]', (els) => els.map((e) => ({ id: e.getAttribute("data-theme-id"), h2: e.querySelector("h2")?.textContent?.trim() ?? "", blocks: [...e.querySelectorAll('[data-testid="block-link"]')].map((a) => a.getAttribute("data-block")) })));
  const themesUsed = THEMES.filter((t) => data.blocks.some((b) => b.theme === t));
  expect("the index has one section per theme, in the order of the themes", JSON.stringify(sections.map((x) => x.id)) === JSON.stringify(themesUsed), sections.map((x) => x.id));
  expect("every theme section has its title and lists its blocks", sections.every((x) => x.h2 === data.dict.blocks.themes[x.id!].title && JSON.stringify(x.blocks) === JSON.stringify(sorted.filter((b) => b.theme === x.id).map(keyOf))), sections);
  expect("the gallery has at least 60 blocks and 300 variants", sorted.length >= 60 && sorted.reduce((n, b) => n + b.variants.length, 0) >= 300, [sorted.length, sorted.reduce((n, b) => n + b.variants.length, 0)]);
  await snap("index");
  await shot("index-light", true);

  // 2. a page per block: every variant is there, in order, with its label, and keeps the facts of its row
  for (const b of sorted) {
    const key = keyOf(b);
    await page.getByTestId("block-link").and(page.locator(`[data-block="${key}"]`)).click().catch(async () => { await page.goto(base + `/#/${key}`); });
    await page.waitForFunction((k) => location.hash === `#/${k}`, key);
    await page.waitForSelector('[data-testid="block-title"]');
    expect(`${key}: h1 is the block name`, (await h1()) === d.names[key], await h1());
    expect(`${key}: the page names its theme`, (await page.getByTestId("block-theme").innerText()) === data.dict.blocks.themes[b.theme].title, await page.getByTestId("block-theme").innerText());
    await general(key);
    const sections = await page.$$eval('[data-testid="variant"]', (els) => els.map((e) => e.getAttribute("data-variant")));
    expect(`${key}: one section per variant, in order`, JSON.stringify(sections) === JSON.stringify(b.variants.map((v) => v.id)), sections);
    const labels = await page.$$eval('[data-testid="variant-label"]', (els) => els.map((e) => (e.textContent ?? "").trim()));
    expect(`${key}: every variant has its label`, JSON.stringify(labels) === JSON.stringify(b.variants.map((v) => d.variants[key][v.id])), labels);
    for (const v of b.variants) {
      const row: Record<string, string> = { ...b.defaults, ...v.set };
      const at = (sel: string) => page.locator(`[data-testid="variant"][data-variant="${v.id}"] ${sel}`);
      const where = `${key}.${v.id}`;
      const n = async (sel: string): Promise<number> => at(sel).count();
      if ("tone" in row && (await n('[data-testid="section"]')) > 0) {
        expect(`${where}: the section carries its tone and density`, (await at('[data-testid="section"]').first().getAttribute("data-tone")) === row["tone"] && (!("density" in b.axes) || (await at('[data-testid="section"]').first().getAttribute("data-density")) === (row["density"] ?? "default")), [await at('[data-testid="section"]').first().getAttribute("data-tone"), row["tone"]]);
      }
      if (b.facts) {
        await factsChecks(b.facts, row, where, n, (sel) => xs(`[data-testid="variant"][data-variant="${v.id}"] ${sel}`), withAliases(b, data.counts), expect);
      } else if (key === "header") {
        expect(`${where}: layout is on the header`, (await at('[data-testid="site-header"]').getAttribute("data-layout")) === row["layout"]);
        expect(`${where}: sticky only when asked`, (await at('[data-testid="site-header"]').evaluate((e) => getComputedStyle(e).position)) === (row["position"] === "sticky" ? "sticky" : "static"));
        expect(`${where}: two links, only Home is current`, (await n('[data-testid="nav-link"]')) === 2 && (await n('[data-testid="nav-link"][aria-current="page"]')) === 1);
        const brand = await at('[data-testid="brand"]').boundingBox(), nav = await at('[data-testid="site-nav"]').boundingBox();
        expect(`${where}: ${row["layout"] === "stacked" ? "brand above the links" : "brand and links in a row"}`, !!brand && !!nav && (row["layout"] === "stacked" ? nav.y > brand.y + brand.height - 1 : Math.abs(nav.y - brand.y) < 40), [brand?.y, nav?.y]);
      } else if (key === "footer") {
        expect(`${where}: copyright and layout`, (await at('[data-testid="copyright"]').innerText()) === data.dict.site.footer.copyright && (await at('[data-testid="site-footer"]').getAttribute("data-layout")) === row["layout"]);
      } else if (key === "hero") {
        const own = (v.props?.["title"] as { $?: string } | undefined)?.$, wantTitle = own ? own.split(".").slice(1).reduce((o: any, k) => o[k], data.dict) : data.dict.site.home.title;
        expect(`${where}: the title is an h2 in the gallery${own ? ", from the case copy" : ""}`, (await at('h2[id$="-title"]').innerText()) === wantTitle, await at('h2[id$="-title"]').innerText());
        expect(`${where}: actions: ${row["actions.mode"] === "form" ? "an email form instead of links" : `one primary${row["actions.mode"] === "two" ? " and one secondary" : ""}`}`, (await n('[data-testid="action-primary"]')) === (row["actions.mode"] === "form" ? 0 : 1) && (await n('[data-testid="action-secondary"]')) === (row["actions.mode"] === "two" ? 1 : 0) && (await n('[data-testid="email-form"]')) === (row["actions.mode"] === "form" ? 1 : 0));
        const media = ({ none: 0, image: 1, backdrop: 1, code: 0, cluster: 3 } as Record<string, number>)[row["media.kind"]!]!;
        expect(`${where}: media only when asked (${row["media.kind"]})`, (await n('[data-slot="media-frame"]')) === media, await n('[data-slot="media-frame"]'));
        expect(`${where}: the terminal window only when asked`, (await n('[data-slot="code-window"], [data-testid="code-window"]')) === (row["media.kind"] === "code" ? 1 : 0));
        if (row["media.kind"] === "image" && row["layout"] === "split") {
          const m = await at('[data-slot="media-frame"]').boundingBox(), h = await at('h2[id$="-title"]').boundingBox();
          expect(`${where}: media at the ${row["media.side"]}`, !!m && !!h && (row["media.side"] === "start" ? m.x < h.x : m.x > h.x), [m?.x, h?.x]);
        }
      } else if (key === "features") {
        expect(`${where}: one card per feature`, (await n('[data-testid="feature-card"]')) === data.features, await n('[data-testid="feature-card"]'));
        expect(`${where}: every card has an icon`, (await n('[data-testid="feature-card"] svg')) >= data.features);
        if (row["layout"] === "rows") {
          expect(`${where}: rows, one media per feature`, (await n('[data-testid="feature-rows"]')) === 1 && (await n('[data-slot="media-frame"]')) === data.features);
          const sides: string[] = [];
          for (let i = 0; i < data.features; i++) {
            const card = at('[data-testid="feature-card"]').nth(i);
            const m = await card.locator('[data-slot="media-frame"]').boundingBox(), h = await card.locator("h3").boundingBox();
            sides.push(m && h ? (m.x > h.x ? "end" : "start") : "?");
          }
          const want = Array.from({ length: data.features }, (_, i) => row["mediaSide"] === "alternate" ? (i % 2 ? "start" : "end") : row["mediaSide"]!);
          expect(`${where}: media side ${row["mediaSide"]}`, JSON.stringify(sides) === JSON.stringify(want), sides);
        } else {
          expect(`${where}: a grid of ${colsOf(row["cols"]!)} columns`, (await xs(`[data-testid="variant"][data-variant="${v.id}"] [data-testid="feature-card"]`)).length === Math.min(colsOf(row["cols"]!), data.features), await xs(`[data-testid="variant"][data-variant="${v.id}"] [data-testid="feature-card"]`));
        }
      } else if (key === "pricing") {
        const want = row["emphasis"] === "auto" ? data.tiers.filter((x) => x.highlighted).length : 0;
        const plans = v.props?.["plans"] ? data.counts["duo"]! : data.tiers.length;
        expect(`${where}: one card per tier`, (await n('[data-testid="tiers"] [data-highlighted]')) === plans);
        expect(`${where}: emphasis on ${v.props?.["plans"] ? 0 : want} card(s)`, (await n('[data-highlighted="true"]')) === (v.props?.["plans"] ? 0 : want), await n('[data-highlighted="true"]'));
        expect(`${where}: a billing toggle only when asked`, (await n('[data-testid="billing"]')) === (row["billing"] === "off" ? 0 : 1));
        if (row["billing"] !== "off") {
          const shown = await at('[data-highlighted] h2').allInnerTexts();
          expect(`${where}: prices follow the period (${row["billing"]})`, shown.length === plans, shown);
        }
        const cols = row["layout"] === "stack" ? 1 : Math.min(colsOf(row["cols"]!), plans);
        expect(`${where}: ${cols} column(s)`, (await xs(`[data-testid="variant"][data-variant="${v.id}"] [data-highlighted]`)).length === cols, await xs(`[data-testid="variant"][data-variant="${v.id}"] [data-highlighted]`));
      } else if (key === "plan") {
        expect(`${where}: one plan card`, (await n("[data-highlighted]")) === 1);
        expect(`${where}: emphasis ${row["emphasis"]}`, (await at("[data-highlighted]").getAttribute("data-highlighted")) === (row["emphasis"] === "auto" ? "true" : "false"));
      } else if (key === "faq") {
        const shown = row["filter.mode"] === "categories" ? data.counts["faq:billing"]! : data.faq;
        expect(`${where}: one ${row["layout"] === "chat" ? "bubble pair" : "disclosure"} per question${row["filter.mode"] === "categories" ? " of the chosen category" : ""}`, (await n('[data-testid="faq-item"]')) === shown, await n('[data-testid="faq-item"]'));
        expect(`${where}: a search field only when asked`, (await n('[role="search"]')) === (row["search.mode"] === "field" ? 1 : 0));
        expect(`${where}: category tabs only when asked`, (await n('[data-slot="switcher"]')) === (row["filter.mode"] === "categories" ? 1 : 0));
        const cols = row["layout"] === "chat" ? 1 : Math.min(Number(row["cols"]), shown);
        expect(`${where}: ${cols} column(s)`, (await xs(`[data-testid="variant"][data-variant="${v.id}"] [data-testid="faq-item"]`)).length === cols, await xs(`[data-testid="variant"][data-variant="${v.id}"] [data-testid="faq-item"]`));
      } else if (key === "cta") {
        const mode = row["actions.mode"];
        const shape = mode === "form" ? "an email form instead of links" : `one primary${mode === "two" ? " and one secondary" : ""}`;
        const primary = (await n('[data-testid="action-primary"]')) === (mode === "form" ? 0 : 1);
        const secondary = (await n('[data-testid="action-secondary"]')) === (mode === "two" ? 1 : 0);
        expect(`${where}: actions: ${shape}`, primary && secondary && (await n('[data-testid="email-form"]')) === (mode === "form" ? 1 : 0));
        expect(`${where}: a customer quote only when asked`, (await n('[data-testid="proof"]')) === (row["proof"] === "quote" ? 1 : 0));
        expect(`${where}: media only in the split layout`, (await n('[data-slot="media-frame"]')) === (row["layout"] === "split" ? 1 : 0));
      } else {
        // a variant that passes a short list of its own (e.g. three of the four stats) is counted by that list
        const own = Object.fromEntries(Object.entries(v.props ?? {}).flatMap(([k, x]) => (x as { op?: string; args?: unknown[] } | null)?.op === "list" ? [[k, (x as { args: unknown[] }).args.length]] : []));
        await legacyChecks(key, row, where, n, (sel) => xs(`[data-testid="variant"][data-variant="${v.id}"] ${sel}`), { ...data.counts, ...own }, data.done, expect);
      }
    }
    if (key === "faq") {
      const first = page.locator('[data-testid="faq-item"]').first();
      await first.locator("summary").click();
      expect("faq: a click opens a disclosure", (await first.getAttribute("open")) !== null);
      await first.locator("summary").click();
      expect("faq: a second click closes it", (await first.getAttribute("open")) === null);
    }
    if (key === "header") {
      await page.getByTestId("theme-toggle").first().click();
      expect("header: the theme button of a variant toggles the theme", (await theme()) === "dark");
      await page.getByTestId("theme-toggle").first().click();
      expect("header: and back", (await theme()) === "light");
    }
    await snap(`block-${key}`);
    await shot(`${key}-light`, true);
    await page.getByTestId("back").click();
    await page.waitForSelector('[data-testid="block-list"]');
  }

  // 2b. containers: at 1400 and 390 px every block sits in a body of one width, centered; the inner container is centered in it and as wide as its max-width allows; no sideways scroll
  for (const w of [1400, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    let ref: { left: number; width: number } | null = null;
    for (const b of sorted) {
      const key = keyOf(b);
      await page.goto(base + `/#/${key}`);
      await page.waitForSelector('[data-testid="block-title"]');
      const m = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        vw: document.documentElement.clientWidth,
        rows: [...document.querySelectorAll('[data-testid="variant"]')].map((v) => {
          const body = v.querySelector('[data-testid="variant-body"]')!.getBoundingClientRect();
          const c = v.querySelector('[data-slot="container"]');
          const cr = c?.getBoundingClientRect();
          const max = c ? parseFloat(getComputedStyle(c).maxWidth) : NaN;
          return { id: v.getAttribute("data-variant")!, body: { left: body.left, width: body.width }, container: cr ? { left: cr.left, width: cr.width, max: Number.isFinite(max) ? max : Infinity } : null };
        }),
      }));
      expect(`${key} at ${w}: no sideways scroll`, m.scroll <= 0, m.scroll);
      for (const r of m.rows) {
        ref ??= r.body;
        expect(`${key}.${r.id} at ${w}: the body has the width and place of the reference`, Math.abs(r.body.left - ref.left) <= 1 && Math.abs(r.body.width - ref.width) <= 1, [r.body, ref]);
        expect(`${key}.${r.id} at ${w}: the body is centered in the page`, Math.abs(r.body.left - (m.vw - r.body.left - r.body.width)) <= 18, [r.body.left, m.vw - r.body.left - r.body.width]);
        if (r.container) {
          const c = r.container;
          expect(`${key}.${r.id} at ${w}: the container is centered in the body`, Math.abs((c.left - r.body.left) - (r.body.left + r.body.width - c.left - c.width)) <= 2, [c, r.body]);
          expect(`${key}.${r.id} at ${w}: the container is as wide as its max-width allows`, Math.abs(c.width - Math.min(r.body.width, c.max)) <= 2, [c.width, r.body.width, c.max]);
        }
      }
    }
  }
  // 2c. narrow columns: an element held narrower than its parent by a max-width, when it is the parent's only laid-out child (besides the heading),
  // sits centered in it (equal gaps left and right) at 1600, 1024 and 768 px; a side column has siblings and is not checked
  for (const w of [1600, 1024, 768]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const b of sorted) {
      const key = keyOf(b);
      await page.goto(base + `/#/${key}`);
      await page.waitForSelector('[data-testid="block-title"]');
      const off = await page.evaluate(() => {
        const out: { variant: string; el: string; gaps: [number, number] }[] = [];
        const shown = (e: Element) => {
          const cs = getComputedStyle(e);
          const r = e.getBoundingClientRect();
          return cs.display !== "none" && cs.position !== "absolute" && cs.position !== "fixed" && r.width > 0 && r.height > 0;
        };
        for (const v of document.querySelectorAll('[data-testid="variant-body"]')) {
          for (const el of v.querySelectorAll("*")) {
            const max = parseFloat(getComputedStyle(el).maxWidth);
            const parent = el.parentElement;
            if (!Number.isFinite(max) || !parent || !shown(el)) continue;
            // the main column: the only laid-out child, next to at most the section heading (a heading or a box led by one)
            const heading = (e: Element) => /^H[1-3]$/.test(e.tagName) || /^H[1-3]$/.test(e.firstElementChild?.tagName ?? "");
            const rest = [...parent.children].filter((e) => e !== el && shown(e));
            if (heading(el) || rest.some((e) => !heading(e))) continue;
            const ps = getComputedStyle(parent);
            const pr = parent.getBoundingClientRect();
            const inner = { left: pr.left + parseFloat(ps.paddingLeft) + parseFloat(ps.borderLeftWidth), right: pr.right - parseFloat(ps.paddingRight) - parseFloat(ps.borderRightWidth) };
            const r = el.getBoundingClientRect();
            if (r.width >= inner.right - inner.left - 2) continue;
            const gaps: [number, number] = [r.left - inner.left, inner.right - r.right];
            if (Math.abs(gaps[0] - gaps[1]) > 2) {
              const id = el.getAttribute("data-testid") ?? el.getAttribute("data-slot") ?? el.tagName.toLowerCase();
              out.push({ variant: v.closest('[data-testid="variant"]')?.getAttribute("data-variant") ?? "?", el: id, gaps: [Math.round(gaps[0]), Math.round(gaps[1])] });
            }
          }
        }
        return out;
      });
      expect(`${key} at ${w}: every narrow only-child column is centered in its parent`, off.length === 0, off);
    }
  }
  await page.setViewportSize({ width: 1400, height: 900 });

  // 3. dark: the same pages, kept theme across routes
  await page.getByTestId("theme-toggle").click();
  expect("the theme toggle sets dark", (await theme()) === "dark");
  for (const b of sorted) {
    const key = keyOf(b);
    await page.goto(base + `/#/${key}`);
    await page.waitForSelector('[data-testid="block-title"]');
    await general(`${key} (dark)`);
    await shot(`${key}-dark`, true);
  }
  expect("dark survives navigation", (await theme()) === "dark");
  await page.getByTestId("theme-toggle").click();
  expect("the theme toggles back to light", (await theme()) === "light");

  // 4. an unknown block
  await page.goto(base + "/#/nope");
  await page.waitForFunction((title) => document.querySelector("h1")?.textContent === title, data.dict.site.notFound.title);
  expect("unknown block shows the not-found page", (await h1()) === data.dict.site.notFound.title);
  await snap("notfound");
  return { name: "", steps, failures };
}
