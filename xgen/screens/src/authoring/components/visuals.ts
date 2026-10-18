// Visual patterns that stand in for product pictures: a terminal window with static lines (the typing is a port contract, see contracts.ts).
import { cn, cond, each, eq, ref, text, use, when } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";

const P = "pattern.";

const codeWindow = spec(`${P}code-window`, "CodeWindow", "A terminal or code window: a title bar with three round marks, then the lines. A `command` line starts with the prompt, an `output` line is muted. Static: the typing animation belongs to the port (TypingText contract).", {
  records: { CodeLine: fields(["id", "string"], ["text", "string"], ["kind", "string"]) },
  props: [
    { name: "title", type: "string", required: true, docs: "name of the window, also its accessible name" },
    { name: "prompt", type: "string", required: true, docs: "the mark before a command line" },
    { name: "lines", type: ts("CodeLine[]"), required: true },
  ],
  className: true,
  view: [
    use("Box", { props: { Class: cn("w-full overflow-hidden rounded bg-card text-left inset-ring inset-ring-border", ref("className")) }, attrs: { role: "group", "aria-label": ref("title"), "data-slot": "code-window" } },
      use("Box", { props: { Class: "flex items-center border-b border-border px-4 py-2" } },
        use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(ref("title")))),
      use("List", { props: { Class: "m-0 flex list-none flex-col gap-2 p-4 font-mono text-sm" } },
        each(ref("lines"), "line", ref("line.id"),
          use("ListItem", { props: { Class: cn("flex gap-2", cond(eq(ref("line.kind"), "command"), "text-foreground", "text-muted-foreground")) }, attrs: { "data-kind": ref("line.kind") } },
            when(eq(ref("line.kind"), "command"), [use("Inline", { props: { Class: "select-none text-muted-foreground" } }, text(ref("prompt")))]),
            use("Inline", {}, text(ref("line.text"))))))),
  ],
});

export const visualPatterns: OrganismSpec[] = [codeWindow];
