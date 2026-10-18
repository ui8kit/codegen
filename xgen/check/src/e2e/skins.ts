// The Skins screen: three rows of tiles (skins, fonts, radii) in the order of the board, each skin tile drawn in its own skin;
// a skin tile puts data-skin on <html>, a font tile changes the computed --font-sans, a radius tile the computed --radius;
// the choice survives a reload and reaches the other screens; `?skin=` still wins; a second click and the reset buttons undo it;
// no sideways scroll at 390; the page rules and the theme button.
import type { Page } from "playwright-core";
import type { SkinsBoard } from "@ui8kit/xgen-screens";
import type { E2eResult, Shot, Snap } from "./common";
import { pageChecks } from "./page-checks";

export interface SkinsData { dict: any; board: SkinsBoard }

export async function skinsScenario(page: Page, base: string, data: SkinsData, shot: Shot, snap: Snap): Promise<E2eResult> {
  const failures: string[] = [];
  let steps = 0;
  const expect = (what: string, ok: boolean, got?: unknown): void => { steps++; if (!ok) failures.push(`${what}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ""}`); };
  const d = data.dict.skins;
  const { skins, fonts, radii } = data.board;
  const skin = (): Promise<string | undefined> => page.evaluate(() => document.documentElement.dataset.skin);
  const rootVar = (name: string): Promise<string> => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
  const pressed = (sel: string, attr: string): Promise<string[]> => page.$$eval(sel, (els, a) => els.filter((e) => e.getAttribute("aria-pressed") === "true").map((e) => e.getAttribute(a) ?? ""), attr);
  const ready = async (): Promise<void> => { await page.waitForSelector('[data-testid="radius-list"]'); await page.waitForTimeout(50); };

  // 1. the board: three rows, every tile in the order of the spec; nothing stored, so the build skin (default) is on and pressed
  await page.goto(base + "/");
  await ready();
  expect("h1 is the skins title", (await page.locator("h1").first().innerText()) === d.title);
  await pageChecks(page, expect, "skins");
  const rows = await page.$$eval('[data-testid="skins-row"]', (els) => els.map((e) => e.getAttribute("data-row")));
  expect("three rows: skins, fonts, radius", JSON.stringify(rows) === JSON.stringify(["skins", "fonts", "radius"]), rows);
  const ids = (sel: string, attr: string): Promise<string[]> => page.$$eval(sel, (els, a) => els.map((e) => e.getAttribute(a) ?? ""), attr);
  expect("15 skin tiles in order, default first", skins.length === 15 && JSON.stringify(await ids('[data-testid="skin-tile"]', "data-skin-pick")) === JSON.stringify(skins), await ids('[data-testid="skin-tile"]', "data-skin-pick"));
  expect("10 font tiles in order", fonts.length === 10 && JSON.stringify(await ids('[data-testid="font-tile"]', "data-font-family")) === JSON.stringify(fonts.map((f) => f.family)));
  expect("5 radius tiles in order", radii.length === 5 && JSON.stringify(await ids('[data-testid="radius-tile"]', "data-radius")) === JSON.stringify(radii.map((r) => r.value)));
  const names = await page.$$eval('[data-testid="skin-tile"]', (els) => els.map((e) => (e.textContent ?? "").trim()));
  expect("every skin tile names its skin", skins.every((s, i) => names[i]!.endsWith(d.skins.names[s.replace(/-([a-z0-9])/g, (_m, c: string) => c.toUpperCase())])), names);
  const primaries = await page.$$eval('[data-testid="skin-preview"]', (els) => els.map((e) => getComputedStyle(e).getPropertyValue("--primary").trim()));
  expect("every skin tile is drawn in its own skin (15 different primaries)", new Set(primaries).size === skins.length, primaries);
  const fontsShown = await page.$$eval('[data-testid="font-tile"]', (els) => els.map((e) => getComputedStyle(e).fontFamily));
  expect("every font tile is drawn in its font", fontsShown.every((f, i) => f.includes(fonts[i]!.family)), fontsShown);
  const radiiShown = await page.$$eval("[data-radius-sample]", (els) => els.map((e) => getComputedStyle(e).borderTopLeftRadius));
  expect("every radius sample shows its radius", JSON.stringify(radiiShown) === JSON.stringify(radii.map((r) => r.value)), radiiShown);
  expect("nothing stored: the build skin is on", (await skin()) === "default", await skin());
  expect("the default tile is the pressed one", JSON.stringify(await pressed('[data-testid="skin-tile"]', "data-skin-pick")) === JSON.stringify(["default"]));
  const own = { font: await rootVar("--font-sans"), radius: await rootVar("--radius") };
  await snap("index");
  await shot("index-light", true);

  // 2. a skin, a font and a radius
  const pick = skins.find((s) => s === "claude") ?? skins[1]!;
  const font = fonts.find((f) => f.family === "Golos Text") ?? fonts[0]!;
  const radius = radii[radii.length - 1]!;
  await page.locator(`[data-skin-pick="${pick}"]`).click();
  expect("a skin tile sets data-skin on <html>", (await skin()) === pick, await skin());
  const tilePrimary = await page.locator(`[data-skin-pick="${pick}"] [data-testid="skin-preview"]`).evaluate((e) => getComputedStyle(e).getPropertyValue("--primary").trim());
  expect("the page takes the colours of the tile", (await rootVar("--primary")) === tilePrimary, [await rootVar("--primary"), tilePrimary]);
  expect("the picked skin tile is the pressed one", JSON.stringify(await pressed('[data-testid="skin-tile"]', "data-skin-pick")) === JSON.stringify([pick]));
  const skinFont = await rootVar("--font-sans");
  await page.locator(`[data-font-pick="${font.id}"]`).click();
  expect("a font tile changes the computed --font-sans", (await rootVar("--font-sans")).includes(font.family) && (await rootVar("--font-sans")) !== skinFont, await rootVar("--font-sans"));
  expect("the body is set in that font", (await page.evaluate(() => getComputedStyle(document.body).fontFamily)).includes(font.family));
  const skinRadius = await rootVar("--radius");
  await page.locator(`[data-radius-pick="${radius.id}"]`).click();
  expect("a radius tile changes the computed --radius", (await rootVar("--radius")) === radius.value && skinRadius !== radius.value, [skinRadius, await rootVar("--radius")]);
  expect("the font and radius tiles are pressed", JSON.stringify([await pressed('[data-testid="font-tile"]', "data-font-pick"), await pressed('[data-testid="radius-tile"]', "data-radius-pick")]) === JSON.stringify([[font.id], [radius.id]]));
  await snap("picked");

  // 3. the choice survives a reload and reaches another screen
  await page.reload();
  await ready();
  expect("after a reload: the skin", (await skin()) === pick, await skin());
  expect("after a reload: the font", (await rootVar("--font-sans")).includes(font.family), await rootVar("--font-sans"));
  expect("after a reload: the radius", (await rootVar("--radius")) === radius.value, await rootVar("--radius"));
  expect("after a reload: the tiles are pressed", JSON.stringify(await pressed("[aria-pressed]", "data-testid")) === JSON.stringify(["skin-tile", "font-tile", "radius-tile"]));
  await page.goto(base.replace(/\/skins$/, "/catalog") + "/");
  await page.waitForSelector("h1");
  expect("another screen wears the picked skin, font and radius", (await skin()) === pick && (await rootVar("--font-sans")).includes(font.family) && (await rootVar("--radius")) === radius.value);

  // 4. ?skin= wins over the stored skin; picking a tile drops it from the address
  await page.goto(base + "/?skin=default#/");
  await ready();
  expect("?skin= wins over the stored skin", (await skin()) === "default", await skin());
  await page.locator(`[data-skin-pick="${pick}"]`).click();
  expect("a picked skin drops ?skin= from the address", !page.url().includes("skin=") && (await skin()) === pick, page.url());

  // 5. back: a second click drops the font and the radius, the reset buttons go back to the skin and the build
  await page.locator(`[data-radius-pick="${radius.id}"]`).click();
  expect("a second click on the radius tile gives the skin's radius back", (await rootVar("--radius")) === skinRadius, await rootVar("--radius"));
  await page.getByTestId("reset-fonts").click();
  expect("the font reset gives the skin's font back", (await rootVar("--font-sans")) === skinFont, await rootVar("--font-sans"));
  await page.getByTestId("reset-skins").click();
  expect("the skin reset gives the build skin back", (await skin()) === "default", await skin());
  expect("and the look of the start", (await rootVar("--font-sans")) === own.font && (await rootVar("--radius")) === own.radius);
  const stored = await page.evaluate(() => ["xgen-skin", "xgen-font", "xgen-radius"].map((k) => localStorage.getItem(k)));
  expect("nothing is stored after the resets", stored.every((v) => v === null), stored);

  // 6. at 390 px the page does not scroll sideways
  const desk = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.waitForTimeout(50);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect("at 390: the page does not scroll sideways", over <= 1, over);
  if (desk) await page.setViewportSize(desk);

  // 7. the theme button of the bar, and back
  const theme = (): Promise<string | undefined> => page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByTestId("theme-toggle").first().click();
  expect("the theme button sets dark", (await theme()) === "dark");
  const darkPrimaries = await page.$$eval('[data-testid="skin-preview"]', (els) => els.map((e) => getComputedStyle(e).getPropertyValue("--primary").trim()));
  expect("in dark every tile shows the dark side of its skin", darkPrimaries.some((p, i) => p !== primaries[i]), darkPrimaries);
  await page.getByTestId("theme-toggle").first().click();
  expect("and back to light", (await theme()) === "light");
  return { name: "", steps, failures };
}
