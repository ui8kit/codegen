/**
 * Brick registry — every primitive definition, in facade order.
 */

import type { BrickDef } from "../src/domain/model";

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

export const bricks: BrickDef[] = [
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
