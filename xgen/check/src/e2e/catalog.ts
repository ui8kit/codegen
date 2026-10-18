// The catalog: the index of sections and categories with their counts, a page per category with its blocks and variants in order,
// the pages index and every composed page (one h1, the blocks of the page in order), no sideways scroll at 390, the theme, the page rules on every page.
import type { Page } from "playwright-core";
import type { BlockSpec, CatalogTree } from "@ui8kit/xgen-screens";
import type { E2eResult, Shot, Snap } from "./common";
import { pageChecks } from "./page-checks";

export interface CatalogData { dict: any; blocks: BlockSpec[]; tree: CatalogTree }
const keyOf = (b: BlockSpec): string => b.id.slice("block.".length);
const dk = (id: string): string => id.replace(/-([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
const fill = (t: string, ...v: Array<string | number>): string => t.replace(/\{(\d+)\}/g, (_m, i: string) => String(v[Number(i)] ?? ""));

export async function catalogScenario(page: Page, base: string, data: CatalogData, shot: Shot, snap: Snap): Promise<E2eResult> {
  const failures: string[] = [];
  let steps = 0;
  const expect = (what: string, ok: boolean, got?: unknown): void => { steps++; if (!ok) failures.push(`${what}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ""}`); };
  const d = data.dict.catalog;
  const byKey = new Map(data.blocks.map((b) => [keyOf(b), b]));
  const h1 = (): Promise<string> => page.locator("h1").first().innerText();
  const variantsOf = (e: { block: string; variants?: string[] }): string[] => (byKey.get(e.block)?.variants ?? []).map((v) => v.id).filter((v) => !e.variants || e.variants.includes(v));

  // 1. the index: one section per catalog section, its categories in order with the counts, then the pages
  await page.goto(base + "/");
  await page.waitForSelector('[data-testid="category-list"]');
  expect("index h1 is the catalog title", (await h1()) === d.title, await h1());
  await pageChecks(page, expect, "catalog index");
  const sections = await page.$$eval('[data-testid="catalog-section"]', (els) => els.map((e) => ({ id: e.getAttribute("data-section"), cats: [...e.querySelectorAll('[data-testid="category-link"]')].map((a) => a.getAttribute("data-category")) })));
  expect("one index section per catalog section, categories in order", JSON.stringify(sections) === JSON.stringify(data.tree.sections.map((s) => ({ id: s.id, cats: s.categories.map((c) => c.id) }))), sections);
  const counts = await page.$$eval('[data-testid="category-count"]', (els) => els.map((e) => (e.textContent ?? "").trim()));
  const want = data.tree.sections.flatMap((s) => s.categories.map((c) => fill(d.count, c.entries.length, c.entries.reduce((n, e) => n + variantsOf(e).length, 0))));
  expect("every category card counts its blocks and variants", JSON.stringify(counts) === JSON.stringify(want), counts);
  const pageLinks = await page.$$eval('[data-testid="page-link"]', (els) => els.map((e) => e.getAttribute("data-page")));
  expect("the index lists every page", JSON.stringify(pageLinks) === JSON.stringify(data.tree.pages.map((p) => p.id)), pageLinks);
  const listed = new Set(data.tree.sections.flatMap((s) => s.categories.flatMap((c) => c.entries.flatMap((e) => variantsOf(e).map((v) => `${e.block}.${v}`)))));
  expect("every variant of the kit is in a category", data.blocks.every((b) => b.variants.every((v) => listed.has(`${keyOf(b)}.${v.id}`))), data.blocks.flatMap((b) => b.variants.filter((v) => !listed.has(`${keyOf(b)}.${v.id}`)).map((v) => `${keyOf(b)}.${v.id}`)));
  await snap("index");
  await shot("index-light", true);

  // 2. a page per category: its title, the section it belongs to, every block with its variants in order
  for (const s of data.tree.sections) for (const c of s.categories) {
    await page.goto(base + `/#/${c.id}`);
    await page.waitForSelector('[data-testid="category-title"]');
    expect(`${c.id}: h1 is the category name`, (await h1()) === d.categories[dk(c.id)], await h1());
    expect(`${c.id}: names its section`, (await page.getByTestId("catalog-eyebrow").innerText()) === d.sections[s.id].title);
    await pageChecks(page, expect, c.id);
    const shown = await page.$$eval('[data-testid="catalog-block"]', (els) => els.map((e) => ({ block: e.getAttribute("data-block"), variants: [...e.querySelectorAll('[data-testid="variant"]')].map((v) => v.getAttribute("data-variant")) })));
    expect(`${c.id}: every block with its variants, in order`, JSON.stringify(shown) === JSON.stringify(c.entries.map((e) => ({ block: e.block, variants: variantsOf(e) }))), shown);
    const labels = await page.$$eval('[data-testid="variant-label"]', (els) => els.map((e) => (e.textContent ?? "").trim()));
    expect(`${c.id}: every variant has its label`, JSON.stringify(labels) === JSON.stringify(c.entries.flatMap((e) => variantsOf(e).map((v) => data.dict.blocks.variants[e.block][v]))), labels);
    if (c === data.tree.sections[0]!.categories[0]) await snap(`category-${c.id}`);
  }

  // 3. the pages: the index of pages, then every page with one h1 and the blocks of the page
  await page.goto(base + "/#/pages");
  await page.waitForSelector('[data-testid="pages-title"]');
  expect("pages: h1 is the pages title", (await h1()) === d.pagesTitle, await h1());
  await pageChecks(page, expect, "pages");
  for (const p of data.tree.pages) {
    await page.goto(base + `/#/page-${p.id}`);
    await page.waitForSelector(`[data-testid="page-body"][data-page="${p.id}"]`);
    await pageChecks(page, expect, `page ${p.id}`);
    expect(`page ${p.id}: the bar names the page`, (await page.getByTestId("page-name").innerText()) === d.pages[dk(p.id)].title);
    const kids = await page.locator('[data-testid="page-body"] > *').count();
    expect(`page ${p.id}: at least one element per block`, kids >= p.uses.length, [kids, p.uses.length]);
    await snap(`page-${p.id}`);
    await shot(`page-${p.id}-light`, true);
  }

  // 3b. at 390 px no category page and no composed page scrolls sideways (the blocks gallery checks each block; this checks the catalog chrome around them)
  const desk = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 900 });
  const sideways = (): Promise<number> => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  for (const route of ["/", "/#/pages", ...data.tree.sections.flatMap((s) => s.categories.map((c) => `/#/${c.id}`)), ...data.tree.pages.map((p) => `/#/page-${p.id}`)]) {
    await page.goto(base + route);
    await page.waitForSelector("h1");
    await page.waitForTimeout(50);
    const over = await sideways();
    expect(`${route} at 390: the page does not scroll sideways`, over <= 1, over);
  }
  if (desk) await page.setViewportSize(desk);

  // 4. the theme button of the bar, and back
  const theme = (): Promise<string | undefined> => page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByTestId("theme-toggle").first().click();
  expect("the theme button sets dark", (await theme()) === "dark");
  await page.getByTestId("theme-toggle").first().click();
  expect("and back to light", (await theme()) === "light");
  return { name: "", steps, failures };
}
