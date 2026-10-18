#!/usr/bin/env bun
// Rules 01, 02, 03 and 06 for the workspace this runs in (apps/<name> or packages/<name>): a delegate of the `rules` group of `xgen check`.
// It replaces the old Svelte-only xgen-retag, xgen-rules and xgen-i18n: one set of detectors for svelte, react and vue,
// zones from the "ui8kit" field of package.json, baselines in rules/baselines/<package>.json. Cyrillic is the `text` group of `xgen check`.
//   xgen-rules          exit 1 on a finding that is not recorded in the baseline
import path from "node:path";
import { spawnSync } from "node:child_process";
import { APP, REPO } from "../src/app.mjs";

const dir = path.relative(REPO, APP);
const r = spawnSync("bun", [path.join(REPO, "xgen/check/tools/rules.ts"), "--gate", ...(dir ? [dir] : [])], { stdio: "inherit" });
process.exit(r.status ?? 1);
