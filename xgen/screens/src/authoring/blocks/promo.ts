// Promo and support organisms: announcement bar, cookie banner, newsletter form, contact form, support channels.
import { and, cn, gt, len, cond, each, eq, ref, text, undef, use, when, organism } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame, wide } from "../components/frames";
import { empty, id, orEmpty, title, tone, tsOf, toneLite } from "../props";
import { checkRow, fid, inputField, kids, textField } from "../forms";
import { menuEntry } from "../components/nav";

const O = "organism.";

const announcementBar = spec(`${O}announcement-bar`, "AnnouncementBar", "A thin strip above the page: an icon, one sentence, a link and an optional close button. Axes: tone (default, muted), layout (center, split), dismiss (show, hide).", {
  props: [
    { name: "label", type: "string", required: true, docs: "accessible name of the strip" },
    { name: "text", type: "string", required: true },
    { name: "cta", type: "string", docs: "text of the link" },
    { name: "ctaHref", type: "string" },
    { name: "icon", type: "string", default: "megaphone", docs: "Lucide name" },
    { name: "dismissLabel", type: "string", required: true, docs: "accessible name of the close button" },
    { name: "tone", type: tone, default: "default" },
    { name: "layout", type: tsOf("center", "split"), default: "center" },
    { name: "dismiss", type: tsOf("show", "hide"), default: "hide" },
    { name: "badgeLabel", type: "string", docs: "the tag before the sentence, e.g. New" },
    { name: "badge", type: tsOf("none", "show"), default: "none" },
    { name: "position", type: tsOf("top", "bottom"), default: "top", docs: "bottom: stays at the bottom edge of the page while it scrolls" },
  ],
  view: [
    use("Block", { props: { Tag: "aside", Class: cn("w-full", cond(eq(ref("position"), "bottom"), "sticky bottom-0 z-40 border-t border-border", ""), cond(eq(ref("tone"), "muted"), "bg-muted text-foreground", "bg-primary text-primary-foreground")) }, attrs: { "aria-label": ref("label"), "data-testid": "announcement", "data-layout": ref("layout") } },
      use("Container", { props: { Class: cn(wide, "flex items-center gap-4 py-2", cond(eq(ref("layout"), "split"), "justify-between", "justify-center")) }, attrs: { "data-slot": "container" } },
        use("Group", { props: { Gap: "4", Align: "center", Class: cn("min-w-0 flex-wrap", cond(and(eq(ref("layout"), "center"), eq(ref("dismiss"), "show")), "ml-auto", "")) } },
          use("LucideIcon", { props: { Name: ref("icon"), Size: 16 } }),
          when(eq(ref("badge"), "show"), [use("Inline", { props: { Class: "rounded px-2 py-0 text-xs font-semibold inset-ring inset-ring-current" }, attrs: { "data-testid": "announcement-badge" } }, text(ref("badgeLabel")))]),
          use("Text", { props: { Size: "sm" } }, text(ref("text"))),
          when(ref("cta"), [use("LinkPlain", { props: { Href: ref("ctaHref"), Class: "inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" }, attrs: { "data-testid": "announcement-cta" } },
            text(ref("cta")), use("LucideIcon", { props: { Name: "arrow-right", Size: 16 } }))])),
        when(eq(ref("dismiss"), "show"), [use("Button", { props: { Variant: "ghost", Size: "sm", Class: "ml-auto shrink-0 text-current", Type: "button" }, attrs: { "aria-label": ref("dismissLabel"), "data-testid": "dismiss" } },
          use("LucideIcon", { props: { Name: "x", Size: 16 } }))]))),
  ],
});

