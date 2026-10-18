# Canary coverage: what xgen generates, what is a contract, what is left

The canary (a private Svelte app) is a guide, not a target for a 100% copy. This page answers three questions: **which canary
packages can be generated and how**, **what is already covered** and **what the rest costs**. Numbers are from the checkout on 2026-10-04.

## The four ways a canary file is produced

| mode | what it is | where it lives | used for |
|---|---|---|---|
| **A. spec -> component** | a JSON spec (brick, part, pattern, organism, screen) is turned into a Svelte and a React file by the emitters. Pure markup: no state, no effects, no fixtures. Text comes through props or the dictionary | `xgen/specs/**`, builder in `xgen/screens/src/authoring` | everything presentational |
| **B. contract** | a spec with `portable: false` and a reason, `view: []`. Props, slots and events are fixed, nothing is generated; the programmer writes the behaviour with the a11y helpers (`moveFocus`, `typeahead`, `focusables`, `lockScroll`, `dismissable`, `trapFocus`) | same | overlays, editors, anything with focus or timers |
| **C. portable runtime asset** | framework-free TypeScript (no runes, no hooks) copied into the generated package with the DO NOT EDIT header, plus a thin adapter per framework (runes in Svelte, `useSyncExternalStore` in React) | `xgen/runtimes/core/assets` | logic: URL state, query/sort/filter, csv, codex, validation, formatting |
| **D. hand-written** | the application: ports (props, slots, events, URL port, stores) and the business rules | the app, outside `packages/*` and `apps/*/src/generated` | state, fetching, forms, auth flows |

Checks keep the line between them: `xgen check` fails when a generated file was edited, when generated code uses `setContext`, `$bindable` or
attachments (their replacement is a documented port), when a view has literal text, or when a recipe value has no example.

## Packages of the canary

Line counts are of `src`; effort is in person-days for one person at the pace of this work (a spec with checks about 0.3 day, an asset with tests about 0.5 day).

### shell (20 files, 814 lines)

| canary file(s) | mode | how | effort |
|---|---|---|---|
| PageFrame, PageBody, AppMain, SidebarFrame, SidebarToggle | A | organism specs with slots (`children`, `sidebar`); a toggle emits `toggle` | 0.5 |
| AppTopNav, AppSidebar (140) | A | organisms over the existing `NavItem`, `LogoSidebar`, `SidebarPanel`; items are a record array, the current item comes from the route | 1 |
| Modal, ConfirmDialog, SettingsDialog, RowMenu, ThemeMenu, MenuButton | A + B | the dialog frame is the `dialog` brick; open state, focus trap and outside click are the contract (`trapFocus`, `dismissable`) | 1.5 |
| theme.svelte.ts, router.svelte.ts | C | theme (`toggleTheme`) and the hash router (`createHashStore`, `matchRoute`, `UrlPort`) **exist** as assets with both adapters | 0 |
| layout.svelte.ts (sidebar state) | C | a store with `persist`, same two adapters | 0.5 |
| query.ts, labels.ts | C / dictionary | `buildHash`/`parseHash` already cover query.ts; labels become `content/ui/en.json` keys | 0.3 |
| context.ts (`setContext`) | D | not portable: explicit props / a port object (documented in `_nonportable.json`) | 0.2 |
| **total** | | | **about 4** |

### data-table (8 files, 550 lines)

| canary file(s) | mode | how | effort |
|---|---|---|---|
| types.ts, state.ts, query.ts, csv.ts | C | `collectionView` (search, sort, pager, URL keys) **exists**; missing: filters, multi-sort, column visibility, selection, csv export | 2 |
| DataTable, DataCell (248) | A + B | the plans screen already builds the table from a column list (types text, money, number, badge, `aria-sort`, caption, scope); an organism `DataTable` takes `columns` + `rows`; row selection and editing are events | 2 |
| **total** | | | **about 4** |

### list-kit (19 files, 667 lines)

| canary file(s) | mode | how | effort |
|---|---|---|---|
| Fact, MiniTable, StatusTabs, PageTabs, NumberField, ListTools, FacetPanel, DataList | A | organisms over parts (`Pager`, `SearchField`, `TableToolbar`, `Pill`, `IconTabs`) | 2.5 |
| FormDialog, SavedViews | A + B | frames are specs; submit, validation and storage are events/ports | 1.5 |
| list-ctx.svelte.ts, shell-url.ts, env.ts | D | context replaced by explicit props and the URL port | 1 |
| facets.ts, filter-fields.ts, csv-io.ts, labels.ts | C | pure functions | 1 |
| **total** | | | **about 6** |

### content (9 files, 569 lines)

| canary file(s) | mode | how | effort |
|---|---|---|---|
| codex.ts, library.ts, access.ts | C | `fromCodex` and the collection JSON Schema **exist**; the rest is plain data access | 0.5 |
| validate.ts (268) | C | entry validation by kind; the schema layer of xgen is the base | 1 |
| i18n.svelte.ts, format.svelte.ts | C | a locale store and `t()` with `{0}` placeholders (`tpl`, `at`, `money` exist; one locale today) | 1.5 |
| persist.ts, collection.svelte.ts | C | localStorage store, collection store + adapters | 1 |
| **total** | | | **about 4** |

### auth-kit (12 files, 458 lines)

