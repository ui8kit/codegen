/**
 * composer install in generated/ — uses global composer or local composer.phar.
 */
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolvePhp } from "./resolve-php.mjs";

const generated = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "generated");
const php = resolvePhp();

if (!php) {
  console.error("php not found — install PHP 8.1+ or set PHP=/path/to/php");
  process.exit(1);
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: generated, stdio: "inherit", shell: cmd === "composer" });
  return r.status ?? 1;
}

if (run("composer", ["install", "--no-interaction"]) === 0) {
  process.exit(0);
}

const phar = join(generated, "composer.phar");
if (!existsSync(phar)) {
  console.log("Downloading composer.phar…");
  const curl = spawnSync("curl", ["-sS", "https://getcomposer.org/installer", "-o", "composer-setup.php"], {
    cwd: generated,
    stdio: "inherit",
  });
  if (curl.status !== 0) process.exit(curl.status ?? 1);
  const setup = spawnSync(php, ["composer-setup.php", "--quiet"], { cwd: generated, stdio: "inherit" });
  if (setup.status !== 0) process.exit(setup.status ?? 1);
}

process.exit(run(php, [phar, "install", "--no-interaction"]));