const cookieBanner = spec(`${O}cookie-banner`, "CookieBanner", "A consent notice: an icon, a heading, one paragraph and the buttons accept, decline and (optionally) settings. Axes: layout (bar, card), actions (two, three), tone (default, muted).", {
  props: [
    id, title,
    { name: "text", type: "string", required: true },
    { name: "accept", type: "string", required: true },
    { name: "decline", type: "string", required: true },
    { name: "settings", type: "string", docs: "text of the third button, shown when `actions` is three" },
    { name: "layout", type: tsOf("bar", "card"), default: "bar" },
    { name: "actions", type: tsOf("two", "three"), default: "two" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [
    use("Block", { props: { Tag: "section" }, attrs: { "aria-labelledby": fid("title"), "data-testid": "cookie", "data-layout": ref("layout") } },
      use("Container", { props: { Class: cn(wide, "py-4") }, attrs: { "data-slot": "container" } },
        use("Box", { props: { Class: cn("flex flex-col gap-4 rounded p-6 inset-ring inset-ring-border", cond(eq(ref("tone"), "muted"), "bg-muted", "bg-card"), cond(eq(ref("layout"), "bar"), "md:flex-row md:items-center md:justify-between", "mx-auto w-full max-w-md")) } },
          use("Group", { props: { Gap: "4", Align: "start", Class: "min-w-0" } },
            use("LucideIcon", { props: { Name: "cookie", Size: 24 } }),
            use("Stack", { props: { Gap: "2" } },
              use("Title", { props: { As: 2, Size: "base", Weight: "bold" }, attrs: { id: fid("title") } }, text(ref("title"))),
              use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("text"))))),
          use("Group", { props: { Gap: "2", Class: "shrink-0 flex-wrap" } },
            when(and(eq(ref("actions"), "three"), ref("settings")), [use("Button", { props: { Variant: "ghost", Size: "sm", Type: "button" }, attrs: { "data-testid": "cookie-settings" } }, text(ref("settings")))]),
            use("Button", { props: { Variant: "outline", Size: "sm", Type: "button" }, attrs: { "data-testid": "cookie-decline" } }, text(ref("decline"))),
            use("Button", { props: { Variant: "default", Size: "sm", Type: "button" }, attrs: { "data-testid": "cookie-accept" } }, text(ref("accept"))))))),
  ],
});

const newsletterForm = spec(`${O}newsletter-form`, "NewsletterForm", "An email sign-up: heading, one sentence, an email field and a button, with an optional consent line and picture. Axes: layout (inline, stacked, split), terms (show, hide), tone (default, muted), align (start, center).", {
  props: [
    id, title,
    { name: "text", type: "string", required: true },
    { name: "label", type: "string", required: true, docs: "accessible name of the email field" },
    { name: "submit", type: "string", required: true },
    { name: "consent", type: "string", docs: "the consent line, shown when `terms` is show" },
    { name: "layout", type: tsOf("inline", "stacked", "split"), default: "inline" },
    { name: "terms", type: tsOf("show", "hide"), default: "hide" },
    { name: "tone", type: tone, default: "default" },
    { name: "align", type: tsOf("start", "center"), default: "center" },
  ],
  view: [frame(
    { id: ref("id"), title: ref("title"), lead: ref("text"), tone: ref("tone"), align: ref("align"), layout: cond(eq(ref("layout"), "split"), "split", "stack"), hasMedia: eq(ref("layout"), "split") },
    [use("Form", { props: { Method: "dialog", Class: cn("w-full max-w-md", cond(eq(ref("align"), "center"), "mx-auto", "")) }, attrs: { "data-testid": "newsletter-form" } },
      use("Label", { props: { HTMLFor: fid("email"), Class: "sr-only" } }, text(ref("label"))),
      use("Group", { props: { Gap: "2", Align: "start", Class: cn("w-full", cond(eq(ref("layout"), "stacked"), "flex-col items-stretch", "flex-wrap")) } },
        use("Input", { props: { Type: "email", Name: "email", Class: "min-w-0 flex-1" }, attrs: { id: fid("email"), "data-testid": "field" } }),
        use("Button", { props: { Variant: "default", Size: "default", Type: "submit" }, attrs: { "data-testid": "submit" } }, text(ref("submit")))),
      when(and(eq(ref("terms"), "show"), ref("consent")), [use("Text", { props: { Size: "xs", Class: "text-muted-foreground" }, attrs: { "data-testid": "consent" } }, text(ref("consent")))]))],
    [organism("MediaFrame", { alt: ref("title"), ratio: "4/3" })])],
});

