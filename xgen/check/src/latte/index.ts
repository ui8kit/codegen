// The Latte gate: the same as Twig's (composer install, php -l, every brick and block case rendered with real Latte
// through bin/parity.php against React, html-validate of every block case), over packages/latte/ui. Skips without PHP.
import type { LoadedBrick } from "@ui8kit/xgen-spec";
import type { Inputs } from "@ui8kit/xgen-screens";
import { latte } from "@ui8kit/xgen-runtime-twig";
import { phpTemplateCheck, type TwigResult } from "../twig";

export const LATTE_DIR = "packages/latte/ui";

export function latteCheck(workspace: string, bricks: LoadedBrick[], inputs: Inputs): Promise<TwigResult> {
  return phpTemplateCheck(workspace, LATTE_DIR, bricks, inputs, latte);
}