| canary file(s) | mode | how | effort |
|---|---|---|---|
| AuthCard, SecretField, OtpCells, ProviderButtons | A | organisms; OtpCells needs focus moves (`moveFocus`) | 1.5 |
| AuthWidget (117) | B + C | contract for the flow, a state machine as a portable asset | 1.5 |
| registry.ts, brand.ts, types.ts, fill.ts, snippet.ts | C | data and types; provider logos must be checked for licence before they go public | 1 |
| **total** | | | **about 4** |

### tooling and the rest of ui

| item | mode | effort |
|---|---|---|
| tooling `retag`, `rules`, `i18n`, `content`, `fix-root` | project specific; xgen has its own `audit.sh` and `check` | 2, optional |
| ui: eleven contracts (CodeEditor, PromptInput, Smartbox, Drawer, DropdownMenu, Popover, SelectMenu, Toaster, DropZone, FilterBuilder, LogoMark) as full behaviour | C + B | 12 for all, 1 to 3 each; nothing is needed to use the contracts |
| ui: `toasts.svelte.ts` | C | 0.3 |
| ui: kit icon set | **never**: glyph data is private kit data (Lucide is the public replacement) | - |

Packages total: about **22 person-days** for shell, data-table, list-kit, content and auth-kit; about **14** more for the full behaviour of the overlays and tooling.

## Coverage map (2026-10-04)

### Components of `packages/ui` (110 names)

| | count | share |
|---|---|---|
| generated for Svelte and React | 98 | 89% |
| contract only (props/slots/events fixed, behaviour is the programmer's) | 11 | 10% |
| not covered (kit icon set) | 1 | 1% |

By tier: 68 ui bricks/parts (all generated, plus ButtonPlain, LinkPlain, Range, Skeleton, LucideIcon; ButtonLabel was folded into Button in ui8kit 2.0), 23 parts (20 generated, 3 contracts), 19 patterns (11 generated, 8 contracts).

### Packages (7 in canary)

| package | state |
|---|---|
| ui | covered (above) |
| shell | not generated; theme, router and URL port exist as assets (about 10% of the work) |
| data-table | not generated; `collectionView` and the table of the plans screen cover the core (about 25%) |
| list-kit | not generated; Pager, SearchField, TableToolbar exist as parts (about 15%) |
| content | not generated; `fromCodex`, the collection schema and the dictionary exist (about 25%) |
| auth-kit | not generated |
| tooling | replaced by `bun run audit:push` and `xgen check` |

Whole packages: 1 of 7 (14%); with the partial ones about 2.3 of 7.

### Apps (7 in canary, 224 Svelte files)

| app | files | state |
|---|---|---|
| landing | 32 | **partial**: home and pricing in Svelte and React (SiteHeader, SiteFooter, HeroSection, FeatureGrid, PricingTiers, FaqList, CtaBand, not-found = 8 of 32 files, 25%). Not ported: blog (PostPage, PostCard, PostMore, Prose), forms (Lead, Newsletter), Compare, Steps, Stats, Logos, Team, Testimonials, Contact, Split, Document, AppearanceMenu, the monthly/yearly toggle, ru locale, per-route document title |
| table | 25 | not ported; the list -> record demo (plans: search, sort, pager, record card, URL state) is a small relative |
| crm | 18 | not ported |
| cms | 31 | not ported |
| commerce | 28 | not ported |
| pim | 36 | not ported |
| auth | 54 | not ported |

Apps: 0 of 7 whole, 1 partial; files 8 of 224 (4%).

Effort for the rest of the apps after the packages above: landing 4, table 3, crm 2.5, cms 4, commerce 4, pim 5, auth 7 = **about 30 person-days**, each with its e2e scenario.

### e2e

Canary has 745 assertions in 7 scripts (landing 84, auth 163, commerce 132, pim 126, table 109, crm 70, cms 61; English and Russian). xgen runs per runtime: plans 29 steps, landing 43 steps, plus the DOM pair test (Svelte vs React) in 9 states. Landing: 43 of 84 (51%) of the canary assertions have an equivalent (landmarks, one h1, skip link, current link, fixtures on the page, FAQ, theme, no gradients, 404); the Russian run, forms and the blog have none.

## Deviations from the canary (all deliberate)

- **Field**: the `for` attribute is the prop `htmlFor`; **Panel**: an `id` prop instead of `$props.id()`; **Region**: no rest spread.
- **Pager**: no page-size select; `pageLabel` is a template string (`{0}`); `moreLabel` is a prop.
- **Switcher / SwitcherItem**: the context is replaced by explicit `size`, `shape`, `layout` props.
- **FileTreeItem, EditorTab**: Lucide glyphs instead of kit icons (open question: keep or replace).
- **Range**: controlled `value`; **Progress**: exists as the `Progress` part of `ui.form.controls`, without a Label.
- No `$bindable`, no `setContext`, no attachments: the replacement is a prop plus an event or a port (`_nonportable.json`).
- LogoMark and the kit icon set: private glyph data, never in git; LogoMark is a contract.
- A `.svelte` file can not start with a `//` comment (it renders as text): the header is `<!-- ... -->` (the pair test found this, a check now guards it).
- In-page anchors (`#main-content`) do not change the route of the hash router (`isRouteHash`).
