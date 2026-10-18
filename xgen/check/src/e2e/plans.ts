// The plans app: sort, open a record, URL state, the same steps in both runtimes.
import type { Page } from "playwright-core";
import type { E2eResult } from "./common";

const rowNames = (page: Page): Promise<string[]> => page.$$eval('[data-testid="plan-row"] [data-testid="open-record"]', (els) => els.map((e) => (e.textContent ?? "").trim()));

export async function scenario(page: Page, base: string, shot: (label: string) => Promise<void>, snap: (label: string) => Promise<void>): Promise<E2eResult> {
  const failures: string[] = [];
  let steps = 0;
  const expect = (what: string, ok: boolean, got?: unknown): void => { steps++; if (!ok) failures.push(`${what}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ""}`); };
  const hash = (): Promise<string> => page.evaluate(() => location.hash);
  const text = (id: string): Promise<string> => page.locator(`[data-testid="${id}"]`).first().innerText();

  await page.goto(base + "/");
  await page.waitForSelector('[data-testid="plans-table"]');
  // 1. the list: default sort price ascending, first page
  let names = await rowNames(page);
  expect("first page has 5 rows", names.length === 5, names);
  expect("default sort price ascending starts with Free", names[0] === "Free", names);
  expect("count says 12 plans", (await text("count")) === "12 plans", await text("count"));
  expect("price header is aria-sort ascending", (await page.locator('th[aria-sort="ascending"]').count()) === 1);
  await snap("list");
  await shot("list-light");
  // 2. sort: click Price -> descending, the URL carries it
  await page.getByRole("button", { name: "Price" }).click();
  names = await rowNames(page);
  expect("price descending starts with Enterprise", names[0] === "Enterprise", names);
  expect("URL has sort=price:desc", (await hash()).includes("sort=price:desc"), await hash());
  expect("price header is aria-sort descending", (await page.locator('th[aria-sort="descending"]').innerText()).includes("Price"));
  // 3. sort by name
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  names = await rowNames(page);
  expect("name ascending starts with Basic", names[0] === "Basic", names);
  expect("URL has sort=name:asc", (await hash()).includes("sort=name:asc"), await hash());
  // 4. search
  await page.getByRole("searchbox", { name: "Search plans" }).fill("legacy");
  await page.waitForFunction(() => document.querySelector('[data-testid="count"]')?.textContent === "2 plans");
  names = await rowNames(page);
  expect("search legacy finds the two legacy plans", names.length === 2 && names.includes("Legacy Starter") && names.includes("Legacy Team"), names);
  expect("URL has q=legacy", (await hash()).includes("q=legacy"), await hash());
  await page.getByRole("searchbox", { name: "Search plans" }).fill("zzz");
  await page.waitForSelector('[data-testid="empty"]');
  await snap("empty");
  expect("empty search shows the empty text", (await text("empty")).length > 0);
  await page.getByRole("searchbox", { name: "Search plans" }).fill("");
  await page.waitForFunction(() => document.querySelector('[data-testid="count"]')?.textContent === "12 plans");
  // 5. pager and reload keeps the state
  const page1 = await rowNames(page);
  await page.getByTestId("next").click();
  expect("URL has page=2", (await hash()).includes("page=2"), await hash());
  expect("page 2 shows 5 other rows", (await rowNames(page)).length === 5 && !(await rowNames(page)).some((n) => page1.includes(n)), await rowNames(page));
  const page2 = await rowNames(page);
  await snap("page-2");
  await page.reload();
  await page.waitForSelector('[data-testid="plans-table"]');
  expect("reload keeps sort and page", JSON.stringify(await rowNames(page)) === JSON.stringify(page2), await rowNames(page));
  await page.getByTestId("next").click();
  expect("last page has 2 rows", (await rowNames(page)).length === 2, await rowNames(page));
  expect("next is disabled on the last page", await page.getByTestId("next").isDisabled());
  await page.getByTestId("prev").click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="plan-row"]').length === 5);
  // 6. open a record, the card, back keeps the list state
  const before = await hash();
  const first = (await rowNames(page))[0]!;
  await page.getByTestId("open-record").first().click();
  await page.waitForSelector('[data-testid="record-id"]');
  expect("URL is the record route", /^#\/plans\/plan-/.test(await hash()), await hash());
  expect("record route keeps the list query", (await hash()).includes("sort=name:asc"), await hash());
  expect("the card shows the plan name", (await page.getByRole("heading", { name: first, level: 3 }).count()) === 1);
  expect("the footer slot gets the plan", (await text("record-id")).startsWith("Plan id: plan-"));
  await snap("record");
  await shot("record-light");
  await page.getByTestId("back").click();
  await page.waitForSelector('[data-testid="plans-table"]');
  expect("back returns to the list state", (await hash()) === before, [before, await hash()]);
  // 7. history: browser back goes to the record, forward to the list
  await page.goBack();
  await page.waitForSelector('[data-testid="record-id"]');
  expect("history back shows the record", /^#\/plans\/plan-/.test(await hash()));
  await page.goForward();
  await page.waitForSelector('[data-testid="plans-table"]');
  // 8. an unknown record
  await page.goto(base + "/#/plans/nope");
  await page.waitForSelector('[data-testid="missing"]');
  expect("unknown record says so", (await text("missing")).length > 0);
  await snap("missing");
  // 9. a direct link to a record
  await page.goto(base + "/#/plans/plan-team");
  await page.waitForSelector('[data-testid="record-id"]');
  expect("direct link opens the Team card", (await page.getByRole("heading", { name: "Team", level: 3 }).count()) === 1);
  expect("the highlighted plan shows its badge", (await page.getByText("Popular").count()) === 1);
  await snap("record-highlighted");
  // 10. theme
  await page.getByTestId("theme-toggle").click();
  expect("theme toggle sets data-theme=dark", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
  await shot("record-dark");
  await page.goto(base + "/#/");
  await page.waitForSelector('[data-testid="plans-table"]');
  expect("theme survives navigation", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
  await shot("list-dark");
  await page.getByTestId("theme-toggle").click();
  expect("theme toggles back to light", (await page.evaluate(() => document.documentElement.dataset.theme)) === "light");
  return { name: "", steps, failures };
}

