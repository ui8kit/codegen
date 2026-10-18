# Block data vs the Codex v0.4 contract (inventory; step 2: the pilot blocks fixed; step 3: lookups, terms, author_id; step 4: five more blocks; step 5: blocks.json generated; step 6: menus; steps 7-9: kit blocks in groups)

Goal: every block, screen, template and data structure of the kit reads Codex v0.4 entries (`@ui8kit/contract` ^0.2.0;
manifest `xgen/schema/codex/manifest.json`, 62 kinds) by the rules: money = integer minor units + `currency`; dates RFC 3339,
formatted by the UI per locale; text = plain string + entry `locale`; links built from `slug` / `parent_id` (no `href` in data);
media via `featured_media_id` (kind `media`); UI labels from the dictionary of the locale, never from entries; an empty state in every block.

**The contract wins.** On any conflict the block (or its prop) changes; where data is missing it goes into a kind/metadata field
declared in `manifest.json` (an extension point), never into the core schema. Fix column: `block` (preferred) or `manifest` (kind/field).

Machine-readable twin: `xgen/schema/codex/blocks.json` (schema `blocks.schema.json`, test `xgen/schema/test/blocks.test.ts`),
**generated** by `bun run codex:blocks` (`xgen/schema/src/codex-blocks.ts`); `xgen check` (group `codex`) fails when it is behind
the sources. See section 6.
Central field maps: `xgen/runtimes/core/assets/app/fields.ts` -> generated `@ui8kit/app-shared/runtime/fields` (`CODEX_FIELDS`).
Lookups: generated `@ui8kit/app-shared/runtime/codex` (`CODEX`: media, users, taxonomy terms) is the third argument of every
`fromCodex` in the hosts and the magazine; `routes` are added only for kinds an app has a page for (today none: no link).

## 1. Surfaces

| Surface | Where | Data source | Kinds | Status |
|---|---|---|---|---|
| kit blocks (92) | `xgen/specs/blocks/*.json` (authoring `xgen/screens/src/authoring/blocks`, gallery) -> 8 runtimes | `data[].fields` per spec (product, post, plan: `CODEX_FIELDS` in `gallery/blocks-data.ts`), fixtures | 50+ kinds, see blocks.json | 92/92 done (steps 7-20) |
| kit organisms/components (179) | `xgen/specs/organisms`, `authoring/components` | props from the blocks above | (via blocks) | todo (listed in step 2) |
| presets | `xgen/screens/src/authoring/presets`, `xgen/specs/presets`, `packages/taste-data/src/preset.ts`, magazine `#/presets` | style only (class strings, skin/font/radius keys) | none | outside the data contract, checked (step 25, see 7e) |
| xgen screens (15) | `xgen/specs/screens/*.json` -> `apps/host-*/xgen/screens/*` | `{ "$": "ui.*" }` dictionary refs + block data | via blocks | 15/15 done (step 20) |
| magazine templates (10 + header/footer) | `apps/magazine/src/templates/*.svelte`, Templates tab `#/style/<key>/templates` | `data.ts` (fromCodex over `@ui8kit/app-shared/data/*`) + the copy deck `c` | 25 collections | 10/10 + 2/2 done (step 16-17) |
| taste screens (146) | `packages/taste-screens/src/screens` (style detail preview; panorama excluded) | `Deck` from `@ui8kit/taste-data/content/copy.json`, generated from the deck entries | deck, deck_* | 146/146 done (steps 21-24) |
| fixtures (317 entries, 2 taxonomies / 10 terms) | `xgen/fixtures/*.json`, `xgen/fixtures/taxonomies/*.json` -> `packages/shared/app/src/data` | v0.4 entries, taxonomy bundles | 62 (`media`, `user`) | valid (0 errors; term refs checked) |
| taste-data content | `copy.json` (generated, step 21), `reference-*.json` | deck entries / own shapes | deck_* | copy.json done; reference-* excluded (step 26) |
| panorama, illustrations | `packages/panorama` | - | - | excluded |
| reference renderer (research) | `apps/magazine/src/reference`, `packages/taste-data/content/reference-copy.v0.1.json`, `reference-catalog.v0.1.json`, `packages/taste-data/scripts/reference-*` | own shapes | - | excluded (user decision, step 26) |

## 2. The 15 magazine blocks

