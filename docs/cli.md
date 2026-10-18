# CLI and scripts

The `xgen` command (`xgen/cli/src/cli.ts`, bin of `@ui8kit/xgen`); run it through the root scripts:

| Script | Command | What |
|---|---|---|
| `bun run build` | `xgen build` | write every generated target from specs, fixtures and content (and the builder JSON) |
| `bun run check` | `xgen check` | every gate (see [architecture.md](architecture.md)); exit 1 on any problem |
| `bun xgen/cli/src/cli.ts list` | `xgen list` | counts, targets, hand-written files per app |
| `bun run e2e` | `xgen e2e` | every screen in every host: scenario, light/dark screenshots, DOM pair test, html-validate (run `bun run build:hosts` first) |
| `bun run shot <screen>` | `xgen shot` | one full-page screenshot |
| `bun run visual` | `xgen visual` | pixel gate over every state of every host |
| `bun run verify` | | `check` + `codex:validate` + `typecheck` + `test` (CI) |
| `bun run typecheck` | | `tsc` on xgen and svelte-check / tsc / vue-tsc on the TS packages and hosts |
| `bun run test` | | `bun test xgen` |
| `bun run codex:manifest` / `codex:validate` / `codex:blocks` | | write the Codex manifest, validate every fixture with `@ui8kit/contract`, write `blocks.json` |
| `bun run rules` / `rules:baseline` | | composition rules 01/02/03/06; rewrite `rules/zones.json` and baselines after an accepted change |
| `bun run lint:px` | | ui8px gate over the class sets (8 px grid) |
| `bun run audit:push` | | nothing private, no binaries or secrets in the commits of the branch |
| `bun run hooks:install` | | pre-push hook: check + audit |

Flags: `--root <workspace>` on every `xgen` command; `UI8KIT_REQUIRE_ALL_RUNTIMES=1` fails a skipped template runtime.

The end-user CLI that installs items into an app is a different tool: [`ui8kit`](https://github.com/ui8kit/cli) on npm
(`npx ui8kit init`, `npx ui8kit add <name>`), reading the registry described in [registry.md](registry.md).
