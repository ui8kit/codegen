// A number with minus and plus buttons around it (NumberField): static markup only; the page wires the buttons.
import { ref, use } from "../../build";
import { spec } from "../kit";

const step = (icon: string, label: string, testid: string) =>
  use("Button", { props: { Variant: "ghost", Size: "sm", Layout: "icon", Type: "button", AriaLabel: ref(label) }, attrs: { "data-testid": testid } }, use("LucideIcon", { props: { Name: icon, Size: 16 } }));

/** a narrow number field between a minus and a plus button, one control: 4px inside the ring, 32px parts in a 40px box */
export const numberField = spec("pattern.number-field", "NumberField", "A narrow number field between a minus and a plus ghost icon button, drawn as one control (4px inside its ring). Static markup: the buttons carry no logic; the page wires them.", {
  props: [
    { name: "value", type: "string", default: "" },
    { name: "name", type: "string", default: "" },
    { name: "min", type: "string", default: "" },
    { name: "label", type: "string", required: true, docs: "accessible name of the number" },
    { name: "decrease", type: "string", required: true, docs: "accessible name of the minus button" },
    { name: "increase", type: "string", required: true, docs: "accessible name of the plus button" },
  ],
  view: [
    use("Box", { props: { Class: "inline-flex h-10 items-center gap-1 rounded bg-background p-1 inset-ring inset-ring-input" }, attrs: { "data-slot": "number-field" } },
      step("minus", "decrease", "decrease"),
      use("Input", { props: { Type: "number", Name: ref("name"), Value: ref("value"), Min: ref("min"), AriaLabel: ref("label"), Size: "sm", Class: "number-bare w-8 bg-transparent px-0 text-center inset-ring-0" } }),
      step("plus", "increase", "increase")),
  ],
});
