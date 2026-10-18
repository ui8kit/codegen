// The fields of AuthCard (AuthForm): name, email and password by mode, remember me and forgot, the terms, the submit button.
import { and, cond, eq, ne, ref, text, use, when } from "../../build";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { checkRow, inputField } from "../forms";

const P = "pattern.";

export const authForm = spec(`${P}auth-form`, "AuthForm", "The form of AuthCard: the fields of the mode (sign-in, sign-up, reset, magic link), remember me and the forgot link, the terms, the submit button.", {
  typeImports: [{ from: "AuthCard", names: ["AuthLabels"] }],
  props: [
    { name: "id", type: "string", required: true, docs: "the id of the card: field ids are <id>-email, <id>-password, ..." },
    { name: "mode", type: tsOf("signin", "signup", "reset", "magic"), default: "signin" },
    { name: "labels", type: ts("AuthLabels"), required: true },
    { name: "submit", type: "string", required: true, docs: "text of the submit button" },
  ],
  view: [
    use("Form", { props: { Method: "dialog", Class: "gap-4" }, attrs: { "data-testid": "auth-form" } },
      when(eq(ref("mode"), "signup"), [inputField("name", "text", ref("labels.name"), "name")]),
      inputField("email", "email", ref("labels.email"), "email"),
      when(and(ne(ref("mode"), "reset"), ne(ref("mode"), "magic")), [inputField("password", "password", ref("labels.password"), cond(eq(ref("mode"), "signup"), "new-password", "current-password"))]),
      when(eq(ref("mode"), "signin"), [use("Group", { props: { Justify: "between", Align: "center", Class: "flex-wrap gap-2" } },
        checkRow("remember", ref("labels.remember")),
        use("Button", { props: { Variant: "link", Size: "sm", Class: "px-0" } }, text(ref("labels.forgot"))))]),
      when(eq(ref("mode"), "signup"), [checkRow("terms", ref("labels.terms"))]),
      use("Button", { props: { Variant: "default", Size: "default", Type: "submit", Class: "w-full" }, attrs: { "data-testid": "submit" } }, text(ref("submit")))),
  ],
});