| Block | Template(s) | Data props | data.ts collection | Kind | Labels | Status |
|---|---|---|---|---|---|---|
| ProductGrid | ecommerce | products | products (CODEX_FIELDS.product) | product | commerce.productLabels, commerce.badges | **done** |
| PostHeader | two-column, three-column | post | posts[i] (CODEX_FIELDS.post) | post | content.labels | **done** |
| PricingTiers | saas | plans | tiers (CODEX_FIELDS.plan) | plan | pricing, vibe.billing | **done** |
| ProductDetail | ecommerce | product | products[0] | product | commerce.detail, commerce.badges | todo |
| ReviewList | ecommerce | reviews | reviews | review | commerce.reviewLabels | todo |
| ProjectGrid | portfolio | projects | projects | project | company.projects | todo |
| PhotoGallery | portfolio | photos | photos | photo | company.photos | todo |
| ArticleBody | docs, two/three-column | sections | article | section | vibe.article | todo |
| FaqList | saas, sidebar | items | faq | faq | site.pricing.faqTitle | todo |
| FeatureGrid | classic, saas, sidebar | features | features | feature | site.home.featuresTitle | todo |
| StatsBand | classic, saas | stats | stats | stat | marketing.stats | todo |
| PageTrail | docs | crumbs, extras.facts | crumbs, stats | crumb, stat | marketing.pageTrail | todo |
| PageIntro | blog, sidebar | none (text props) | - (deck / dictionary) | - | pages.contentBlog.home | todo |
| CtaBand | classic, saas, ecommerce, portfolio | none | - (deck) | - | deck | todo |
| NewsletterForm | blog | none | - | - | promo.newsletter | todo |

Templates also compose HeroClassic, HeroSplit, PostGrid, AppShell, SidebarNav, CategoryNav, AboutMe, NavBar, SitemapFooter
(listed as kit blocks, todo).

| Template | Blocks | Collections |
|---|---|---|
| classic | HeroClassic, FeatureGrid, StatsBand, CtaBand | features, stats |
| two-column | PostHeader, ArticleBody | posts, article, topics |
| three-column | SidebarNav, PostHeader, ArticleBody | sidenav, posts, article, activity |
| sidebar | CategoryNav, PageIntro, FeatureGrid, FaqList | categories, features, faq |
| dashboard | AppShell | sidenav, metrics, series, activity |
| blog | PageIntro, PostGrid, NewsletterForm | posts, topics |
| ecommerce | CategoryNav, ProductDetail, ProductGrid, ReviewList, CtaBand | categories, products, reviews |
| portfolio | AboutMe, ProjectGrid, PhotoGallery, CtaBand | facts, skills, projects, photos |
| saas | HeroSplit, StatsBand, FeatureGrid, PricingTiers, FaqList, CtaBand | stats, features, tiers, testimonials, faq |
| docs | SidebarNav, PageTrail, ArticleBody | outline, helplinks, crumbs, article, stats |

## 3. Pilot field maps

**ProductGrid** (`Product`, kind `product`, map `CODEX_FIELDS.product`)

| Prop | Entry path | Manifest | Note |
|---|---|---|---|
| id | id | core | |
| name | title | core | plain string + locale |
| summary | metadata.summary.value | string, req | |
| price | metadata.price.value | number, money | minor units, `fmtMoney(minor, currency)` |
| compareAt (optional) | metadata.compare_at.value | number, money, optional | old price, same currency; struck through (`del`, "Was" for screen readers) when higher than price |
| currency | metadata.currency.value | string, req | ISO 4217 |
| rating / reviews | metadata.rating / reviews.value | number / integer | |
| badge (optional) | metadata.badge.value | string, optional | a key into the `badges` dictionary |
| category | terms\|term:product_category | core `terms` -> taxonomy `product_category` | the term name ("Light"), by the entry's locale |
| inStock | metadata.inStock.value | boolean | |
| href (optional) | slug\|route | core | built from the slug by `opts.routes[kind]`; no route: no link |
| image (optional) | featured_media_id\|media | core -> kind `media` (`metadata.file`) | the file of a *published* media entry (CODEX.media); in the fixtures a base64 data URI placeholder (no external or file URLs); a real app resolves its own through opts.media / its adapter |
| labels | dictionary `commerce.productLabels` | | add, soldOut, reviews, ratingLabel, was, empty |

