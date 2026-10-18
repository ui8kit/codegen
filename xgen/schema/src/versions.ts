// Versions of the spec files. Every JSON spec carries `specVersion`; the schemas describe the current one. When a shape changes, raise SPEC_VERSION,
// add the step from the old version to MIGRATIONS and describe it in xgen/docs/migrations.md; `xgen check` names every file that is not on the current version.

export const SPEC_VERSION = 1;

/** MIGRATIONS[n] turns a spec of version n into version n + 1 (none yet: version 1 is the first) */
export const MIGRATIONS: Record<number, (spec: Record<string, unknown>) => Record<string, unknown>> = {};

/** why a spec is not on the current version, or undefined when it is */
export function versionProblem(spec: { specVersion?: unknown }): string | undefined {
  const v = spec.specVersion;
  if (typeof v !== "number") return "has no specVersion";
  if (v === SPEC_VERSION) return undefined;
  if (v > SPEC_VERSION) return `specVersion ${v} is newer than this xgen understands (${SPEC_VERSION}); update xgen`;
  return `specVersion ${v} is old (current ${SPEC_VERSION}); migrate it with migrate() from @ui8kit/xgen-schema, see xgen/docs/migrations.md`;
}

/** a spec brought to the current version, step by step */
export function migrate(spec: Record<string, unknown>): Record<string, unknown> {
  let out = spec;
  for (let v = Number(spec["specVersion"]); v < SPEC_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`no migration from specVersion ${v} to ${v + 1}`);
    out = { ...step(out), specVersion: v + 1 };
  }
  return out;
}
