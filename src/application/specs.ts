/**
 * JSON spec export — a machine-readable description of every primitive,
 * derived from the brick definitions (`bricks/<b>/<b>.def.ts`). Intended for
 * registries and tooling; contains no runtime code and no styling.
 */

import { fileStem, walkNodes, type BrickDef, type PartDef } from "../domain/model";
import { htmlPropName, reactPropName } from "../domain/naming";
import { TAG_GROUPS } from "../domain/tags";
import { kebab } from "../emitters/webcomponent";

export const SPECS_VERSION = 1;
/** Spec contract version; tracks the @ui8kit/codegen package major (3.x). */
export const SPEC_VERSION = "3.3.0";

function rootTags(part: PartDef): string[] {
  const out = new Set<string>();
  const visit = (n: PartDef["render"]) => {
    if (n.kind === "element") {
      if (n.tag.kind === "static") out.add(n.tag.tag);
      else if (n.tag.kind === "resolved") TAG_GROUPS[n.tag.group].forEach((t) => out.add(t));
      else n.tag.tags.forEach((t) => out.add(t));
    } else if (n.kind === "when") {
      [...n.then, ...(n.else ?? [])].forEach(visit);
    }
  };
  visit(part.render);
  return [...out];
}

function staticAttrs(part: PartDef): Record<string, string> {
  const out: Record<string, string> = {};
  walkNodes(part.render, (n) => {
    if (n.kind !== "element") return;
    for (const a of n.attrs) if (a.kind === "static") out[a.name] = a.value;
  });
  return out;
}

export function buildSpecs(bricks: BrickDef[]) {
  return {
    $schema: "ui8kit-codegen/specs",
    version: SPECS_VERSION,
    specVersion: SPEC_VERSION,
    tagGroups: TAG_GROUPS,
    primitives: bricks.map((brick) => ({
      id: brick.id,
      dir: brick.dir,
      file: fileStem(brick),
      docs: brick.docs,
      recordTypes: brick.recordTypes ?? [],
      parts: brick.parts.map((part) => {
        const recipe = part.recipeId ? brick.recipes[part.recipeId] : undefined;
        return {
          name: part.name,
          docs: part.docs,
          elements: rootTags(part),
          customElement: `ui8-${kebab(part.name)}`,
          staticAttrs: staticAttrs(part),
          acceptsClass: part.props.some((p) => p.name === "Class"),
          acceptsChildren: part.props.some((p) => p.type === "children"),
          acceptsAttrs: part.props.some((p) => p.type === "attrs"),
          props: part.props
            .filter((p) => p.type !== "attrs" && p.type !== "children" && p.name !== "Class")
            .map((p) => ({
              name: p.name,
              html: htmlPropName(p),
              react: reactPropName(p),
              type: p.type,
              required: p.required === true,
              passthrough: p.passthrough === true,
              ...(p.enumValues ? { enum: p.enumValues } : {}),
              ...(p.itemsOf ? { itemsOf: p.itemsOf } : {}),
              ...(p.cva && recipe
                ? {
                    variantKey: p.cvaKey ?? p.name.toLowerCase(),
                    enum: Object.keys(recipe.byKey[p.cvaKey ?? p.name.toLowerCase()] ?? {}),
                    default: recipe.defaults[p.cvaKey ?? p.name.toLowerCase()],
                  }
                : {}),
              ...(p.default !== undefined ? { default: p.default } : {}),
              ...(p.docs ? { docs: p.docs } : {}),
            })),
        };
      }),
    })),
  };
}
