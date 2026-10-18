// Solid (TSX) adapter of the `rules` group: the React adapter plus Solid control flow. `<Show>`, `<Switch>`/`<Match>` are choices,
// `<For>`/`<Index>` loops, `<Dynamic>` a dynamic tag, `{local.children}` a render of the children (only when imported from solid-js).
import { jsxToIr } from "./react";
import type { IrFile } from "./ir";

export const solidToIr = (src: string): IrFile => jsxToIr(src, "solid");