const contactForm = spec(`${O}contact-form`, "ContactForm", "A contact section: a form (name, email, subject, message, consent) and, in the split layout, the ways to reach us beside it. Axes: layout (single, split), fields (short: email and message, full), terms (show, hide), tone (default, muted).", {
  records: { ContactLabels: fields(["name", "string"], ["email", "string"], ["subject", "string"], ["message", "string"], ["consent", "string"], ["submit", "string"]) },
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }],
  props: [
    id, title,
    { name: "text", type: "string", required: true },
    { name: "labels", type: { record: "ContactLabels" }, required: true },
    { name: "details", type: ts("Feature[]"), required: true, docs: "the ways to reach us, shown beside the form in the split layout" },
    { name: "layout", type: tsOf("single", "split"), default: "single" },
    { name: "fields", type: tsOf("short", "full"), default: "full" },
    { name: "terms", type: tsOf("show", "hide"), default: "hide" },
    { name: "level", type: ts("1 | 2"), default: 2 },
    { name: "page", type: tsOf("section", "full"), default: "section", docs: "full: a page of its own, a narrow form in the middle with a roomy heading" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), lead: ref("text"), level: ref("level"), tone: ref("tone"), density: cond(eq(ref("page"), "full"), "roomy", "default"), align: cond(eq(ref("page"), "full"), "center", "start"), measure: cond(eq(ref("layout"), "single"), "xl", "default") }, [
    use("Grid", { props: { Cols: cond(eq(ref("layout"), "split"), "1-2", "1"), Class: "items-start gap-8" } },
      use("Form", { props: { Method: "dialog", Class: "w-full gap-4" }, attrs: { "data-testid": "contact-form" } },
        when(eq(ref("fields"), "full"), [inputField("name", "text", ref("labels.name"), "name")]),
        inputField("email", "email", ref("labels.email"), "email"),
        when(eq(ref("fields"), "full"), [inputField("subject", "text", ref("labels.subject"))]),
        textField("message", ref("labels.message")),
        when(eq(ref("terms"), "show"), [checkRow("consent", ref("labels.consent"))]),
        use("Button", { props: { Variant: "default", Size: "default", Type: "submit", Class: "w-fit" }, attrs: { "data-testid": "submit" } }, text(ref("labels.submit")))),
      when(and(eq(ref("layout"), "split"), gt(len(ref("details")), 0)), [use("Stack", { props: { Gap: "4" }, attrs: { "data-testid": "details" } },
        each(ref("details"), "d", ref("d.id"),
          use("Group", { props: { Gap: "4", Align: "start" }, attrs: { "data-testid": "detail" } },
            use("LucideIcon", { props: { Name: ref("d.icon"), Size: 20 } }),
            use("Stack", { props: { Gap: "0" } },
              use("Text", { props: { Size: "base", Weight: "semibold" } }, text(ref("d.title"))),
              use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("d.text")))))))])),
  ])],
});

const supportChannels = spec(`${O}support-channels`, "SupportChannels", "Ways to get help as cards or rows, each with an icon, a title, a sentence and an open link. Axes: layout (grid, list), columns, action (link, none), tone (default, muted).", {
  typeImports: [{ from: "FeatureGrid", names: ["Feature"] }],
  props: [
    id, title,
    { name: "channels", type: ts("Feature[]"), required: true },
    empty,
    { name: "open", type: "string", required: true, docs: "text of the link of each channel" },
    { name: "layout", type: tsOf("grid", "list"), default: "grid" },
    { name: "cols", type: tsOf("1-2", "1-3"), default: "1-3" },
    { name: "action", type: tsOf("link", "none"), default: "link" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), tone: ref("tone") }, [orEmpty("channels", "life-buoy", [
    use("Grid", { props: { Cols: cond(eq(ref("layout"), "list"), "1", ref("cols")), Class: "gap-4" }, attrs: { "data-testid": "items" } },
      each(ref("channels"), "c", ref("c.id"),
        use("Card", { props: { Variant: "default", Class: cn("h-full", cond(eq(ref("layout"), "list"), "flex-row items-center", "")) }, attrs: { "data-testid": "item" } },
          use("CardContent", { props: { Class: cn("flex flex-1 gap-4", cond(eq(ref("layout"), "list"), "items-center", "flex-col")) } },
            use("LucideIcon", { props: { Name: ref("c.icon"), Size: 24 } }),
            use("Stack", { props: { Gap: "2", Class: "flex-1" } },
              use("Title", { props: { As: 3, Size: "base", Weight: "bold" } }, text(ref("c.title"))),
              use("Text", { props: { Size: "sm", Class: "text-muted-foreground" } }, text(ref("c.text")))),
            when(eq(ref("action"), "link"), [menuEntry(ref("c.href"), { cls: "font-semibold", testid: "open" }, text(ref("open")))]))))),])
  ])],
});

export const promoOrganisms: OrganismSpec[] = [announcementBar, cookieBanner, newsletterForm, contactForm, supportChannels];
