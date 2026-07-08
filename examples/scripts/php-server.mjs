/**
 * Start PHP built-in server for Latte/Twig previews.
 * Usage: bun scripts/php-server.mjs <latte|twig> [port]
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePhp } from "./resolve-php.mjs";

const examplesRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2];
const port = process.argv[3] ?? (target === "twig" ? "5177" : "5176");

if (target !== "latte" && target !== "twig") {
  console.error("usage: bun scripts/php-server.mjs <latte|twig> [port]");
  process.exit(1);
}

const php = resolvePhp();
if (!php) {
  console.error("php not found — install PHP 8.1+ or set PHP=/path/to/php");
  process.exit(1);
}

const cwd = join(examplesRoot, target);
const child = spawn(php, ["-S", `127.0.0.1:${port}`, "server.php"], {
  cwd,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => process.exit(code ?? 0));
