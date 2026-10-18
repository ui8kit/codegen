// Checks every page of every app must pass: landmarks, headings, ids, no gradients, pictures embedded and themed.
import type { Page } from "playwright-core";
import type { Expect } from "./common";

/** the page-level rules; `where` names the page in the messages */
export async function pageChecks(page: Page, expect: Expect, where: string): Promise<void> {
  expect(`${where}: one h1`, (await page.locator("h1").count()) === 1, await page.locator("h1").count());
  expect(`${where}: one main, with id main-content`, (await page.locator("main#main-content").count()) === 1);
  const levels = await page.$$eval("h1,h2,h3,h4,h5,h6", (els) => els.map((e) => Number(e.tagName[1])));
  expect(`${where}: heading levels never skip down`, levels.every((l, i) => i === 0 ? l === 1 : l <= levels[i - 1]! + 1), levels);
  const ids = await page.$$eval("[id]", (els) => els.map((e) => e.id));
  expect(`${where}: ids are unique`, new Set(ids).size === ids.length, ids);
  const grad = await page.evaluate(() => [...document.querySelectorAll("*")].filter((e) => getComputedStyle(e).backgroundImage.includes("gradient")).length);
  expect(`${where}: no gradients`, grad === 0, grad);
  const outside = await page.$$eval("img", (els) => els.filter((e) => !(e.getAttribute("src") ?? "").startsWith("data:image/")).length);
  expect(`${where}: every picture is an embedded data URI, none from outside`, outside === 0, outside);
  const both = await page.$$eval('[data-slot="media-frame"]', (els) => els.filter((e) => e.querySelectorAll('img[data-theme-src="light"]').length !== 1 || e.querySelectorAll('img[data-theme-src="dark"]').length !== 1).length);
  expect(`${where}: every picture has a light and a dark image`, both === 0, both);
  const theme = await page.evaluate(() => document.documentElement.dataset.theme ?? "light");
  const shown = await page.$$eval('[data-slot="media-frame"]', (els) => els.map((e) => ["light", "dark"].filter((t) => getComputedStyle(e.querySelector(`img[data-theme-src="${t}"]`)!).display !== "none").join("+")));
  expect(`${where}: the ${theme} theme shows only the ${theme} image`, shown.every((x) => x === theme), shown);
  const unnamed = await page.$$eval("section", (els) => els.filter((e) => {
    const by = e.getAttribute("aria-labelledby");
    return !(e.getAttribute("aria-label") || (by && document.getElementById(by)?.textContent?.trim()));
  }).length);
  expect(`${where}: every section is named by a heading or a label`, unnamed === 0, unnamed);
  // layout guards: no sideways scroll, one page container centered at one width, an indicator on every disclosure
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(`${where}: the page does not scroll sideways`, overflow <= 1, overflow);
  const containers = await page.$$eval('[data-slot="container"]', (els) => els.filter((e) => (e as HTMLElement).offsetWidth > 0).flatMap((e) => {
    const p = e.parentElement!.getBoundingClientRect(), r = e.getBoundingClientRect(), cls = e.getAttribute("class") ?? "";
    // the page width, or a narrow centered column (an auth card, a plan card: max-w-xs to max-w-md); never in between
    const width = !/\bmax-w-(lg|xl|2xl|3xl|4xl|5xl)\b/.test(cls);
    const centered = Math.abs((r.left - p.left) - (p.right - r.right)) <= 2;
    return width && centered ? [] : [`${cls.match(/max-w-\S+/)?.[0] ?? "no max-w"} ${Math.round(r.left - p.left)}/${Math.round(p.right - r.right)}`];
  }));
  expect(`${where}: every page container is the shared one (max-w-6xl; a narrow card column up to max-w-md) and centered`, containers.length === 0, containers);
  const bare = await page.$$eval("details > summary", (els) => els.filter((e) => !e.querySelector('[data-slot="summary-indicator"]')).length);
  expect(`${where}: every disclosure shows its open/close indicator`, bare === 0, bare);
  const unlabelled = await page.$$eval("nav, aside", (els) => els.filter((e) => !(e.getAttribute("aria-label") || e.getAttribute("aria-labelledby"))).length);
  expect(`${where}: every navigation and aside has a label`, unlabelled === 0, unlabelled);
}
