// What the first block catalog promises about a variant, one case per block: counts of the parts it must show and the columns of its grid.
// New blocks do not add cases here: they carry `facts` in their spec and facts.ts checks those.
import type { Expect } from "./common";

/** what each of the other blocks promises about a variant: counts of the parts it must show and the columns of its grid */
export async function legacyChecks(key: string, row: Record<string, string>, where: string, n: (sel: string) => Promise<number>, xsOf: (sel: string) => Promise<number[]>, counts: Record<string, number>, done: number, expect: (what: string, ok: boolean, got?: unknown) => void): Promise<void> {
  const I = '[data-testid="item"]';
  const items = async (collection: string, sel = I, want = counts[collection]): Promise<void> => expect(`${where}: one item per ${collection} entry`, (await n(sel)) === want, [await n(sel), want]);
  const columns = async (want: number, sel = I): Promise<void> => expect(`${where}: ${want} column(s)`, (await xsOf(sel)).length === want, await xsOf(sel));
  const flag = async (what: string, sel: string, on: boolean, count = 1): Promise<void> => expect(`${where}: ${what}`, (await n(sel)) === (on ? count : 0), await n(sel));
  const min = Math.min;
  switch (key) {
    case "logos": await items("logos"); if (row["layout"] === "grid") await columns(min(Number(row["cols"]), counts["logos"]!)); break;
    case "stats": await items("stats", '[data-testid="items"] > *'); await columns(row["layout"] === "stack" ? 1 : min(Number(row["cols"]), counts["stats"]!), '[data-testid="items"] > *'); await flag("a picture behind the figures only when asked", '[data-testid="backdrop"]', row["surface"] === "image"); break;
    case "testimonials": expect(`${where}: one quote per entry, one in the single layout`, (await n(I)) === (row["layout"] === "single" ? 1 : counts["testimonials"]), await n(I))
      await flag("a rating only when asked", '[data-slot="rating"]', row["item.rating"] === "show" && row["item.kind"] !== "social", row["layout"] === "single" ? 1 : counts["testimonials"])
      await flag("a mark only when asked", '[data-testid="mark"]', row["item.mark"] === "icon" && row["item.kind"] !== "social")
      await flag("a masonry or a strip holds the quotes", '[data-testid="items"]', true); break;
    case "steps": await items("steps"); await columns(row["layout"] === "row" ? min(4, counts["steps"]!) : 1); break;
    case "categories": await items("categories"); await flag("one current category", '[aria-current="page"]', true); await flag("icons only when asked", `${I} svg`, row["icon"] === "show", counts["categories"]); break;
    case "products": await items("products"); await columns(row["layout"] === "list" ? 1 : row["layout"] === "rail" ? counts["products"]! : min(Number(String(row["cols"]).replace("1-", "")), counts["products"]!)); await flag("add buttons only when asked", '[data-testid="add"]', row["action"] === "button", counts["products"]); break;
    case "product": await flag("a gallery", '[data-testid="gallery"]', true); await flag("a buy box", '[data-testid="buy-box"]', true); await flag("thumbnails only when asked", '[data-testid="thumbs"]', row["thumbs"] !== "none"); break;
    case "reviews": await items("reviews"); break;
    case "cart": await items("cart"); await flag("pictures only when asked", `${I} [data-slot="media-frame"]`, row["media"] !== "none", counts["cart"]); break;
    case "summary": await flag("the summary", '[data-testid="summary"]', true); await flag("a checkout button only when asked", '[data-testid="checkout"]', row["cta"] !== "hide"); break;
    case "orders": await items("orders"); break;
    case "announcement": await flag("the strip", '[data-testid="announcement"]', true); await flag("a close button only when asked", '[data-testid="dismiss"]', row["dismiss"] === "show"); await flag("a tag only when asked", '[data-testid="announcement-badge"]', row["badge"] === "show"); expect(`${where}: the strip stays at the bottom only when asked`, (await n('[data-testid="announcement"][class*="sticky"]')) === (row["position"] === "bottom" ? 1 : 0)); await flag("the link", '[data-testid="announcement-cta"]', true); break;
    case "cookie": await flag("accept", '[data-testid="cookie-accept"]', true); await flag("decline", '[data-testid="cookie-decline"]', true); await flag("settings only when asked", '[data-testid="cookie-settings"]', row["actions"] === "three"); break;
    case "newsletter": await flag("an email field", '[data-testid="field"]', true); await flag("a button", '[data-testid="submit"]', true); await flag("a consent line only when asked", '[data-testid="consent"]', row["terms"] === "show"); await flag("a picture only in the split layout", '[data-slot="media-frame"]', row["layout"] === "split"); break;
    case "posts": await items("posts", I, row["filter.mode"] === "topics" ? counts["posts:Design"] : counts["posts"]); await flag("topic tabs only when asked", '[data-slot="switcher"]', row["filter.mode"] === "topics"); const shown = row["filter.mode"] === "topics" ? counts["posts:Design"]! : counts["posts"]!; await flag("pictures only when asked", `${I} [data-slot="media-frame"]`, row["media"] === "image", shown); if (row["layout"] === "grid") await columns(min(Number(String(row["cols"]).replace("1-", "")), shown)); if (row["layout"] === "list") await columns(1); break;
    case "postheader": await flag("the author line", '[data-testid="post-meta"]', true); await flag("a cover only when asked", '[data-slot="media-frame"]', true, row["cover"] === "show" ? 2 : 1); break;
    case "auth": expect(`${where}: the card carries its mode`, (await n(`[data-testid="auth-card"][data-mode="${row["mode"]}"]`)) === 1)
      await flag("the fields of the mode", '[data-testid="field"]', true, row["mode"] === "signup" ? 3 : row["mode"] === "signin" ? 2 : 1)
      expect(`${where}: other sign-in buttons come ${row["social"] === "first" ? "before" : "after"} the form`, row["social"] === "none" || row["mode"] === "reset" || row["mode"] === "magic" || ((await n('[data-testid="social"] ~ [data-testid="auth-form"]')) === (row["social"] === "first" ? 1 : 0)))
      await flag("other sign-in buttons only when asked", '[data-testid="social"]', row["social"] !== "none" && row["mode"] !== "reset" && row["mode"] !== "magic"); break;
    case "profile": await flag("the form", '[data-testid="profile-form"]', true); await flag("the picture only when asked", '[data-testid="avatar"]', row["avatar"] === "show"); await flag("the notifications only when asked", '[data-testid="prefs"]', row["prefs"] === "show"); break;
    case "metrics": await items("metrics"); await columns(row["cols"] === "2" ? 2 : 4); break;
    case "chart": if (row["chart"] === "bars") await flag("one bar chart", '[data-slot="bar-chart"]', true); else await flag("a meter per point", '[data-slot="meter-row"]', true, counts["series"]); break;
    case "activity": if (row["layout"] === "timeline") await flag("a timeline", '[data-slot="timeline"]', true); else await items("activity"); break;
    case "empty": await flag("the empty state", '[data-testid="empty"]', true); await flag("an action only when asked", '[data-testid="empty-action"]', row["actions"] !== "none"); await flag("a picture only when asked", '[data-slot="media-frame"]', row["visual"] === "image"); break;
    case "checklist": await items("checklist"); await flag("the done tasks", '[data-done="true"]', true, done); await flag("a progress bar only when asked", "progress", row["progress"] === "bar"); await flag("a count only when asked", '[data-testid="progress-text"]', row["progress"] === "text"); await flag("openers only when asked", '[data-testid="task-detail"]', row["detail"] === "expand", counts["checklist"]); break;
    case "stepper": await items("steps"); await flag("one current step", '[aria-current="step"]', true); await flag("the step text only when asked", '[data-testid="step-summary"]', row["summary"] === "show"); break;
    case "contact": await flag("the form", '[data-testid="contact-form"]', true); await flag("the fields of the form", '[data-testid="field"]', true, row["fields"] === "full" ? 4 : 2); await flag("the ways to reach us only in the split layout", '[data-testid="detail"]', row["layout"] === "split", counts["channels"]); break;
    case "channels": await items("channels"); await flag("links only when asked", '[data-testid="open"]', row["action"] === "link", counts["channels"]); break;
    default: expect(`${where}: the e2e knows this block`, false, key);
  }
}
