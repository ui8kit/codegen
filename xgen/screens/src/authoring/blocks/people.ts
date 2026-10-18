// The people of a company: the team in five shapes, the open jobs, a personal about section and the company culture.
import { cn, cond, each, eq, len, ref, str, text, tpl, undef, use, when, organism, where } from "../../build";
import type { OrganismSpec } from "../../ir";
import { fields, spec, ts } from "../kit";
import { frame } from "../components/frames";
import { portrait, tags } from "../components/people-parts";
import { empty, id, ifAny, orEmpty, title, tsOf, toneLite, denseLite } from "../props";
import { heading, muted, strong, surface } from "../ux";
import { menuEntry } from "../components/nav";

const O = "organism.";
const lead = { name: "lead", type: "string" as const, default: "" };
const common = { id: ref("id"), title: ref("title"), lead: ref("lead"), tone: ref("tone"), density: ref("density") };
const teamGrid = spec(`${O}team-grid`, "TeamGrid", "The people of a team: portrait cards, a minimal grid of small portraits, detailed cards with skills, rows beside a picture, or a directory of two columns. Axes: layout (cards, minimal, detailed, list, directory), cols, tone, density.", {
  records: { Member: fields(["id", "string"], ["name", "string"], ["role", "string"], ["dept", "string"], ["location", "string"], ["bio", "string"], ["skills", "string[]"]) },
  props: [
    id, title, lead,
    { name: "members", type: ts("Member[]"), required: true },
    empty,
    { name: "depts", type: ts("Record<string, string>"), required: true, docs: "the name of each department" },
    { name: "layout", type: tsOf("cards", "minimal", "detailed", "list", "directory"), default: "cards" },
    { name: "cols", type: tsOf("1-3", "1-4"), default: "1-4" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ ...common, layout: cond(eq(ref("layout"), "list"), "split", "stack"), hasMedia: eq(ref("layout"), "list"), mediaSide: "start", mediaAlign: "start" }, [orEmpty("members", "users", [
    use("Box", { props: { Class: cond(eq(ref("layout"), "minimal"), "grid grid-cols-2 gap-8 md:grid-cols-4", cond(eq(ref("layout"), "directory"), "grid grid-cols-1 gap-4 md:grid-cols-2", cond(eq(ref("layout"), "list"), "flex flex-col gap-4", cond(eq(ref("cols"), "1-3"), "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4")))) }, attrs: { "data-testid": "items" } },
      each(ref("members"), "m", ref("m.id"),
        when(eq(ref("layout"), "minimal"),
          [use("Stack", { props: { Gap: "2", Align: "center", Class: "text-center" }, attrs: { "data-testid": "item" } }, portrait("m.name", "size-16"), strong(ref("m.name"), "sm"), muted(ref("m.role"), "xs"))],
          [when(eq(ref("layout"), "cards"),
            [use("Stack", { props: { Gap: "4", Class: surface("p-4") }, attrs: { "data-testid": "item" } },
              organism("MediaFrame", { alt: ref("m.name"), ratio: "1/1" }),
              use("Stack", { props: { Gap: "2" } }, use("Stack", { props: { Gap: "0" } }, strong(ref("m.name")), muted(ref("m.role"))), muted(ref("m.bio"))))],
            [organism("MemberRow", { member: ref("m"), depts: ref("depts"), layout: ref("layout") })])])))]),
  ], [organism("MediaFrame", { alt: ref("title"), ratio: "3/4" })])],
});

