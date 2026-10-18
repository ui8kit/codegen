#!/usr/bin/env bun
// Tool: writes the head texts of the theme-app pages (written next to the pages in xgen/screens/src/authoring/screens/themes.ts)
// into the dictionary xgen/content/ui/en.json under `pages`,. Run it after you change a page.
// usage: bun screens/tools/author-theme-texts.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { xgenPaths } from "@ui8kit/xgen-schema";
import { themeTexts } from "../src/index";

const file = xgenPaths(join(import.meta.dir, "../..")).dictionary;
const dict = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
const pages = { ...themeTexts() };
dict["pages"] = pages;
writeFileSync(file, JSON.stringify(dict, null, 2) + "\n");
console.log(`${Object.keys(pages).length} apps, ${Object.values(pages).reduce((n, p) => n + Object.keys(p).length, 0)} pages with texts`);
