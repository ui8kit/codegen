// A theme app: composed pages made of the blocks of one theme. Every route passes the page rules in light and dark, keeps its h1 from the dictionary,
// has no sideways scroll at 390 px, keeps its containers centered, and the skip link, the header and the footer of the frame are there.
import type { Page } from "playwright-core";
import { areaOf, keyOf, themeApps, themeTexts } from "@ui8kit/xgen-screens";
import type { E2eResult, Shot, Snap } from "./common";
import { pageChecks } from "./page-checks";

export const THEME_SCREEN = /^screen\.theme-/;
const PHONE = 390;
const DESKTOP = 1100;
/** the slack, in px, of the rounding of boxes */
const SLACK = 2;

export async function themeScenario(page: Page, base: string, screen: string, shot: Shot, snap: Snap): Promise<E2eResult> {
  const failures: string[] = [];
  let steps = 0;
  const expect = (what: string, ok: boolean, got?: unknown): void => { steps++; if (!ok) failures.push(`${what}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ""}`); };
  const app = themeApps.find((a) => `screen.theme-${a.name}` === screen);
  if (!app) return { name: "", steps: 1, failures: [`${screen}: no theme app of that name in xgen/screens/src/authoring/screens/themes.ts`] };
  const texts = themeTexts()[keyOf(app.name)] ?? {};
  const theme = (): Promise<string | undefined> => page.evaluate(() => document.documentElement.dataset.theme);
  const visit = async (path: string): Promise<void> => { await page.goto(`${base}/#/${path}`); await page.waitForSelector("main#main-content h1"); };
  const sideways = (): Promise<number> => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const containers = (): Promise<Array<{ left: number; right: number; width: number }>> => page.$$eval('main [data-slot="container"]', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { left: r.left, right: document.documentElement.clientWidth - r.right, width: r.width }; }));

  for (const mode of ["light", "dark"] as const) {
    if (mode === "dark") {
      await page.getByTestId("theme-toggle").first().click();
      expect("the theme button sets dark", (await theme()) === "dark", await theme());
    }
    for (const p of app.pages) {
      const area = areaOf(p.path);
      const where = `${area}${mode === "dark" ? " (dark)" : ""}`;
      await visit(p.path);
      if (mode === "dark" && (await theme()) !== "dark") await page.getByTestId("theme-toggle").first().click();
      await pageChecks(page, expect, where);
      const want = texts[area]?.title;
      if (want !== undefined) expect(`${where}: the h1 is the title of the page`, (await page.locator("h1").first().innerText()) === want, [want, await page.locator("h1").first().innerText()]);
      expect(`${where}: the frame has a header with the skip link, and a footer`, (await page.locator("header").count()) >= 1 && (await page.getByTestId("skip-link").count()) >= 1 && (await page.locator("footer").count()) >= 1);
      expect(`${where}: the page has at least one block besides the lead`, p.rest.length === 0 || (await page.locator("main section, main aside, main nav").count()) > 1, p.rest.length);
      for (const w of [DESKTOP, PHONE]) {
        await page.setViewportSize({ width: w, height: 900 });
        expect(`${where} at ${w}: no sideways scroll`, (await sideways()) <= 0, await sideways());
        const bad = (await containers()).filter((c) => Math.abs(c.left - c.right) > SLACK || c.width > w);
        expect(`${where} at ${w}: every container is centered and inside the screen`, bad.length === 0, bad.slice(0, 2));
      }
      await page.setViewportSize({ width: DESKTOP, height: 900 });
      if (mode === "light") await snap(area);
      await shot(`${area}-${mode}`, true);
    }
    expect(`${mode}: the theme stays across routes`, (await theme()) === mode, await theme());
  }
  await page.getByTestId("theme-toggle").first().click();
  expect("the theme toggles back to light", (await theme()) === "light", await theme());

  // keyboard: the first Tab lands on the skip link; Enter keeps the route and moves to main
  await visit(app.pages[0]!.path);
  await page.reload();
  await page.waitForSelector("main#main-content h1");
  await page.keyboard.press("Tab");
  expect("the first Tab lands on the skip link", (await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) === "skip-link");
  await page.keyboard.press("Enter");
  expect("the skip link moves focus to main", (await page.evaluate(() => document.activeElement?.id)) === "main-content");

  // the menu of the app: every link of the bar leads to its page (the h1 of that page), and the current one is marked
  await visit(app.pages[0]!.path);
  // the frame menu sits outside main; pages that demo other bars also draw nav-link nodes inside main, so ignore those
  const menuLinks = (): Promise<Array<{ text: string; href: string; current: boolean }>> => page.evaluate(() => {
    const main = document.querySelector("main");
    const roots = [...document.querySelectorAll("header")].filter((h) => !main?.contains(h));
    return roots.flatMap((h) => [...h.querySelectorAll<HTMLAnchorElement>('[data-testid="nav-link"]')].map((a) => ({ text: a.innerText.trim(), href: a.getAttribute("href") ?? "", current: a.getAttribute("aria-current") === "page" })));
  });
  const labels = await menuLinks();
  expect("the menu of the bar has one link per page, in order", labels.length === app.pages.length && labels.every((l, i) => l.href === (app.pages[i]!.path === "" ? "#/" : `#/${app.pages[i]!.path}`)), labels);
  for (let i = 0; i < app.pages.length; i++) {
    const p = app.pages[i]!;
    const area = areaOf(p.path);
    const href = p.path === "" ? "#/" : `#/${p.path}`;
    const clicked = await page.evaluate((n) => {
      const main = document.querySelector("main");
      const roots = [...document.querySelectorAll("header")].filter((h) => !main?.contains(h));
      const a = roots.flatMap((h) => [...h.querySelectorAll<HTMLAnchorElement>('[data-testid="nav-link"]')])[n];
      if (!a) return null;
      a.click();
      return a.getAttribute("href");
    }, i);
    expect(`nav ${area}: the link is in the bar`, clicked === href, clicked);
    const reached = await page.waitForFunction((h) => location.hash === h, href, { timeout: 5000 }).then(() => true).catch(() => false);
    expect(`nav ${area}: the link changes the hash`, reached, await page.evaluate(() => location.hash));
    if (!reached) continue;
    await page.waitForSelector("main#main-content h1");
    const want = texts[area]?.title;
    if (want !== undefined) expect(`nav ${area}: the link opens the page (h1)`, (await page.locator("h1").first().innerText()) === want, [want, await page.locator("h1").first().innerText()]);
    else expect(`nav ${area}: the link opens the area`, (await page.evaluate(() => location.hash)) === href, await page.evaluate(() => location.hash));
    const current = (await menuLinks()).filter((l) => l.current).map((l) => l.href);
    expect(`nav ${area}: the current link is marked`, current.length === 1 && current[0] === href, current);
  }
  return { name: "", steps, failures };
}