const jobBoard = spec(`${O}job-board`, "JobBoard", "Open jobs as cards in two columns, grouped by department, or as a table: the title, the department, the place, the type, an optional salary and an apply link. Axes: layout (grid, grouped, table), salary (show, hide), tone.", {
  records: { Job: fields(["id", "string"], ["title", "string"], ["dept", "string"], ["location", "string"], ["type", "string"], ["salary", "string"], ["posted", "string"], ["href", "string", true]), Department: fields(["id", "string"], ["name", "string"]), JobLabels: fields(["apply", "string"], ["caption", "string"], ["role", "string"], ["team", "string"], ["location", "string"], ["type", "string"], ["salary", "string"], ["count", "string"]) },
  props: [
    id, title, lead,
    { name: "jobs", type: ts("Job[]"), required: true },
    { name: "departments", type: ts("Department[]"), required: true },
    { name: "labels", type: { record: "JobLabels" }, required: true },
    { name: "layout", type: tsOf("grid", "grouped", "table"), default: "grid" },
    { name: "salary", type: tsOf("show", "hide"), default: "hide" },
    { name: "tone", type: toneLite, default: "default" },
    empty,
  ],
  view: [frame({ ...common, density: "default", measure: cond(eq(ref("layout"), "grouped"), "3xl", "default") }, [orEmpty("jobs", "briefcase", [
    when(eq(ref("layout"), "grouped"),
      [use("Stack", { props: { Gap: "8", Align: "stretch" }, attrs: { "data-testid": "groups" } },
        each(ref("departments"), "d", ref("d.id"),
          use("Stack", { props: { Gap: "2", Align: "stretch" }, attrs: { "data-testid": "group" } },
            use("Group", { props: { Gap: "4", Align: "baseline", Justify: "between" } }, heading(ref("d.name"), "lg"), muted(tpl(ref("labels.count"), len(where(ref("jobs"), "dept", ref("d.id")))), "xs")),
            use("List", { props: { Tag: "ul", Class: "flex flex-col" } },
              each(where(ref("jobs"), "dept", ref("d.id")), "j", ref("j.id"),
                use("ListItem", { props: { Class: "flex flex-wrap items-center justify-between gap-4 border-b border-border py-4" }, attrs: { "data-testid": "item" } },
                  use("Stack", { props: { Gap: "0" } }, menuEntry(ref("j.href"), { cls: "font-medium" }, text(ref("j.title"))), muted(tpl("{0}, {1}", ref("j.location"), ref("j.type")), "xs")),
                  use("Badge", { props: { Variant: "outline", Size: "default" } }, text(ref("j.type")))))))))],
      [organism("JobCards", { jobs: ref("jobs"), departments: ref("departments"), labels: ref("labels"), layout: ref("layout"), salary: ref("salary") })]),
  ])])],
});

const aboutMe = spec(`${O}about-me`, "AboutMe", "A personal about section beside a portrait: a badge, the heading, a lead, then key facts and a list of specialities, or skill chips and expertise bars, and one or two links. Axes: layout (facts, skills), mediaSide, tone.", {
  typeImports: [{ from: "ProductInfo", names: ["Spec"] }, { from: "ErrorPage", names: ["LinkActions"] }],
  records: { Skill: fields(["id", "string"], ["label", "string"], ["level", "number"]), AboutMeLabels: fields(["level", "string"]) },
  props: [
    id, title, lead,
    { name: "badge", type: "string", default: "" },
    { name: "level", type: ts("1 | 2"), default: 1 },
    { name: "facts", type: ts("Spec[]"), required: true },
    { name: "skills", type: ts("Skill[]"), required: true },
    { name: "labels", type: { record: "AboutMeLabels" }, required: true },
    { name: "actions", type: ts("LinkActions"), required: true },
    { name: "layout", type: tsOf("facts", "skills"), default: "facts" },
    { name: "mediaSide", type: tsOf("start", "end"), default: "start" },
    { name: "tone", type: toneLite, default: "default" },
  ],
  view: [frame({ id: ref("id"), title: ref("title"), lead: ref("lead"), badge: ref("badge"), level: ref("level"), layout: "split", hasMedia: true, mediaSide: ref("mediaSide"), tone: ref("tone"), density: "default" }, [
    when(eq(ref("layout"), "facts"),
      [ifAny("facts", [use("List", { props: { Tag: "ul", Class: "grid grid-cols-1 gap-4 sm:grid-cols-2" }, attrs: { "data-testid": "facts" } },
        each(ref("facts"), "f", ref("f.id"),
          use("ListItem", { props: { Class: surface("flex flex-col gap-0 p-4") }, attrs: { "data-testid": "fact" } }, muted(ref("f.label"), "xs"), strong(ref("f.value"), "sm"))))])],
      [ifAny("skills", [use("Stack", { props: { Gap: "4", Align: "stretch" }, attrs: { "data-testid": "skills" } },
        each(ref("skills"), "s", ref("s.id"),
          use("Stack", { props: { Gap: "2", Align: "stretch" }, attrs: { "data-testid": "skill" } },
            use("Group", { props: { Gap: "4", Justify: "between" } }, strong(ref("s.label"), "sm"), muted(tpl(ref("labels.level"), ref("s.level")), "xs")),
            use("Progress", { props: { Value: str(ref("s.level")), Max: "100" }, attrs: { "aria-label": ref("s.label") } }))))])]),
    organism("ActionGroup", { primary: ref("actions.cta"), primaryHref: ref("actions.href"), secondary: cond(eq(ref("actions.mode"), "two"), ref("actions.secondary"), undef()), secondaryHref: ref("actions.secondaryHref"), align: "start" }),
  ], [organism("MediaFrame", { alt: ref("title"), ratio: "3/4" })])],
});

