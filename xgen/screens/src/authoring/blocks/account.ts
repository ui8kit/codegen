// Account organisms: sign-in, sign-up and reset cards, the profile form.
import { and, cn, cond, eq, ne, ref, text, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { tsOf, toneLite } from "../props";
import { fid, inputField, kids, switchRow, textField } from "../forms";
import { authForm } from "../components/auth";
import { panelSection, wide } from "../components/frames";

const O = "organism.";
const id = { name: "id", type: "string" as const, required: true };

const socialBlock = (pos: "first" | "last") => when(and(pos === "first" ? eq(ref("social"), "first") : ne(ref("social"), "first"), ne(ref("social"), "none"), ne(ref("mode"), "reset"), ne(ref("mode"), "magic")), [use("Stack", { props: { Gap: "4" }, attrs: { "data-testid": "social" } },
        use("Group", { props: { Gap: "4", Align: "center" } },
          use("Separator", { props: { Class: "flex-1" } }),
          use("Text", { props: { Size: "xs", Class: "text-muted-foreground" } }, text(ref("labels.divider"))),
          use("Separator", { props: { Class: "flex-1" } })),
        use("Button", { props: { Variant: "outline", Size: "default", Type: "button", Class: "w-full" } }, use("LucideIcon", { props: { Name: "key-round", Size: 16 } }), text(ref("labels.passkey"))),
        use("Button", { props: { Variant: "outline", Size: "default", Type: "button", Class: "w-full" } }, use("LucideIcon", { props: { Name: "mail", Size: 16 } }), text(ref("labels.magic"))))]);

const authCard = spec(`${O}auth-card`, "AuthCard", "A sign-in, sign-up or password reset card: heading, one sentence, the fields of the mode, a submit button, optional alternative sign-in buttons and a link to the other mode. Axes: mode (signin, signup, reset), layout (card, plain), social (none, show).", {
  records: { AuthLabels: fields(["name", "string"], ["email", "string"], ["password", "string"], ["remember", "string"], ["forgot", "string"], ["terms", "string"], ["divider", "string"], ["passkey", "string"], ["magic", "string"]) },
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "text", type: "string", required: true },
    { name: "submit", type: "string", required: true },
    { name: "switchText", type: "string", required: true, docs: "the question before the link to the other mode" },
    { name: "switchLink", type: "string", required: true },
    { name: "switchHref", type: "string" },
    { name: "labels", type: { record: "AuthLabels" }, required: true },
    { name: "mode", type: tsOf("signin", "signup", "reset", "magic"), default: "signin" },
    { name: "layout", type: tsOf("card", "plain"), default: "card" },
    { name: "social", type: tsOf("none", "show", "first"), default: "none", docs: "first: the other sign-in buttons come before the fields" },
    { name: "level", type: ts("1 | 2"), default: 2 },
  ],
  view: [
    use("Block", { props: { Tag: "section", Class: cn("flex w-full flex-col gap-6", cond(eq(ref("layout"), "card"), "rounded bg-card p-6 inset-ring inset-ring-border", "")) }, attrs: { "aria-labelledby": fid("title"), "data-testid": "auth-card", "data-mode": ref("mode") } },
      use("Stack", { props: { Gap: "2" } },
        use("Title", { props: { As: ref("level"), Size: "2xl", Weight: "bold" }, attrs: { id: fid("title") } }, text(ref("title"))),
        use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("text")))),
      socialBlock("first"),
      organism("AuthForm", { id: ref("id"), mode: ref("mode"), labels: ref("labels"), submit: ref("submit") }),
      socialBlock("last"),
      use("Text", { props: { Size: "sm", Class: "text-center text-muted-foreground" } }, text(ref("switchText")), text(" "),
        use("Link", { props: { Href: ref("switchHref"), Variant: "default" }, attrs: { "data-testid": "switch" } }, text(ref("switchLink"))))),
  ],
});

const profileForm = spec(`${O}profile-form`, "ProfileForm", "An account settings form: a picture with a change button, name, email, bio and two notification switches, with save and cancel. Axes: layout (stacked, split), avatar (show, hide), prefs (show, hide), tone (default, muted).", {
  records: { ProfileLabels: fields(["picture", "string"], ["change", "string"], ["name", "string"], ["email", "string"], ["bio", "string"], ["prefs", "string"], ["updates", "string"], ["alerts", "string"], ["save", "string"], ["cancel", "string"]) },
  props: [
    id,
    { name: "title", type: "string", required: true },
    { name: "text", type: "string", required: true },
    { name: "labels", type: { record: "ProfileLabels" }, required: true },
    { name: "layout", type: tsOf("stacked", "split"), default: "stacked" },
    { name: "avatar", type: tsOf("show", "hide"), default: "show" },
    { name: "prefs", type: tsOf("show", "hide"), default: "show" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [
    panelSection(use("Container", { props: { Class: `${wide} py-8` }, attrs: { "data-slot": "container" } },
      organism("Panel", { title: ref("title"), description: ref("text"), id: ref("id"), className: cn(cond(eq(ref("tone"), "muted"), "bg-muted", "")) }, kids(
        use("Form", { props: { Method: "dialog", Class: "gap-6" }, attrs: { "data-testid": "profile-form" } },
          use("Grid", { props: { Cols: cond(eq(ref("layout"), "split"), "1-2", "1"), Class: "items-start gap-8" } },
            use("Stack", { props: { Gap: "4", Align: "stretch" } },
              when(eq(ref("avatar"), "show"), [use("Group", { props: { Gap: "4", Align: "center" }, attrs: { "data-testid": "avatar" } },
                organism("MediaFrame", { alt: ref("labels.picture"), ratio: "1/1", className: "size-16 shrink-0 rounded-full" }),
                use("Button", { props: { Variant: "outline", Size: "sm", Type: "button" } }, text(ref("labels.change"))))]),
              inputField("name", "text", ref("labels.name"), "name"),
              inputField("email", "email", ref("labels.email"), "email"),
              textField("bio", ref("labels.bio"))),
            when(eq(ref("prefs"), "show"), [use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { "data-testid": "prefs" } },
              use("Title", { props: { As: 3, Size: "base", Weight: "bold" } }, text(ref("labels.prefs"))),
              switchRow("updates", ref("labels.updates")),
              switchRow("alerts", ref("labels.alerts")))])),
          use("Group", { props: { Gap: "2", Class: "flex-wrap" } },
            use("Button", { props: { Variant: "default", Size: "default", Type: "submit" }, attrs: { "data-testid": "submit" } }, text(ref("labels.save"))),
            use("Button", { props: { Variant: "outline", Size: "default", Type: "button" } }, text(ref("labels.cancel"))))))))),
  ],
});

export const accountOrganisms: OrganismSpec[] = [authForm, authCard, profileForm];
