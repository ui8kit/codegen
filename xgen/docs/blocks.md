# Blocks

A **block** is an organism of the site, the axes it varies on, named variants and the data it reads. It holds **no markup**.
The organism draws it. A variant is a row of data (axis -> value), never a copy of code.

```
xgen/specs/blocks/<key>.json     the block      (schema: xgen/schema/schemas/block.schema.json)
xgen/specs/screens/*.json        "kind": "composed": a page that is a list of block uses (composed.schema.json)
xgen/specs/patterns/             SectionFrame, MediaFrame, ActionGroup: the frames every site organism is made of
```

## A block

| field | meaning |
|---|---|
| `organism` | the organism that draws it (SiteHeader, HeroSection, FeatureGrid, ...) |
| `axes` | axis -> values. An axis is a prop of the organism whose type is a union of literals; the values equal the union |
| `defaults` | the value of each axis when a variant does not set it (equal to the organism default) |
| `variants` | `{ id, set }`: the named rows. A row sets axes only |
| `slots` | the patterns the organism is made of (checked against its view) |
| `events` | organism event -> page action (the only action is `toggleTheme`) |
| `data` | the fixtures the props read; a page gets one source per entry |
| `sample.props` | props every use gets for free: dictionary references and fixture data |
| `theme` | the topic of the gallery section: marketing, commerce, promo, content, account, dashboard, onboarding, support (`blocks.themes.<theme>.title/text` in the dictionary) |
| `fit` | `section` (default): the block spans the page; `card`: a narrow block (an auth card, a plan) the gallery centers in a `max-w-sm` container |
| `variants[].props` | case copy of a variant (a SaaS hero, a shop banner): dictionary references that replace the sample for this row only |

Axes in use: layout, columns, item, media, media side, density, tone, emphasis, position, actions, and the block's own (mode, chart, progress, marker, terms, fields, social, ...).
Props merge as sample < axis defaults < `variant.set` < `variant.props` < the use. The variants of a block are chosen so that every value of every axis is shown by some row.

## The catalog

61 blocks and 325 variants in 8 themes. The gallery index has a section per theme. The 92 layouts of the reference catalog are mapped to blocks and variants in [vibeui-coverage.md](vibeui-coverage.md).

| theme | blocks (variants) |
|---|---|
| marketing | accordion 4, beforeafter 4, bento 4, compare 4, credits 4, cta 11, faq 7, features 8, featuretabs 3, footer 3, header 4, hero 16, iconwall 5, logos 6, megamenu 4, navbar 6, pagehead 3, plan 3, pricing 10, proof 4, sitemap 6, stats 7, steps 6, sticky 4, testimonials 11, usage 4, videos 4 |
| commerce | cart 4, categories 5, orders 4, product 5, products 7, reviews 5, summary 4 |
| promo | announcement 9, cookie 4, newsletter 6 |
| content | article 4, postheader 4, posts 7 |
| account | auth 8, authpage 9, profile 4, wizard 5 |
| dashboard | activity 4, bottomnav 4, chart 4, empty 6, kanban 4, metrics 4, overview 4, shell 4, sidenav 4, skeleton 4 |
| onboarding | checklist 7, stepper 4, tour 4, videomodal 4 |
| support | channels 4, contact 6, errorpage 5 |

Source: `xgen/screens/src/authoring/gallery/blocks.ts` (marketing), `blocks-commerce.ts`, `blocks-more.ts`, `blocks-vibe.ts` (the blocks added for the reference catalog); the organisms in `site.ts`, `marketing.ts`, `commerce.ts`, `content.ts`, `promo.ts`, `account.ts`, `dashboard.ts`.
Product cases (SaaS, shop, agency, blog) are variants with case copy. The fixtures are Codex-style collections in `xgen/fixtures`.
After a change to blocks or variants run `bun xgen/screens/tools/author-block-texts.ts` (names, docs and labels into the dictionary); new Lucide names are merged with
`bun xgen/spec/tools/add-lucide.ts <canary-root> <name>...`.

## Pictures and the container

