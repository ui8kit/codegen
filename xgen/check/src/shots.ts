// `xgen shot`: one full-page screenshot of a screen served by a host app (/<screen>/#/<route>), for local visual compares.
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { hostedScreens, planBuild } from "@ui8kit/xgen-generator";
import { screenKey } from "@ui8kit/xgen-runtime-core";
import { serve, waitPort } from "./e2e/common";

export interface ShotOptions { screen: string; runtime: "svelte" | "react" | "vue"; width: number; theme: "light" | "dark"; route: string; out?: string }

export async function runShot(workspace: string, o: ShotOptions): Promise<{ file: string; errors: string[] }> {
  const plan = planBuild(workspace);
  const host = plan.apps.find((a) => a.app.runtime === o.runtime && hostedScreens(a.app, plan.inputs.screens.map((s) => s.value)).screens.some((s) => screenKey(s.id) === o.screen));
  if (!host) throw new Error(`no ${o.runtime} host serves the screen "${o.screen}"`);
  const file = resolve(workspace, o.out ?? join("shots", `${o.screen}-${o.runtime}-${o.theme}-${o.width}.png`));
  mkdirSync(dirname(file), { recursive: true });
  const proc = serve(host.dir);
  const errors: string[] = [];
  const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  try {
    const origin = `http://127.0.0.1:${host.app.port}`;
    await waitPort(origin);
    const page = await browser.newPage({ viewport: { width: o.width, height: 900 } });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    // the saved choice wins over the host default (see runtime/theme.ts)
    await page.addInitScript((mode) => { localStorage.setItem("xgen-theme", mode); }, o.theme);
    await page.goto(`${origin}/${o.screen}/#/${o.route}`, { waitUntil: "networkidle" });
    await page.waitForSelector("main#main-content");
    await page.screenshot({ path: file, fullPage: true });
  } finally {
    await browser.close();
    proc.kill();
  }
  return { file, errors };
}
