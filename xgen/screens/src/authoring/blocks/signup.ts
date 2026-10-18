// Sign-in pages and the sign-up wizard. AuthLayout puts an AuthCard in a page: beside a picture, on a tinted background, or alone.
import { cn, cond, eachAt, eq, ge, len, lt, ref, str, sub, text, tpl, use, when, add, undef, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, groupFields, rec, requireFields, spec, ts } from "../kit";
import { wide } from "../components/frames";
import { id, ifAny, tsOf } from "../props";
import { inputField } from "../forms";
import { heading, muted } from "../ux";

const O = "organism.";

const authLayout = spec(`${O}auth-layout`, "AuthLayout", "A whole sign-in page: the AuthCard placed in the page. Axes: layout (split: a picture panel beside the card, centered: the card on a tinted page, minimal: the card alone in a narrow column), side (end, start: the side of the picture), mode, social. The page's heading is the card's title.", {
  records: {
    AuthSwitch: requireFields(groupFields(["text", "string", "the sentence before the link"], ["link", "string", "text of the link"], ["href", "string"]), "text", "link"),
    AuthVisual: requireFields(groupFields(["title", "string", "the line on the picture panel"], ["text", "string"]), "title", "text"),
  },
  typeImports: [{ from: "AuthCard", names: ["AuthLabels"] }],
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "text", type: "string", required: true },
    { name: "submit", type: "string", required: true },
    { name: "switchTo", type: rec("AuthSwitch"), required: true, docs: "the way to the other mode (sign up instead, sign in instead)" },
    { name: "labels", type: ts("AuthLabels"), required: true },
    { name: "visual", type: rec("AuthVisual"), required: true, docs: "the picture panel of layout split" },
    { name: "level", type: ts("1 | 2"), default: 1 },
    { name: "layout", type: tsOf("split", "centered", "minimal"), default: "split" },
    { name: "side", type: tsOf("end", "start"), default: "end" },
    { name: "mode", type: tsOf("signin", "signup", "reset", "magic"), default: "signin" },
    { name: "social", type: tsOf("none", "show", "first"), default: "none" },
  ],
  view: (() => {
    const card = (plain: boolean) => organism("AuthCard", { id: ref("id"), title: ref("title"), text: ref("text"), submit: ref("submit"), switchText: ref("switchTo.text"), switchLink: ref("switchTo.link"), switchHref: ref("switchTo.href"), labels: ref("labels"), mode: ref("mode"), layout: plain ? "plain" : "card", social: ref("social"), level: ref("level") });
    const visual = use("Stack", { props: { Gap: "4", Align: "stretch", Class: cn("justify-end rounded bg-muted p-8", cond(eq(ref("side"), "start"), "md:order-first", "md:order-last")) }, attrs: { "data-testid": "visual" } },
      organism("MediaFrame", { alt: ref("visual.title"), ratio: "4/3" }), heading(ref("visual.title"), "2xl", 2), muted(ref("visual.text")));
    return [use("Block", { props: { Tag: "div", Class: "w-full" }, attrs: { "data-testid": "auth-layout", "data-layout": ref("layout") } },
      use("Container", { props: { Class: cn(wide, "py-12") }, attrs: { "data-slot": "container" } },
        when(eq(ref("layout"), "split"),
          [use("Grid", { props: { Cols: "1-2", Class: "items-stretch gap-8" } }, use("Box", { props: { Class: "mx-auto flex w-full max-w-sm items-center" } }, card(true)), visual)],
          [when(eq(ref("layout"), "centered"),
            [use("Box", { props: { Class: "mx-auto w-full max-w-md rounded bg-muted p-6" } }, card(false))],
            [use("Box", { props: { Class: "mx-auto w-full max-w-sm" } }, card(true))])])))];
  })(),
});

