// Company blocks of the catalog: the team, a photo gallery, projects, open jobs, a personal about section, the culture and a timeline.
import { ref } from "../../build";
import { define } from "./blocks-define";
import { t } from "./block-kit";
import * as d from "./blocks-data";

const c = (k: string) => t(`company.${k}`);
const when2 = (sel: string, n: number | string, axis: string, on: string | string[], off: string | string[]) => [{ sel, n, when: { [axis]: on } }, { sel, n: 0, when: { [axis]: off } }];

const team = define({
  key: "team", theme: "marketing", group: "company", name: "Team", docs: "The people of a team as cards, a minimal grid, detailed cards, rows beside a picture or a directory.",
  organism: "TeamGrid", axes: ["layout", "cols", "tone", "density"], data: [d.members],
  variants: [
    ["cards4", "Portrait cards, four columns"],
    ["cards3", "Portrait cards, three columns, muted", { cols: "1-3", tone: "muted" }],
    ["minimal", "Small portraits, names only", { layout: "minimal" }],
    ["detailed", "Detailed cards with skills", { layout: "detailed", cols: "1-3" }],
    ["list", "Rows beside a picture", { layout: "list" }],
    ["directory", "Directory, two columns, compact", { layout: "directory", density: "compact" }],
  ],
  facts: [{ sel: '[data-testid="item"]', n: "@members" }, ...when2('[data-slot="media"]', 1, "layout", "list", ["cards", "minimal", "detailed", "directory"])],
  sample: { id: "team", title: c("team.title"), lead: c("team.lead"), members: ref("members"), empty: t("empty.members"), depts: c("depts") },
});

const photos = define({
  key: "photos", theme: "marketing", group: "company", name: "Photo gallery", docs: "Photos in a grid, a masonry, a mosaic, a featured picture with thumbnails, or cards.",
  organism: "PhotoGallery", axes: ["layout", "captions", "tone", "density"], data: [d.photos],
  variants: [
    ["grid", "Grid with captions"],
    ["gridPlain", "Grid without captions, muted", { captions: "hide", tone: "muted" }],
    ["masonry", "Masonry of mixed heights", { layout: "masonry" }],
    ["mosaic", "Mosaic with one big tile", { layout: "mosaic" }],
    ["featured", "Featured picture over thumbnails", { layout: "featured" }],
    ["cards", "Cards with a tag, compact", { layout: "cards", density: "compact" }],
  ],
  facts: [
    { sel: '[data-testid="item"]', n: "@photos", when: { layout: ["grid", "masonry", "mosaic", "cards"] } },
    { sel: '[data-testid="thumbs"] [data-slot="media-frame"]', n: "@photos", when: { layout: "featured" } },
    { sel: '[data-testid="caption"]', n: "@photos", when: { layout: ["grid", "masonry"], captions: "show" } },
    { sel: '[data-testid="caption"]', n: 0, when: { captions: "hide" } },
  ],
  sample: { id: "photos", title: c("photos.title"), lead: c("photos.lead"), photos: ref("photos"), empty: t("empty.photos"), labels: c("photos") },
});

const projects = define({
  key: "projects", theme: "marketing", group: "company", name: "Projects", docs: "Projects as cards, a compact grid, captions over pictures, a bento or a list beside a collage.",
  organism: "ProjectGrid", axes: ["layout", "tone", "density"], data: [d.projects],
  variants: [
    ["cards", "Cards with tags and links"],
    ["compact", "Compact, four columns", { layout: "compact" }],
    ["overlay", "Captions over the pictures", { layout: "overlay" }],
    ["bento", "Bento with one big project", { layout: "bento" }],
    ["list", "List beside a collage", { layout: "list" }],
    ["cardsMuted", "Cards, muted, compact", { tone: "muted", density: "compact" }],
  ],
  facts: [{ sel: '[data-testid="item"]', n: "@projects" }, { sel: '[data-testid="featured"]', n: 2, when: { layout: ["cards", "overlay", "bento"] } }, { sel: '[data-testid="featured"]', n: 0, when: { layout: ["compact", "list"] } }],
  sample: { id: "projects", title: c("projects.title"), lead: c("projects.lead"), projects: ref("projects"), empty: t("empty.projects"), labels: c("projects") },
});