const aboutCompany = spec(`${O}about-company`, "AboutCompany", "The culture of a company: a strip of three pictures, the heading, a few figures and the values. Axes: layout (split: the pictures beside the text, stacked: the pictures under it), tone, density.", {
  typeImports: [{ from: "StatsBand", names: ["Stat"] }, { from: "FeatureGrid", names: ["Feature"] }],
  props: [
    id, title, lead,
    { name: "stats", type: ts("Stat[]"), required: true },
    { name: "values", type: ts("Feature[]"), required: true },
    { name: "layout", type: tsOf("split", "stacked"), default: "split" },
    { name: "tone", type: toneLite, default: "default" },
    { name: "density", type: denseLite, default: "default" },
  ],
  view: [frame({ ...common, layout: cond(eq(ref("layout"), "split"), "split", "stack"), hasMedia: true, mediaSide: "start" }, [
    ifAny("stats", [use("Grid", { props: { Cols: "2-4", Class: "gap-4" }, attrs: { "data-testid": "stats" } },
      each(ref("stats"), "s", ref("s.id"),
        use("Stack", { props: { Gap: "0" }, attrs: { "data-testid": "stat" } }, use("Text", { props: { Size: "3xl", Weight: "bold" } }, text(ref("s.value"))), muted(ref("s.label"), "xs"))))]),
    ifAny("values", [use("Box", { props: { Class: cn("grid grid-cols-1 gap-4", cond(eq(ref("layout"), "stacked"), "md:grid-cols-3", "")) }, attrs: { "data-testid": "values" } },
      each(ref("values"), "v", ref("v.id"),
        use("Group", { props: { Gap: "4", Align: "start", Class: "border-t border-border pt-4" }, attrs: { "data-testid": "value" } },
          use("LucideIcon", { props: { Name: ref("v.icon"), Size: 20 } }),
          use("Stack", { props: { Gap: "2" } }, strong(ref("v.title"), "sm"), muted(ref("v.text"))))))]),
  ], [use("Box", { props: { Class: "grid grid-cols-3 gap-4" }, attrs: { "data-testid": "strip" } },
    organism("MediaFrame", { alt: ref("title"), ratio: "3/4" }), organism("MediaFrame", { alt: ref("title"), ratio: "3/4", className: "mt-8" }), organism("MediaFrame", { alt: ref("title"), ratio: "3/4" }))])],
});

export const peopleOrganisms: OrganismSpec[] = [teamGrid, jobBoard, aboutMe, aboutCompany];