const WizardStep = fields(["id", "string"], ["title", "string"], ["text", "string"], ["icon", "string"], ["fieldA", "string"], ["fieldB", "string"]);
const WizardLabels = fields(["stepOf", "string"], ["steps", "string"], ["back", "string"], ["next", "string"], ["finish", "string"]);
const signupWizard = spec(`${O}signup-wizard`, "SignupWizard", "A sign-up in steps: the progress, the fields of the current step, back and next. `current` is the step shown, counted from 1. Axes: progress (bar, list: every step named), layout (card, plain). Keeping the typed values between steps is the page's job.", {
  records: { WizardStep, WizardLabels },
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "steps", type: ts("WizardStep[]"), required: true },
    { name: "labels", type: { record: "WizardLabels" }, required: true },
    { name: "current", type: "number", default: 1 },
    { name: "level", type: ts("1 | 2"), default: 2 },
    { name: "progress", type: tsOf("bar", "list"), default: "bar" },
    { name: "layout", type: tsOf("card", "plain"), default: "card" },
  ],
  events: [{ name: "go", args: [{ name: "step", type: "number" }], docs: "back or next was pressed" }],
  // emptyMode omit: a wizard with no steps is left out
  view: [ifAny("steps", [
    use("Block", { props: { Tag: "section", Class: cn("mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8", cond(eq(ref("layout"), "card"), "rounded bg-card p-6 inset-ring inset-ring-border", "")) }, attrs: { "aria-labelledby": tpl("{0}-title", ref("id")), "data-testid": "wizard", "data-current": str(ref("current")) } },
      use("Title", { props: { As: ref("level"), Size: "2xl", Weight: "bold" }, attrs: { id: tpl("{0}-title", ref("id")) } }, text(ref("title"))),
      use("Text", { props: { Size: "sm", Class: "text-muted-foreground" }, attrs: { "data-testid": "step-of" } }, text(tpl(ref("labels.stepOf"), ref("current"), len(ref("steps"))))),
      when(eq(ref("progress"), "bar"), [use("Progress", { props: { Value: str(ref("current")), Max: str(len(ref("steps"))) }, attrs: { "aria-label": ref("labels.steps") } })]),
      when(eq(ref("progress"), "list"), [use("List", { props: { Class: "m-0 flex list-none flex-col gap-2 p-0" }, attrs: { "aria-label": ref("labels.steps"), "data-testid": "step-list" } },
        eachAt(ref("steps"), "s", "i", ref("s.id"), use("ListItem", { props: { Class: cn("flex items-center gap-4 text-sm", cond(eq(add(ref("i"), 1), ref("current")), "font-semibold", "text-muted-foreground")) }, attrs: { "aria-current": cond(eq(add(ref("i"), 1), ref("current")), "step", undef()), "data-testid": "step-item" } },
          use("LucideIcon", { props: { Name: cond(lt(add(ref("i"), 1), ref("current")), "circle-check", ref("s.icon")), Size: 16 } }), text(ref("s.title")))))]),
      eachAt(ref("steps"), "s", "i", ref("s.id"), when(eq(add(ref("i"), 1), ref("current")), [use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { "data-testid": "step" } },
        heading(ref("s.title"), "xl", 3), muted(ref("s.text")),
        use("Box", { props: { Class: "grid gap-4" } }, inputField("a", "text", ref("s.fieldA"), undefined, true), inputField("b", "text", ref("s.fieldB"), undefined, true)))])),
      use("Group", { props: { Gap: "2", Justify: "between" } },
        use("Button", { props: { Variant: "outline", Size: "default", Type: "button", Disabled: lt(ref("current"), 2) }, on: { click: { call: "emit.go", args: [sub(ref("current"), 1)] } }, attrs: { "data-testid": "wizard-back" } }, text(ref("labels.back"))),
        use("Button", { props: { Variant: "default", Size: "default", Type: "button" }, on: { click: { call: "emit.go", args: [add(ref("current"), 1)] } }, attrs: { "data-testid": "wizard-next" } }, text(cond(ge(ref("current"), len(ref("steps"))), ref("labels.finish"), ref("labels.next")))))),
  ])],
});

export const signupOrganisms: OrganismSpec[] = [authLayout, signupWizard];