**PostHeader** (`Post`, kind `post`, map `CODEX_FIELDS.post`): id, title, excerpt (core), category<-terms|term:category (term name),
author<-author_id|author (`display_name` of the kind `user`), date<-metadata.date|date (RFC 3339 -> the locale of the entry or the app, Intl), minutes (integer,
`labels.minutes`), icon, href<-slug|route, image<-featured_media_id|media (the cover; placeholder without). `post` is optional: without it
the empty state (`content.labels.empty`).

**PricingTiers** (`Plan`, kind `plan`, map `CODEX_FIELDS.plan`): id, name<-title, tagline, price / yearly (money, minor units; 0 -> `labels.free`),
currency, seats / storage (integers, units in labels), highlighted, features (string[]). `status` is no longer read (optional on the record,
the plans list screen keeps its own column). No plans: the empty state (`pricing.empty`).

## 4. Mismatches (fix direction)

| # | Where | Mismatch | Fix |
|---|---|---|---|
| 1 | Product/Post `href` (**fixed**: `slug\|route`), CtaBand/PageIntro/PageTrail `href="#"`, sitemap `links` strings | links not built from slug/parent_id | block: derive the link from `slug` by a route helper; drop `href` from data |
| 2 | Product `image`, PostHeader cover (**fixed**: kind `media`, `featured_media_id\|media`), PhotoGallery, ProjectGrid | no media field; MediaFrame placeholders | block reads `featured_media_id` -> media entry; fixtures add kind `media` (manifest kind) |
| 3 | ProductGrid (**fixed**), ProductDetail (todo) | no old (compare-at) price | manifest field `product.compare_at` (money) + block prop |
| 4 | Product `category`, Post `category` (**fixed**: `terms`, taxonomies `product_category`, `category`), Faq `category`, Photo `tag`, Project `tags` | taxonomy as free text / raw keys printed | block: read `terms` (taxonomy + term entries with locale), show term name |
| 5 | Post/Review `author` (**fixed**: `author_id` -> kind `user`, map `CODEX_FIELDS.review`) | a name string, not a reference | block: read `author_id` (kind user) display_name |
| 6 | `fmtDate`, `fmtAgo` in core.ts (**fixed**: Intl by the entry's or the app's locale; en output unchanged, the compact en units "min", "h", "d" kept) | fixed en-US format and English "2 min ago", "Yesterday" | block/runtime: Intl by locale + dictionary words |
| 7 | stats `value` (**fixed**: number + `metadata.unit`, `\|number` formats in the locale), metrics `value` ("$48,200"), templates `views`/`likes` ("1.2K"), dictionary `marketing.pageTrail.value` ("48") | preformatted numbers as strings | manifest: number fields; formatted with Intl |
| 8 | Product `badge` / Plan `status` (**fixed**: optional; `status` not mapped for the pricing blocks) | record vs manifest | block: make the prop optional / drop `status` |
| 9 | ProductGrid, PricingTiers, PostHeader (**fixed**: EmptyState, `labels.empty`), most other lists | no empty state | block: empty state with a dictionary label |
| 10 | magazine templates / taste screens | text from the English copy deck `c` (not entries, not dictionary) | block props from dictionary; deck becomes entries or a dictionary per locale |
| 11 | (**fixed**, section 7) sitemap `links`, footer groups, side navs, category nav, brand (hardcoded `"#/"` in the components), Plan `features` | string arrays / no href per item; menus are not `menu` records | features ok as content of the entry; menus -> the contract `menu` schema, a link only where it has an address |
| 12 | Project `year` string, ProjectGrid `client` "Northwind" rebranded at runtime | types / data | manifest: integer year; block drops runtime rebrand when data is neutral |

## 5. Status per block

