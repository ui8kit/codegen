// The PHP helpers shared by the PHP template runtimes (Twig, Latte): assets/php-shared holds Runtime.php and CnMerge.php
// with the namespace written as `UI8Kit\{{RUNTIME}}`; each package gets them in its own namespace (UI8Kit\Twig,
// UI8Kit\Latte) next to its own Extension.php, so two packages in one app never declare the same class.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SHARED = join(import.meta.dir, "..", "assets", "php-shared");
export const PHP_SHARED_SOURCE = "xgen/runtimes/twig/assets/php-shared";

/** the shared helpers as [file name, PHP source] in the namespace UI8Kit\<runtime> (`Twig`, `Latte`) */
export function phpHelpers(runtime: string): Array<[string, string]> {
  return readdirSync(SHARED).filter((n) => n.endsWith(".php")).sort()
    .map((n): [string, string] => [n, readFileSync(join(SHARED, n), "utf8").replaceAll("{{RUNTIME}}", runtime)]);
}
