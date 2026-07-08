/**
 * Resolve PHP executable: PHP env → PATH → common WinGet install path.
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function tryPhp(path) {
  if (!path || !existsSync(path)) return null;
  const r = spawnSync(path, ["--version"], { encoding: "utf8" });
  return r.status === 0 ? path : null;
}

function fromPath() {
  const r = spawnSync("php", ["--version"], { encoding: "utf8", shell: true });
  return r.status === 0 ? "php" : null;
}

function wingetPhp() {
  const base = join(
    homedir(),
    "AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe"
  );
  return tryPhp(join(base, process.platform === "win32" ? "php.exe" : "php"));
}

export function resolvePhp() {
  if (process.env.PHP) {
    const explicit = tryPhp(process.env.PHP);
    if (explicit) return explicit;
  }
  return fromPath() ?? wingetPhp();
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const php = resolvePhp();
  if (!php) {
    console.error("php not found — install PHP 8.1+ or set PHP=/path/to/php");
    process.exit(1);
  }
  console.log(php);
}
