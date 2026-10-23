/**
 * Brick registry — every primitive definition, in facade order.
 */

import type { BrickDef } from "../src/domain/model";
import { walkNodes } from "../src/domain/model";
import { safeUrl, URL_ATTRS } from "../src/domain/expr";
import { isPassthroughForward } from "../src/domain/passthrough";

import box from "./box/box.def";
import text from "./text/text.def";
import button from "./button/button.def";
import link from "./link/link.def";
import label from "./label/label.def";
import form from "./form/form.def";
import input from "./input/input.def";
import textarea from "./textarea/textarea.def";
import select from "./select/select.def";
import checkbox from "./checkbox/checkbox.def";
import radio from "./radio/radio.def";
import switchBrick from "./switch/switch.def";
import image from "./image/image.def";
import icon from "./icon/icon.def";
import dialog from "./dialog/dialog.def";
import disclosure from "./disclosure/disclosure.def";
import meter from "./meter/meter.def";
import progress from "./progress/progress.def";
import separator from "./separator/separator.def";

const raw: BrickDef[] = [
  box,
  text,
  button,
  link,
  label,
  form,
  input,
  textarea,
  select,
  checkbox,
  radio,
  switchBrick,
  image,
  icon,
  dialog,
  disclosure,
  meter,
  progress,
  separator,
];

/** Security: every URL attribute (href, src, action, ...) goes through safeUrl (javascript:, vbscript:, data: -> omitted).
 * Passthrough forwards stay plain props (nullable contract); the server emitters and the canonical renderer apply the check by attribute name. */
function withSafeUrls(b: BrickDef): BrickDef {
  for (const part of b.parts)
    walkNodes(part.render, (n) => {
      if (n.kind !== "element") return;
      for (const a of n.attrs) if (a.kind === "expr" && URL_ATTRS.includes(a.name) && a.expr.kind !== "safeUrl" && a.expr.kind !== "lit" && !isPassthroughForward(a, part)) a.expr = safeUrl(a.expr);
    });
  return b;
}

export const bricks: BrickDef[] = raw.map(withSafeUrls);