done: ProductGrid, PostHeader, PricingTiers. Step 2 fixed: empty states, links from slug, image from `featured_media_id` (kind `media`),
optional badge, no status, dates by locale, `compare_at`; the xgen specs read `CODEX_FIELDS` (`gallery/blocks-data.ts`, `screens/plans-screen.ts`).
Step 3: category from `terms`, author from `author_id` (kind `user`), lookups `CODEX` passed by the hosts and the magazine;
PostCard renders its read link only with a route. Open: real media assets (none in the repo), routes once the apps have product/post pages.
Step 4 done: ProductDetail (old price, featured media, category term; split into ProductPrice and ProductGallery), ReviewList
(author_id, dates by locale, empty state), StatsBand (numeric `value` + `unit`, `|number` by locale, prop `empty`), PageTrail (crumbs = kind `page`
chained by `parent_id`, `trail()` orders them, a crumb links only with a route; no crumbs: no nav), FaqList (category = slug of the
`faq_category` term, tabs filter by it; prop `empty`). Fallback `"#/"` links removed from SectionHead, FeatureGrid cell head, HeroPrompt,
HeroHead and NavBar links: no address, no link (a button stays a button). Media fixtures: published, base64 data URIs.
The magazine is a showcase: no routes and no links by design; its templates pass no `href`. Left: the hardcoded `"#/"` of footer
groups, side navs, the category nav, the brand and the in-page table of contents (#11): done in step 6 (section 7), except the
in-page table of contents (section 8).
todo: everything else in blocks.json (kind listed from the spec).

## 6. Generation of blocks.json (step 5)

`bun run codex:blocks` writes `xgen/schema/codex/blocks.json` from the sources; `xgen check` group `codex` (and the test
`xgen/schema/test/codex-blocks.test.ts`) fails on drift, like the `authored` and `drift` groups for specs and generated code.

| Field | Source |
|---|---|
| id, spec, source | kit block: the organism name, the spec id, `xgen/specs/blocks/<key>.json`; screen: `xgen/specs/screens/*.json`; magazine: `apps/magazine/src/templates/*.svelte` (`header`, `footer` = `magazine-part`); taste: `packages/taste-screens/src/screens/*.svelte` |
| data[] | one binding per `data[]` of the spec: `collection`, `kind`, `record` as written; `prop` = the organism prop the sample or a variant hands the collection to (dotted for a field of a grouped prop: `filter.tabs`, `extras.facts`); `list` = false when picked (`pick`, `nth`); `map` = the key of `CODEX_FIELDS` whose map equals the spec's `fields` |
| labels[] | every `{ "$": "ui.<path>" }` of the sample and the variants: the prop (dotted when nested) and the dictionary path; `keys` = the fields of the prop's record type found as strings in the dictionary (else the string keys of the dictionary object; `[]` for one string) |
| settings | the organism props that carry neither data nor dictionary text |
| emptyState | the block lists the `EmptyState` slot (or `emptyMode: omit`) |
| uses, collections | screen: every `{ "block": key }` (`block.<key>`), a list screen's `source.collection`; magazine: the kit blocks imported from `@ui8kit/svelte-ui`, every `d.<collection>` read; taste: the kit blocks imported |
| **by hand** | `status` (todo/done), `required` / `optional` of a binding (kept by its collection), `note`, `emptyMode` (kept by id) |

A block new in the specs appears as `todo` with its bindings; a moved or renamed source is followed (the id stays). The bindings of
the done blocks now name the real organism prop (FaqList `items`, `filter.tabs`; PageTrail `extras.facts`; PricingTiers lists the
`duo` collection of its variant too).

## 7. Menus (step 6)

The contract's `Menu` is a core record (`{id, location, locale, items[{id, label, url, parent_id?, order?, target?}]}`), not an entry
kind. The kit keeps its menus as **entries of kind `menu_item`** (manifest kind, field `location`, `icon`, `count`): `title` = the label,
`slug` -> the address through the app's routes (`slug|route`), `parent_id` + `order` = nesting, `metadata.location` = the menu
(`main`, `sidebar`, `subnav`, `outline`, `help`, `footer`, `mega`, `categories`). Collections: navlinks, sidenav, subnav, outline,
helplinks, sitemap, megagroups, categories (the top items) and `menulinks` (the 28 items under the footer and mega groups, which
replace the string arrays `links`).

- `bun run codex:validate` builds the core `Menu` records from these entries (one per location and locale: `url` = `"/" + slug`,
  `target` = `{kind: "menu_item", id}`) and validates them with the entries (`menus` of `validateCollectionV04`): 8 menus, 63 items, 0 errors.
- Field maps: `CODEX_FIELDS.menuItem` (NavLink), `menuGroup` (MegaGroup: `links` = `id|menu`, the children by `order`),
  `menuCategory` (Category). Lookup: `CODEX.menus` = the child collections (generated `runtime/codex`); the shared package and
  `xgen check` (dead) count a child collection as read when its parents are read.
- Blocks: one pattern, `MenuEntry` (`pattern.menu-entry`): a `Link` where the entry has an address, else its content as text in the
  same box (`Inline`, or `Box` with `block` when the content holds block elements); `current` -> `aria-current="page"` in both. Used by
  NavBar, NavLinks, MegaMenu, SidebarNav, BottomNav, SitemapFooter, FooterColumns, FooterCard, FooterSplit, ShellSidebar, ShellFooter,
  CategoryNav, SiteHeader, HeroHead, PostSplit outline, PostShowcase, MediaList, ProjectGrid, JobCards, FAQ blocks. The aria
  expressions now sit in that one file (rules baseline: reactive-aria 26 -> 19 per runtime).
- Brand: a link only with `brandHref` (NavBar, MegaMenu, HeroHead) or `routes.home` (SiteHeader/SiteFooter); else text.
  FooterSplit: the sitemap link only with `extras.sitemapHref` (pattern `FooterSitemap`); the contact actions take `extras.ctaHref` / `secondaryHref`.
- Screens: the site screen passes its routes (`SITE_ROUTES` = home, pricing), the theme screens their own `brandHref` and nav links.
  The gallery passes no menu routes: entries render as text (the DashboardShell footer test counts items, not anchors).
- Magazine: no routes, so no links; the template stage has 0 `<a>` except the in-page table of contents of the docs template
  (was 158: brand, sitemap groups, side navs, categories, nav links).

## 7a. Kit blocks in groups (steps 7-15)

- Every fixture kind has a central map (`KIT_FIELDS` in fields.ts, part of `CODEX_FIELDS`); `codex:blocks` picks the map named
  after the binding's kind when two maps are equal (feature/value/perk/... share one shape).
- Empty state: a list block takes `empty` (text from `ui.empty.*`) and draws EmptyState when its list has no records
  (`orEmpty` in authoring/props.ts). Blocks whose lists are secondary parts (AboutMe, AboutCompany, ProductInfo, Stepper,
  StoreHero, the navigation blocks) use `emptyMode: omit`: `ifAny` leaves the empty part, and its landmark, out.
- Blocks that read no collection (AuthCard, CtaBand, ErrorPage, PageIntro, ...) are done with their dictionary labels; nothing to be empty.
- `done.py`-style bookkeeping: `required`/`optional` of a binding come from the fixtures (a field every entry has is required).
- Data fixes: metrics are numbers (money in minor units + `currency`, `|number` formats it), projects carry an integer year and
  the term of `project_category`, questions the term of `faq_category`.
- Step 10: FeatureShowcase, ComparisonTable, SlotBoard draw EmptyState; FeatureSplit (features/stats), VideoModal (chapters),
  ContactForm (details), DeliveryInfo (facts/zones), SkeletonLayout use omit. `slug|route` may be undefined by design (no route, no link).

- Step 11: PostShowcase, QuoteSplit draw EmptyState; PostGrid (12 props already: omit), MediaList (extras), PostSplit (tags/outline) use omit.
- Step 12: CtaProof, HeroSplit, HeroClassic use omit: each proof/extra/media shape draws only when its list has records; HeroHead
  leaves its nav landmark out without links; topics and terminal lines check the length, not only presence (an empty array is truthy in JS).
- Step 13 (omit): FooterSplit (the guards sit in its parts, the block stays under 150 lines), DashboardShell (ShellTopbar/Sidebar/
  Footer leave a landmark out without links), SignupWizard (no steps: no wizard), PricingCard (one record; the empty list is PricingTable's job).
- Step 14: CartDrawer draws EmptyState (with its browse action) for the empty axis and for a cart with no lines; ShoppingCart draws
  EmptyState titled by `actions.empty` (a field of its own labels record: the block already has 12 props). DashboardOverview and AppShell
  use omit: no metrics, no tiles; no series or events, no panel (app-main helpers).
- Step 15: CheckoutForm uses omit (no days or payments: the step keeps its heading, the radios are left out; CartSummaryCard leaves
  out empty lines, promo codes and rows). Magazine templates pass the `empty` labels of FeatureGrid, ArticleBody, ProjectGrid and
  PhotoGallery (ui.empty.*); a magazine test checks the template data has no href and only data-URI media.
## 7b. Magazine templates (step 16)

- `codex:blocks` gives every template and part its bindings (from `apps/magazine/src/templates/data.ts`: key, record, fixture
  collection, central map; kind and required/optional from the fixtures), its dictionary labels (`d.ui.*`), its settings (the deck
  copy `c` and the layout props of a part) and `emptyState` (true when every block it composes that reads data has one).
- A template or part is done when every block it uses is done (blocks test); the magazine test checks no href and data-URI media.
- Done: the 10 templates, the footer and (step 17) the header.
- The deck copy (`c.title`, `c.lead`, `c.cta`) is the per-deck text of the taste decks, not dictionary labels: kept as a setting.

- Step 17: NavBar uses omit: its inline/search links sit in NavBarMenu (NavBlock + NavLinks), left out with no links; the
  landmark label passes through (landmarks.ts). The split layout keeps its nav (brand and buttons are inside it).

- Step 20: the last kit blocks. FaqSplit uses omit: a FAQ section without questions is left out whole (an `empty` prop would
  break the prop and line limits). JobBoard draws EmptyState (ui.empty.jobs); its salary range stays text (open question 7).
  TemplateGrid: filtersLabel/browse/viewsLabel/likesLabel became one `labels` record (TemplateLabels), which leaves room for
  `empty` (ui.empty.templates); no filters, no filter row. Template views and likes are numbers in the fixture, shown by the new
  pipe `|compact` (1200 -> "1.2K"; "5.0K" now reads "5K"). The blocks test validates a collection together with the others,
  so a relation (jobs -> departments) resolves.

## 7c. xgen screens (step 18)

- `codex:blocks` gives every screen its data (a list screen's own `source`, and the bindings of the blocks it composes, one per
  collection), labels (`{ "$": "ui.*" }` refs and the dictionary keys of menus and columns: `titleKey`, `label`), settings (routes,
  URL state, nav/menu/frame switches) and `emptyState` (every composed block with data has one).
- The route menus of the theme screens are app routes with dictionary titles, not Codex menu content.
- screen.plans reads kind `plan` through the central map `planRow` (KIT_FIELDS: the plan with its status).
- Done: 15 of 15 (step 20: blocks, catalog and theme-marketing-landing once FaqSplit, JobBoard, TemplateGrid were done).

## 7d. Taste screens (step 19-)

- Step 19: no links: the menu words of TopBar and t043 are text (`Inline`), not `Link href="#/"` (the magazine shows the taste
  screens and has no routes).
- The screens read a copy deck (`c`, packages/taste-data/content/copy.json) and kit-data adapters (stats, features, logos, topics,
  bars) built from it. Plan: the deck becomes Codex entries (a `deck` kind with metadata, stat/feature/plan/testimonial/faq
  entries), the adapters map them through CODEX_FIELDS; then each screen gets bindings and is set done.
- Step 21: the decks are Codex entries in xgen/fixtures, next to the other collections (so codex:manifest and codex:validate
  see them): `decks` (kind `deck`: title = brand, metadata nav, eyebrow, headline, accent, lead, cta, secondary, input, note,
  tags) and the parts `deckstats`, `deckitems`, `deckplans`, `deckquotes`, `deckfaq` (kinds `deck_stat`, `deck_item`,
  `deck_plan`, `deck_quote`, `deck_faq`), each with the relation `metadata.deck` and its place `metadata.position`. The
  plan price is `cost` (not a money field: poster copy such as "$0" / "Custom" stays text); the deck title is `headline`
  because `title` is the entry's own core field (the brand).
- The field maps are CODEX_FIELDS.deck, deckStat, deckItem, deckPlan, deckQuote, deckFaq (xgen/runtimes/core/assets/app/fields.ts),
  read by `buildDecks` (xgen/runtimes/core/src/decks.ts, through fromCodex). The generator writes
  packages/taste-data/content/copy.json from them (target `packages/taste-data/content`, the hand-kept reference-*.json are
  ignored); copy.ts reads `copy.decks`. taste-data has no new dependency (it reads generated JSON), the layering stays as it
  is. The generated decks are equal to the old hand-kept file, deck by deck and key by key.
- dead check: the deck collections count as read by that generated file (DECK_COLLECTIONS in audit.ts), not by a screen.
- Step 22-24: the taste screens in blocks.json (codex-blocks `tasteScreen`). data = the deck the screen reads (`c`), found from
  the `c.x` it and its parts (TopBar, Avatars, Field) read and from the kit-data adapters (logos/topics -> tags, features ->
  items): one binding `c` (kind deck, map deck, required = the deck fields read) plus one per part list (`c.stats` -> deckstats,
  deckStat, ...). labels = [] (a taste screen has no dictionary text, the poster copy is deck data). settings = the attributes
  given to a part (`TopBar.layout`, `TopBar.tone`, `Avatars.n`, ...). No taste screen composes a kit block (only bricks), so
  `uses` is empty and no kit link can reach one.
- Empty state: every deck has stats and items (tested in xgen/runtimes/core/test/decks.test.ts); plans, quotes and faq are
  read as `c.x ?? []`, so a deck without them leaves the list out: t146 has emptyMode omit. The other screens' emptyState is
  true (no list that can be empty).
- The old note "text from a copy deck, not Codex entries" is removed from the taste entries: the decks are Codex entries now.
- blocks.test runs one set of binding tests per distinct binding (the 146 screens share a few deck bindings).

## 7e. Presets (step 25)

- A preset is style, not content: `xgen/specs/presets/defaults.json` (authoring `presets/default-preset.ts`) holds named
  Tailwind class strings for block sizes; `packages/taste-data/src/preset.ts` builds `{ screen, skin, font, fonts, radius,
  pattern, style }` from a style key. Neither carries text, a link, media or an entry, so nothing maps to Codex: they are
  settings of the blocks and screens (the `settings` side of blocks.json), not data. No change.
- The magazine page `#/presets` lists the saved styles: its words come from the magazine dictionary (content/ui.json), its
  one link has a real href (`#/style/<key>`), its empty state is `ui.presets.empty`. It meets the rules as it is.

## 8. Open questions (decided for now, review later)

- (resolved, step 26: an exception, user decision) The research renderer (`apps/magazine/src/reference`) with
  `reference-copy.v0.1.json`, `reference-catalog.v0.1.json` and the capture scripts stays outside the contract, like panorama and
  illustrations: own shapes, not Codex entries, not in blocks.json; the kit, magazine templates and taste screens never read them.

1. Docs template table of contents: in-page anchors (`#tp-docs-body-section-*`) stay links; they address the page itself, not an app route.
2. Gallery samples (`gallery/blocks-*.ts`) keep `"#/pricing"`-style hrefs as screen data the app hands over (not fixtures).
3. CTAs with no address source (FAQ arrow link, auth "forgot", composer buttons) became link-style buttons (`<button type="button">`).
4. (resolved, step 27: the chip is `h-8 px-3`, 32 px like Button sm, no half step) CategoryNav kept the chip classes `px-3 py-1.5` (a half step; inside a control, lint:px does not block it); to revisit with the control sizes.
5. The magazine header shows the fixture menu labels (`navlinks`) instead of the deck's nav words; the deck words will go with #10.
6. Menu items' `url` in the core Menu is `"/" + slug` (a neutral path); the real address is still the app's route.
7. (resolved, step 20: JobBoard done, salary kept as text with an empty state) JobBoard stayed todo: salaries are text ("$120k to $150k", "$60 an hour"); they need min/max minor units, currency and a period
   word from the dictionary (a range formatter), so the block changes with them.
8. (resolved, step 20: TemplateGrid done, labels record + `empty`, views/likes numbers with `|compact`) TemplateGrid stayed todo: it already has 12 props (the readability limit), so `empty` needs a grouped labels prop first; views/likes
   are preformatted ("1.2K") and become numbers with compact formatting then.
9. Table cells of ComparisonTable (`compare`, `rivals`: "Unlimited", "0.8 s"), delivery windows (`days.slots`), zone times and chapter
   offsets ("0:00") stay plain text for now: they read as copy, not as figures the UI computes with.
10. Milestone `date` is a year string ("2021"); kept as text until a `|year` formatter is needed.
- (resolved, step 20: FaqSplit done with emptyMode omit, the whole section left out without items) FaqSplit stayed todo: an `empty` prop makes 13 props and the generated faq-split 154 lines; needs a split (FaqSplit by layout) or the text in its labels record.
