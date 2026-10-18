// The marketing site: header, routes, pricing, theme toggle.
import type { Page } from "playwright-core";
import type { E2eResult } from "./common";
import { fmtMoney } from "../../../runtimes/core/assets/ts/format";

/** the landing: two routes, landmarks, skip link, current link, fixtures on the page, FAQ disclosures, theme, no gradients; each check is one canary-style e2e step */
export interface SiteData { dict: any; features: number; faq: number; tiers: Array<{ price: number; currency: string; highlighted: boolean }> }

export async function siteScenario(page: Page, base: string, data: SiteData, shot: (label: string) => Promise<void>, snap: (label: string) => Promise<void>): Promise<E2eResult> {
  const failures: string[] = [];
  let steps = 0;
  const expect = (what: string, ok: boolean, got?: unknown): void => { steps++; if (!ok) failures.push(`${what}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ""}`); };
  const t = data.dict.site;
  const hash = (): Promise<string> => page.evaluate(() => location.hash);
  const count = (sel: string): Promise<number> => page.locator(sel).count();
  const h1 = (): Promise<string> => page.locator("h1").first().innerText();
  const current = (): Promise<string[]> => page.$$eval('[data-testid="nav-link"][aria-current]', (els) => els.map((e) => `${(e.textContent ?? "").trim()}=${e.getAttribute("aria-current")}`));
  const landmarks = async (where: string): Promise<void> => {
    expect(`${where}: one h1`, (await count("h1")) === 1, await count("h1"));
    expect(`${where}: one main, with id main-content`, (await count("main")) === 1 && (await count("main#main-content")) === 1);
    expect(`${where}: one header and one footer`, (await count("header")) === 1 && (await count("footer")) === 1);
    expect(`${where}: two named navigations`, (await count("nav[aria-label]")) === 2, await count("nav[aria-label]"));
    const levels = await page.$$eval("h1,h2,h3,h4,h5,h6", (els) => els.map((e) => Number(e.tagName[1])));
    expect(`${where}: heading levels never skip down`, levels.every((l, i) => i === 0 ? l === 1 : l <= levels[i - 1]! + 1), levels);
    const ids = await page.$$eval("[id]", (els) => els.map((e) => e.id));
    expect(`${where}: ids are unique`, new Set(ids).size === ids.length, ids);
    const bad = await page.$$eval("main section[aria-labelledby]", (els) => els.filter((e) => !document.getElementById(e.getAttribute("aria-labelledby")!)).length);
    expect(`${where}: every section is named by its heading`, bad === 0);
    const grad = await page.evaluate(() => [...document.querySelectorAll("*")].filter((e) => getComputedStyle(e).backgroundImage.includes("gradient")).length);
    expect(`${where}: no gradients`, grad === 0, grad);
  };

  // 1. home
  await page.goto(base + "/");
  await page.waitForSelector('[data-testid="feature-grid"]');
  expect("home h1", (await h1()) === t.home.title, await h1());
  await landmarks("home");
  expect("home: three sections", (await count("main section[aria-labelledby]")) === 3, await count("main section[aria-labelledby]"));
  expect("two nav links, only Home is current", (await count('[data-testid="nav-link"]')) === 2 && JSON.stringify(await current()) === JSON.stringify([`${t.header.home}=page`]), await current());
  expect("one card per feature of the fixture", (await count('[data-testid="feature-card"]')) === data.features, await count('[data-testid="feature-card"]'));
  expect("every feature card has an icon", (await count('[data-testid="feature-card"] svg')) === data.features);
  expect("footer shows the copyright", (await page.getByTestId("copyright").innerText()) === t.footer.copyright);
  await snap("home");
  await shot("home-light");
  // 2. keyboard: the first Tab lands on the skip link, Enter moves focus to main and keeps the route
  await page.reload();
  await page.waitForSelector('[data-testid="feature-grid"]');
  await page.keyboard.press("Tab");
  expect("first Tab lands on the skip link", await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "skip-link"));
  await page.keyboard.press("Enter");
  expect("skip link moves focus to main", await page.evaluate(() => document.activeElement?.id === "main-content"));
  expect("skip link keeps the route", (await h1()) === t.home.title);
  // 3. home -> pricing by the call to action
  await page.getByTestId("action-primary").first().click();
  await page.waitForSelector('[data-testid="tiers"]');
  expect("URL is #/pricing", (await hash()) === "#/pricing", await hash());
  expect("pricing h1", (await h1()) === t.pricing.title, await h1());
  await landmarks("pricing");
  expect("only Pricing is current", JSON.stringify(await current()) === JSON.stringify([`${t.header.pricing}=page`]), await current());
  expect("one plan card per tier", (await count('[data-testid="tiers"] [data-highlighted]')) === data.tiers.length, await count('[data-testid="tiers"] [data-highlighted]'));
  const prices = await page.$$eval('[data-testid="tiers"] [data-highlighted] h2', (els) => els.map((e) => (e.textContent ?? "").trim()));
  // the expected display from the fixture through the formatter the blocks use: integer minor units + currency -> fmtMoney
  const shown = data.tiers.map((tier) => (tier.price === 0 ? data.dict.pricing.free : fmtMoney(tier.price, tier.currency)));
  expect("prices come from the fixture", JSON.stringify(prices) === JSON.stringify(shown), { prices, shown });
  const want = data.tiers.filter((x) => x.highlighted).length;
  expect("the highlighted tier is marked and has the badge", (await count('[data-testid="tiers"] [data-highlighted="true"]')) === want && (await page.getByText("Popular", { exact: true }).count()) === want);
  // 4. FAQ: native disclosures
  expect("one disclosure per question", (await count('[data-testid="faq-item"]')) === data.faq, await count('[data-testid="faq-item"]'));
  const first = page.locator('[data-testid="faq-item"]').first();
  expect("disclosures start closed", (await first.getAttribute("open")) === null);
  await first.locator("summary").click();
  expect("click opens a disclosure", (await first.getAttribute("open")) !== null);
  await first.locator("summary").click();
  expect("click closes it again", (await first.getAttribute("open")) === null);
  await snap("pricing");
  await shot("pricing-light");
  // 5. pricing -> home by the navigation, history
  await page.getByTestId("brand").click();
  await page.waitForSelector('[data-testid="feature-grid"]');
  expect("brand link goes home", (await hash()) === "#/" && (await h1()) === t.home.title, await hash());
  await page.goBack();
  await page.waitForSelector('[data-testid="tiers"]');
  expect("history back returns to pricing", (await hash()) === "#/pricing");
  await page.reload();
  await page.waitForSelector('[data-testid="tiers"]');
  expect("reload keeps the route", (await h1()) === t.pricing.title);
  // 6. theme, kept across routes
  await page.getByTestId("theme-toggle").click();
  expect("theme toggle sets dark", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
  await shot("pricing-dark");
  await page.getByTestId("nav-link").first().click();
  await page.waitForSelector('[data-testid="feature-grid"]');
  expect("dark theme survives navigation", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
  await shot("home-dark");
  await page.getByTestId("theme-toggle").click();
  expect("theme toggles back to light", (await page.evaluate(() => document.documentElement.dataset.theme)) === "light");
  // 7. an unknown address
  await page.goto(base + "/#/nope");
  await page.waitForFunction((title) => document.querySelector("h1")?.textContent === title, t.notFound.title);
  expect("unknown address shows the not-found page", (await h1()) === t.notFound.title, await h1());
  expect("not-found: the way back is a link home", (await page.getByTestId("action-primary").getAttribute("href")) === "#/");
  expect("not-found: one h1, one main, no current link", (await count("h1")) === 1 && (await count("main")) === 1 && (await current()).length === 0);
  await snap("notfound");
  return { name: "", steps, failures };
}