**MediaFrame** is the only way a block shows a picture. Props: `alt`, `src` (the light theme), `darkSrc` (the dark theme; without it `src`), `ratio`, `shape`.
Without `src` it shows built-in neutral placeholders as base64 data URIs (one light, one dark, no external files): two `img` (`data-theme-src="light"` with `dark:hidden`,
`"dark"` with `hidden dark:block`), the right one is shown by the theme tokens.

**SectionFrame** keeps every block in one container (`data-slot="container"`, `max-w-5xl`, centered) and stacks its parts with `align: stretch`;
a `Stack` without it shrinks its children to their content and the block sits at the left. The gallery e2e measures the container at 1400 and 390 px.

## A composed screen

A page is `routes`, a `frame` (blocks before and after the routed area) and `areas` (lists of `{ block, variant, props }`).
The loader expands it into an ordinary page screen: props merge as sample < axis defaults < variant < the use.
An axis cannot be set in a use; choose another variant. The site (`screen.site`) is a composed screen.

The **gallery** (`screen.blocks`, `"gallery": true`) is built from the whole catalog: an index, and a page per block with every variant on the fixtures.
Both host apps serve it at `/blocks/#/` (Svelte on 5180, React on 5181); there is no gallery app.

## Theme screens

Each theme of the catalog (plus a split of marketing into landing, product and pricing) is a composed screen served by both hosts at `/theme-<name>/#/<page>`
(no app per theme). The pages are composed screens (`screen.theme-<name>`) written in `xgen/screens/src/authoring/screens/themes.ts`:
a lead block with the h1 (`pagehead`, `hero`, `authpage`, `errorpage`, `postheader` or `product`), the blocks of the page, and a frame of the `navbar` block (skip link, theme button) and a `sitemap` footer.
The head texts of the pages live in the dictionary under `pages.<appKey>.<page>`; write them with `bun xgen/screens/tools/author-theme-texts.ts`. The menu of each theme screen is its `menu` field, written by the builder.
The links of the bar are the sample data of the block (they all lead to the first page); pages link to each other through the call to action of the lead block.

| screen (`theme-<name>`) | pages |
|---|---|
| marketing-landing | home, launch, developers, studio, events |
| marketing-product | home, tour, capabilities, navigation |
| marketing-pricing | home, plans, usage, compare |
| commerce-shop | home, catalog, browse, product, cart, orders |
| promo-campaign | home, launch, offer, notices |
| content-blog | home, articles, archive, post, essay, plain |
| account-portal | sign-in in eight shapes, join, cards, profile |
| dashboard-console | overview, board, workspace, layouts, states |
| onboarding-flow | home, welcome, setup, tour |
| support-center | home, faq, contact, missing, moved |

Every block of the catalog appears in at least one theme screen (`xgen check`, group `themes`). `xgen e2e` runs the theme scenario on each route in light and dark:
one h1 (equal to the title of the page), one main, heading order, unique ids, named sections and landmarks, no gradients, data-URI pictures, centered containers and no sideways scroll at 1100 and 390 px, the skip link, and screenshots `shots/<app>-<page>-<light|dark>.png`.
`XGEN_E2E_ONLY=blocks,theme-marketing` runs only the screens (or hosts) whose keys start with one of the prefixes.

## Checks

`xgen check` has a `blocks` group (the audit groups are in [audit-2026-10-05.md](audit-2026-10-05.md)): the schema, the organism and its axes (equal to the union of the prop), defaults, variants that resolve and are distinct,
every axis value shown by some variant, slots equal to the patterns of the organism, events and actions, fixtures and their fields, the picked plan,
texts and labels present in `content/ui/en.json`, no Cyrillic, no gradients, composed uses that name real blocks and variants, a gallery section for every variant.

`xgen e2e` runs one gallery scenario in every host runtime (the index by theme; the facts of every variant: counts, columns, media side, tone, sticky header, disclosures, theme; the container of every block at 1400 and 390 px: centered, one width, no sideways scroll; only data-URI pictures),
compares the DOM of the hosts in the same states and writes light and dark screenshots to `shots/blocks-<runtime>-<block>-<light|dark>.png`.
