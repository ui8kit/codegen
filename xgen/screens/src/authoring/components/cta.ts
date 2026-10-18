// The pieces of a call to action: its actions (CtaActions: links or an email field) and the customer
// quote beside it (QuoteProof). CtaBand uses them.
import { cn, cond, eq, ref, text, use, when } from "../../build";
import { rec, spec } from "../kit";
import { actions, actionSet, id } from "../props";
import { muted } from "../ux";
import { emailRow } from "../forms";

const P = "pattern.";
/** the actions of a call to action: one or two links, or an email field with a button */
export const ctaActions = spec(`${P}cta-actions`, "CtaActions", "The actions of a call to action: one or two links (ActionGroup), or an email field with a button (actions form).", {
  records: { ActionSet: actionSet },
  props: [id, { name: "actions", type: rec("ActionSet"), required: true }, { name: "center", type: "boolean", default: false }],
  view: [when(eq(ref("actions.mode"), "form"), [emailRow(ref("actions.emailLabel"), ref("actions.cta"), ref("center"))], [actions(ref("center") as ReturnType<typeof eq>, "actions")])],
});

/** a customer quote under a call to action */
export const quoteProof = spec(`${P}quote-proof`, "QuoteProof", "A customer quote and who said it, as a figure.", {
  props: [{ name: "quote", type: "string" }, { name: "quoteBy", type: "string" }, { name: "center", type: "boolean", default: false }],
  view: [use("Block", { props: { Tag: "figure", Class: cn("flex flex-col gap-2", cond(ref("center"), "items-center text-center", "")) }, attrs: { "data-testid": "proof" } },
    use("Text", { props: { Size: "xl" } }, text(ref("quote"))), muted(ref("quoteBy")))],
});

/** closing banner: a centered muted card with a pill button */
