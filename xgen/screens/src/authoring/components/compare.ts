// One cell value of ComparisonTable (CompareMark): yes shows a check, no a dash (both with a hidden word), anything else is the text.
import { and, eq, ne, ref, text, use, when } from "../../build";
import { spec } from "../kit";

const P = "pattern.";

const mark = (value: ReturnType<typeof ref>) => [
  when(eq(value, "yes"), [use("Inline", { props: { Class: "inline-flex items-center gap-2" }, attrs: { "data-mark": "yes" } },
    use("LucideIcon", { props: { Name: "check", Size: 16, Class: "text-foreground" } }),
    use("Inline", { props: { Class: "sr-only" } }, text(ref("yes"))))]),
  when(eq(value, "no"), [use("Inline", { props: { Class: "inline-flex items-center gap-2 text-muted-foreground" }, attrs: { "data-mark": "no" } },
    use("LucideIcon", { props: { Name: "minus", Size: 16 } }),
    use("Inline", { props: { Class: "sr-only" } }, text(ref("no"))))]),
  when(and(ne(value, "yes"), ne(value, "no")), [use("Inline", {}, text(value))]),
];

export const compareMark = spec(`${P}compare-mark`, "CompareMark", "One cell value of ComparisonTable: yes shows a check, no a dash (both with the hidden word for screen readers), any other value is shown as text.", {
  props: [
    { name: "value", type: "string", required: true, docs: "yes, no or a short text" },
    { name: "yes", type: "string", required: true, docs: "the hidden word for yes" },
    { name: "no", type: "string", required: true, docs: "the hidden word for no" },
  ],
  view: mark(ref("value")),
});
