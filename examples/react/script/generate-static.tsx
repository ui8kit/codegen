/**
 * Static HTML export — renders the React welcome view with
 * renderToStaticMarkup and writes plain HTML pages into examples/html/,
 * one directory per route (index.html, about/index.html) with relative
 * links to the shared static assets. Run with: bun run build:html
 */

import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { WelcomeView } from "../src/Welcome";

const examplesRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outRoot = join(examplesRoot, "html");

interface Route {
  /** Directory under examples/html/ ("" is the site root). */
  path: string;
  title: string;
  runtime: string;
}

const routes: Route[] = [
  { path: "", title: "UI8Kit Codegen · Static HTML", runtime: "Static HTML" },
  { path: "about", title: "UI8Kit Codegen · About", runtime: "Static HTML · About" },
];

/** Depth-aware prefix so nested routes link ../static, the root ./static. */
function relPrefix(routePath: string): string {
  const depth = routePath === "" ? 0 : routePath.split("/").length;
  return depth === 0 ? "./" : "../".repeat(depth);
}

function pageShell(title: string, cssHref: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>${title}</title>
		<link rel="stylesheet" href="${cssHref}">
	</head>
	<body class="bg-background text-foreground antialiased">
${bodyHtml}
	</body>
</html>
`;
}

for (const route of routes) {
  const markup = renderToStaticMarkup(<WelcomeView runtime={route.runtime} />);
  const dir = route.path === "" ? outRoot : join(outRoot, route.path);
  mkdirSync(dir, { recursive: true });
  const html = pageShell(route.title, `${relPrefix(route.path)}static/css/app.css`, markup);
  writeFileSync(join(dir, "index.html"), html);
  console.log(`wrote ${join(dir, "index.html")}`);
}

cpSync(join(examplesRoot, "web", "static"), join(outRoot, "static"), { recursive: true });
console.log(`copied static assets -> ${join(outRoot, "static")}`);
