#!/usr/bin/env bun
// Tool: writes xgen/docs/vibeui-coverage.md from the registry in xgen/screens/src/authoring/gallery/coverage.ts and the block catalog.
// usage: bun screens/tools/author-coverage.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { coverageMarkdown, blocks } from "../src/index";

writeFileSync(join(import.meta.dir, "../../docs/vibeui-coverage.md"), coverageMarkdown(blocks));
console.log("wrote xgen/docs/vibeui-coverage.md");
