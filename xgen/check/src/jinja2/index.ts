// The Jinja2 gate: a Python virtual environment with the generated requirements (Jinja2), then every brick case and every
// block case rendered with real Jinja2 through bin/parity.py, DOM parity with React and html-validate of every block case
// (the same harness as the Twig gate). Skips when Python, venv or the Jinja2 install is unavailable.
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { LoadedBrick } from "@ui8kit/xgen-spec";
import type { Inputs } from "@ui8kit/xgen-screens";
import { jinja } from "@ui8kit/xgen-runtime-jinja2";
import { run, templateParity, type TwigResult } from "../twig";

export const JINJA2_DIR = "packages/jinja2/ui";
export type Jinja2Result = TwigResult & { python?: string; jinja2?: string };

export async function jinja2Check(workspace: string, bricks: LoadedBrick[], inputs: Inputs): Promise<Jinja2Result> {
  const dir = join(workspace, JINJA2_DIR);
  const none = { cases: 0, blocks: 0, organisms: 0 };
  const py = run("python3", ["-c", "import sys; print('%d.%d.%d' % sys.version_info[:3])"], ".");
  if (!py.ok) return { ok: true, problems: [], ...none, skipped: "no Python" };
  const bin = join(dir, ".venv", "bin", "python");
  if (!existsSync(bin) && !run("python3", ["-m", "venv", ".venv"], dir).ok) return { ok: true, problems: [], ...none, skipped: "no Python venv" };
  let version = run(bin, ["-c", "import jinja2; print(jinja2.__version__)"], dir);
  if (!version.ok) {
    if (!run(bin, ["-m", "pip", "install", "-q", "-r", "requirements.txt"], dir).ok) return { ok: true, problems: [], ...none, skipped: "Jinja2 could not be installed (pip)" };
    version = run(bin, ["-c", "import jinja2; print(jinja2.__version__)"], dir);
  }
  const render = (reqs: Array<{ template: string; vars: Record<string, unknown> }>): string[] | string => {
    const r = run(bin, ["bin/parity.py"], dir, JSON.stringify(reqs));
    if (!r.ok) return `python bin/parity.py: ${r.err.trim().split("\n").slice(-12).join("\n")}`;
    return JSON.parse(r.out) as string[];
  };
  return { ...(await templateParity(workspace, dir, bricks, inputs, jinja, render)), python: py.out.trim(), jinja2: version.out.trim() };
}
