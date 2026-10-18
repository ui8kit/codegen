// Parts of the people blocks: a member row of TeamGrid, and the job list of JobBoard as cards in two columns or a table with one row per job.
import { at, cn, cond, each, eq, firstOf, ne, organism, ref, text, use, when, where } from "../../build";
import type { OrganismSpec, Value } from "../../ir";
import { spec, ts } from "../kit";
import { tsOf } from "../props";
import { muted, strong, surface } from "../ux";
import { menuEntry } from "./nav";

const meta = (icon: string, value: string) =>
  use("Group", { props: { Gap: "2", Align: "center" } }, use("LucideIcon", { props: { Name: icon, Size: 16 } }), use("Inline", {}, text(ref(value))));
/** a square portrait (a plain rounded picture) of the given size class */
export const portrait = (alt: string, size: Value) => organism("MediaFrame", { alt: ref(alt), ratio: "1/1", className: cn(size, "shrink-0") });
/** a wrapping row of small secondary badges, one per string of the list */
export const tags = (list: string) => use("Group", { props: { Gap: "2", Class: "flex-wrap" } }, each(ref(list), "k", ref("k"), use("Badge", { props: { Variant: "secondary", Size: "sm" } }, text(ref("k")))));
const head = (label: string, cls = "py-2") => use("TableHeadCell", { props: { Scope: "col", Class: cls } }, text(ref(label)));

/** one member beside a small portrait (the detailed, list and directory layouts of TeamGrid) */
export const memberRow = spec("pattern.member-row", "MemberRow", "One member of TeamGrid beside a small portrait: the name, the role, then the department and the place (detailed, directory), the bio (detailed) and the skills (detailed, list).", {
  typeImports: [{ from: "TeamGrid", names: ["Member"] }],
  props: [
    { name: "member", type: ts("Member"), required: true },
    { name: "depts", type: ts("Record<string, string>"), required: true },
    { name: "layout", type: tsOf("cards", "minimal", "detailed", "list", "directory"), default: "list", docs: "the TeamGrid layout; cards and minimal draw as a list row" },
  ],
  view: [use("Group", { props: { Gap: "4", Align: "start", Class: cond(eq(ref("layout"), "detailed"), surface("flex-col p-6"), cond(eq(ref("layout"), "directory"), surface("p-4"), "border-b border-border pb-4")) }, attrs: { "data-testid": "item" } },
    portrait("member.name", cond(eq(ref("layout"), "detailed"), "size-16", "size-12")),
    use("Stack", { props: { Gap: "2", Class: "min-w-0 flex-1" } },
      use("Stack", { props: { Gap: "0" } }, strong(ref("member.name")), muted(ref("member.role"))),
      when(ne(ref("layout"), "list"), [use("Group", { props: { Gap: "2", Align: "center", Class: "flex-wrap text-xs text-muted-foreground" } },
        use("Badge", { props: { Variant: "outline", Size: "sm" } }, text(at(ref("depts"), ref("member.dept")))),
        use("LucideIcon", { props: { Name: "map-pin", Size: 16 } }), use("Inline", {}, text(ref("member.location"))))]),
      when(eq(ref("layout"), "detailed"), [muted(ref("member.bio"))]),
      when(ne(ref("layout"), "directory"), [tags("member.skills")])))],
});

/** the jobs as cards or as a table (the grid and table layouts of JobBoard) */
export const jobCards = spec("pattern.job-cards", "JobCards", "The jobs of JobBoard as cards in two columns (title, department, place, type, optional salary, posted, apply) or as a table.", {
  typeImports: [{ from: "JobBoard", names: ["Job", "Department", "JobLabels"] }],
  props: [
    { name: "jobs", type: ts("Job[]"), required: true },
    { name: "departments", type: ts("Department[]"), required: true },
    { name: "labels", type: ts("JobLabels"), required: true },
    { name: "layout", type: tsOf("grid", "grouped", "table"), default: "grid" },
    { name: "salary", type: tsOf("show", "hide"), default: "hide" },
  ],
  view: [when(eq(ref("layout"), "table"),
    [use("Box", { props: { Class: "w-full overflow-x-auto rounded inset-ring inset-ring-border" } },
      use("Table", { props: { Class: "w-full text-left text-sm" }, attrs: { "data-testid": "job-table" } },
        use("TableCaption", { props: { Class: "sr-only" } }, text(ref("labels.caption"))),
        use("TableHead", { props: { Class: "bg-muted" } }, use("TableRow", {},
          head("labels.role", "px-4 py-2"), head("labels.team", "hidden py-2 md:table-cell"), head("labels.location", "hidden py-2 sm:table-cell"), head("labels.type"), when(eq(ref("salary"), "show"), [head("labels.salary", "hidden py-2 md:table-cell")]),
          use("TableHeadCell", { props: { Scope: "col", Class: "py-2 pr-4" } }, use("Inline", { props: { Class: "sr-only" } }, text(ref("labels.apply")))))),
        use("TableBody", {}, each(ref("jobs"), "j", ref("j.id"),
          use("TableRow", { props: { Class: "border-t border-border" }, attrs: { "data-testid": "item" } },
            use("TableCell", { props: { Class: "px-4 py-4 font-medium" } }, text(ref("j.title"))),
            use("TableCell", { props: { Class: "hidden md:table-cell" } }, text(firstOf(where(ref("departments"), "id", ref("j.dept")), "name"))),
            use("TableCell", { props: { Class: "hidden sm:table-cell" } }, text(ref("j.location"))),
            use("TableCell", {}, text(ref("j.type"))),
            when(eq(ref("salary"), "show"), [use("TableCell", { props: { Class: "hidden md:table-cell" } }, text(ref("j.salary")))]),
            use("TableCell", { props: { Class: "pr-4 text-right" } }, menuEntry(ref("j.href"), { cls: "font-medium" }, text(ref("labels.apply")))))))))],
    [use("Grid", { props: { Cols: "1-2", Class: "gap-4" }, attrs: { "data-testid": "items" } },
      each(ref("jobs"), "j", ref("j.id"),
        use("Stack", { props: { Gap: "4", Class: surface("p-6") }, attrs: { "data-testid": "item" } },
          use("Stack", { props: { Gap: "2" } }, strong(ref("j.title"), "lg"),
            use("Group", { props: { Gap: "4", Class: "flex-wrap text-sm text-muted-foreground" } }, meta("briefcase", "j.type"), meta("map-pin", "j.location"), meta("calendar", "j.posted"))),
          when(eq(ref("salary"), "show"), [use("Text", { props: { Size: "base", Weight: "semibold" }, attrs: { "data-testid": "salary" } }, text(ref("j.salary")))]),
          use("Group", { props: { Gap: "4", Align: "center", Justify: "between", Class: "mt-auto" } },
            use("Badge", { props: { Variant: "secondary", Size: "default" } }, text(firstOf(where(ref("departments"), "id", ref("j.dept")), "name"))),
            menuEntry(ref("j.href"), { cls: "inline-flex items-center gap-2 text-sm font-medium" }, text(ref("labels.apply")), use("LucideIcon", { props: { Name: "arrow-right", Size: 16 } }))))))]),
  ],
});

export const peopleParts: OrganismSpec[] = [memberRow, jobCards];
