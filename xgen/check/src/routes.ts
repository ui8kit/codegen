// The `routes` group of `xgen check`: the menu of every screen leads to routes of that screen and names dictionary texts,
// a screen that reads the menu has one, and the hosts serve every screen in both runtimes.
import { relative } from "node:path";
import { hostedScreens, type Plan } from "@ui8kit/xgen-generator";
import { portableTo, UI_RUNTIMES } from "@ui8kit/xgen-spec";
import type { CheckResult } from "./result";

export function checkRoutes(plan: Plan): CheckResult {
  const problems: string[] = [];
  const dict = plan.inputs.dictionary.value as Record<string, unknown>;
  const leaf = (key: string): boolean => typeof key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), dict) === "string";
  for (const { file, value: s } of plan.inputs.screens) {
    const at0 = relative(plan.workspace, file);
    const menu = s.menu ?? [];
    if (s.nav && menu.length === 0) problems.push(`${at0}: the screen reads the menu (nav) but has no "menu"`);
    if (menu.length && !s.nav) problems.push(`${at0}: a "menu", but the screen shows no menu (nav)`);
    const paths = new Set(s.routes.map((r) => r.path));
    const seen = { id: new Set<string>(), path: new Set<string>() };
    menu.forEach((r, i) => {
      const at = `${at0}: menu[${i}] (${r.id})`;
      if (seen.id.has(r.id)) problems.push(`${at}: the id is used twice`);
      if (seen.path.has(r.path)) problems.push(`${at}: the path "${r.path}" is used twice`);
      seen.id.add(r.id); seen.path.add(r.path);
      if (!paths.has(r.path)) problems.push(`${at}: the screen has no route "${r.path}"`);
      if (!leaf(r.titleKey)) problems.push(`${at}: titleKey ${r.titleKey} is not a text of xgen/content/ui/en.json`);
    });
  }
  // every screen portable to a runtime is served by a host of that runtime
  const all = plan.inputs.screens.map((s) => s.value);
  for (const rt of UI_RUNTIMES) {
    const hosts = plan.apps.filter((a) => a.app.runtime === rt);
    if (!hosts.length) { problems.push(`no host app for ${rt} (apps/host-${rt}/xgen.app.json)`); continue; }
    const served = new Set(hosts.flatMap((h) => hostedScreens(h.app, all).screens.map((s) => s.id)));
    for (const s of all) if (portableTo(s.portable, rt) === true && !served.has(s.id)) problems.push(`${s.id}: portable to ${rt} but no ${rt} host serves it`);
  }
  return { name: "routes", what: "every screen menu leads to routes of its screen and names texts of the dictionary, a screen with nav has a menu, and the hosts serve every screen in every runtime", problems };
}
