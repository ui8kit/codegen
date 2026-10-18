// What every scenario shares: waiting for a server, serving an app, the DOM structure the pair test compares, a counter of expectations.
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import type { Page } from "playwright-core";

export interface E2eResult { name: string; steps: number; failures: string[] }
export type Expect = (what: string, ok: boolean, got?: unknown) => void;
export type Shot = (label: string, full?: boolean) => Promise<void>;
export type Snap = (label: string) => Promise<void>;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function waitPort(url: string, ms = 20000): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if ((await fetch(url)).ok) return; } catch { /* not yet */ }
    await sleep(150);
  }
  throw new Error(`no server at ${url}`);
}

export function serve(dir: string): ChildProcess {
  return spawn(join(dir, "..", "..", "node_modules", ".bin", "vite"), ["preview"], { cwd: dir, stdio: "ignore" });
}

/** the DOM of the page, reduced to what the specs decide: tag, class set, ARIA, data attributes, type, scope, text */
export async function structure(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const keep = (n: Element): string => {
      const attrs = [...n.attributes]
        // data-v-app: the mark Vue puts on the mount point, bookkeeping of the runtime rather than output of a spec
        .filter((a) => a.name !== "data-v-app")
        .filter((a) => a.name.startsWith("aria-") || a.name.startsWith("data-") || ["type", "scope", "role", "href", "placeholder", "disabled"].includes(a.name))
        .map((a) => `${a.name}=${a.value}`).sort();
      const cls = [...n.classList].sort().join(".");
      return `${n.tagName.toLowerCase()}${cls ? "." + cls : ""}${attrs.length ? "[" + attrs.join(",") + "]" : ""}`;
    };
    const walk = (n: Element, depth: number): void => {
      const own = [...n.childNodes].filter((c) => c.nodeType === 3).map((c) => (c.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" ").replace(/\s+/g, " ");
      out.push(`${"  ".repeat(depth)}${keep(n)}${own ? " " + JSON.stringify(own) : ""}`);
      for (const c of n.children) walk(c, depth + 1);
    };
    walk(document.getElementById("app")!, 0);
    return out;
  });
}
