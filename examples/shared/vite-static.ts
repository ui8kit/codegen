import path from "path";
import { fileURLToPath } from "url";
import { cpSync, existsSync } from "fs";
import sirv from "sirv";
import type { Connect, Plugin } from "vite";

const examplesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staticRoot = path.join(examplesRoot, "web/static");

export function serveExamplesStatic(): Plugin {
  const attach = (middlewares: Connect.Server) => {
    middlewares.use("/static", sirv(staticRoot, { dev: true, etag: true, single: false }));
  };
  return {
    name: "serve-codegen-examples-static",
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
    closeBundle() {
      const outStatic = path.join(examplesRoot, "dist/static");
      if (existsSync(staticRoot)) {
        cpSync(staticRoot, outStatic, { recursive: true });
      }
    },
  };
}

export const generatedUiRoot = path.resolve(examplesRoot, "../generated/ui");
export const generatedUtilsRoot = path.resolve(examplesRoot, "../generated/utils");