const jobs = define({
  key: "jobs", theme: "marketing", group: "company", name: "Careers", docs: "Open jobs as cards, grouped by department, or as a table.",
  organism: "JobBoard", axes: ["layout", "salary", "tone"], data: [d.jobs, d.departments],
  variants: [
    ["grid", "Cards in two columns"],
    ["salary", "Cards with the salary", { salary: "show" }],
    ["grouped", "Grouped by department", { layout: "grouped" }],
    ["table", "Table with the salary, muted", { layout: "table", salary: "show", tone: "muted" }],
  ],
  facts: [
    { sel: '[data-testid="item"]', n: "@jobs" },
    ...when2('[data-testid="group"]', "@departments", "layout", "grouped", ["grid", "table"]),
    ...when2('[data-testid="job-table"]', 1, "layout", "table", ["grid", "grouped"]),
    { sel: '[data-testid="salary"]', n: "@jobs", when: { layout: "grid", salary: "show" } },
    { sel: '[data-testid="salary"]', n: 0, when: { salary: "hide" } },
  ],
  sample: { id: "jobs", title: c("jobs.title"), lead: c("jobs.lead"), jobs: ref("jobs"), empty: t("empty.jobs"), departments: ref("departments"), labels: c("jobs") },
});

const aboutme = define({
  key: "aboutme", theme: "marketing", group: "company", name: "About me", docs: "A personal about section beside a portrait: key facts or skills.",
  organism: "AboutMe", axes: ["layout", "mediaSide", "tone"], data: [d.profilefacts, d.skills],
  variants: [
    ["facts", "Portrait first, key facts"],
    ["factsEnd", "Portrait at the end", { mediaSide: "end" }],
    ["skills", "Skills with bars", { layout: "skills" }],
    ["skillsMuted", "Skills, portrait at the end, muted", { layout: "skills", mediaSide: "end", tone: "muted" }],
  ],
  facts: [...when2('[data-testid="fact"]', "@profilefacts", "layout", "facts", "skills"), ...when2('[data-testid="skill"]', "@skills", "layout", "skills", "facts")],
  sample: {
    id: "aboutme", title: c("aboutMe.title"), lead: c("aboutMe.lead"), badge: c("aboutMe.badge"), facts: ref("profilefacts"), skills: ref("skills"), labels: c("aboutMe"),
    actions: { mode: "two", cta: c("aboutMe.cta"), href: "#/work", secondary: c("aboutMe.more"), secondaryHref: "#/contact" },
  },
});

const about = define({
  key: "about", theme: "marketing", group: "company", name: "About the company", docs: "The culture: a strip of pictures, figures and values.",
  organism: "AboutCompany", axes: ["layout", "tone", "density"], data: [d.stats, d.values],
  variants: [["split", "Pictures beside the text"], ["stacked", "Pictures below, values in a row", { layout: "stacked" }], ["muted", "Muted, compact", { tone: "muted", density: "compact" }]],
  facts: [{ sel: '[data-testid="stat"]', n: "@stats" }, { sel: '[data-testid="value"]', n: "@values" }],
  sample: { id: "about", title: c("about.title"), lead: c("about.lead"), stats: ref("stats"), values: ref("values") },
});

const timeline = define({
  key: "timeline", theme: "content", group: "story", name: "Timeline", docs: "Milestones on a vertical line beside a picture, in a narrow column, or in a row.",
  organism: "MilestoneTimeline", axes: ["layout", "tone", "density"], data: [d.milestones],
  variants: [["split", "Beside a picture"], ["stacked", "Narrow column", { layout: "stacked" }], ["row", "A row of columns", { layout: "row" }], ["rowMuted", "Row, muted, compact", { layout: "row", tone: "muted", density: "compact" }]],
  facts: [{ sel: '[data-testid="item"]', n: "@milestones" }, ...when2('[data-slot="media"]', 1, "layout", "split", ["stacked", "row"])],
  sample: { id: "timeline", title: c("timeline.title"), lead: c("timeline.lead"), milestones: ref("milestones"), empty: t("empty.milestones") },
});

export const companyBlocks = [team, photos, projects, jobs, aboutme, about, timeline];
