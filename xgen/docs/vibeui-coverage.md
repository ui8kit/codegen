# Coverage of the reference catalog

<!-- Written by screens/tools/author-coverage.ts from xgen/screens/src/authoring/gallery/coverage.ts. `xgen check` compares this file with the registry; do not edit it by hand. -->

The reference catalog holds 92 layouts in 15 categories. Each one is mapped to a block and a variant of ours (a variant is a row of data: axes and case copy), or to a block plus a contract for the motion that a port must supply. Only the composition and the layout are recorded here: no words and no markup of the source are copied. The source of truth is our own primitives, patterns and organisms with their specs.

| Kind | Layouts |
| --- | --- |
| A variant of a block that existed | 45 |
| A new block | 38 |
| A variant, plus a contract for motion | 6 |
| A new block, plus a contract for motion | 3 |
| **All** | **92** |

9 layouts need a contract (8 patterns: marquee, carousel, count-up, typing text, video embed, animated backdrop, scroll spy, sortable list). A contract is a pattern with a props interface and slots, generated for every runtime as a typed port; it has no animation of its own, and the static variant named next to it is what the page shows without the port.

Rules every row obeys: no gradients, no animation variants, icons from Lucide, pictures as embedded placeholders, tokens of shadcn, text from the English dictionary.

## Auth

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 1 | Form beside a picture panel | `authpage.split` | AuthLayout | new block |
| 2 | Card centered on a tinted page | `authpage.centered` | AuthLayout | new block |
| 3 | Bare form, no chrome | `authpage.minimal` | AuthLayout | new block |
| 4 | Social providers first, address second | `authpage.socialFirst`, `auth.socialFirst` | AuthLayout | new block |
| 5 | Passwordless link by address | `authpage.magic`, `auth.magic` | AuthLayout | new block |
| 6 | Sign-up in steps with progress | `wizard.bar`, `wizard.list`, `wizard.second` | SignupWizard | new block |

## Pricing

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 7 | Three tiers side by side, one highlighted | `pricing.grid` | PricingTiers | variant |
| 8 | Tiers with a monthly or yearly switch | `pricing.monthly`, `pricing.annual` | PricingTiers | variant |
| 9 | Feature comparison table across plans | `compare.plans`, `compare.highlight` | ComparisonTable | new block |
| 10 | One plan, one price, one list | `plan.standard` | PricingCard | variant |
| 11 | Price follows a usage slider | `usage.card` | UsageCalculator | new block |
| 12 | Packs of credits to buy | `credits.tiles4` | CreditPacks | new block |
| 13 | Free plan against the paid plan | `pricing.duo` | PricingTiers | variant |
| 14 | Plans stacked in one column | `pricing.stack` | PricingTiers | variant |

## Features

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 15 | Icon, title and text in a grid | `features.grid` | FeatureGrid | variant |
| 16 | Bento: tiles of different sizes | `bento.bento` | BentoGrid | new block |
| 17 | Rows of text and picture, sides alternate | `features.rowsAlternate` | FeatureGrid | variant |
| 18 | Features behind tabs | `featuretabs.split` | FeatureTabs | new block |
| 19 | Features as an accordion beside a picture | `accordion.media` | FeatureAccordion | new block |
| 20 | List that follows the scroll beside a sticky picture | `sticky.end`, `pattern.scroll-spy` | FeatureSticky | new block + contract |
| 21 | Wall of icons with short labels | `iconwall.tiles4` | IconWall | new block |
| 22 | Before and after, side by side | `beforeafter.cards` | BeforeAfter | new block |

## Hero

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 23 | Centered text above a product screenshot | `hero.screenshot` | HeroClassic | variant |
| 24 | Text on one side, picture on the other | `hero.split` | HeroClassic | variant |
| 25 | Text over a full-width background clip | `hero.backdrop`, `pattern.video-embed` | HeroClassic | variant + contract |
| 26 | Text over a moving mesh background | `hero.muted`, `pattern.animated-backdrop` | HeroClassic | variant + contract |
| 27 | Terminal window with typed lines | `hero.code`, `pattern.typing-text` | HeroClassic | variant + contract |
| 28 | Cluster of floating interface cards | `hero.cluster` | HeroClassic | variant |
| 29 | Oversized type, almost no picture | `hero.display` | HeroClassic | variant |
| 30 | Headline with an inline address form | `hero.form` | HeroClassic | variant |

## CTA

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 31 | Full-width band with one button | `cta.band` | CtaBand | variant |
| 32 | Card split into text and action | `cta.split`, `cta.row` | CtaBand | variant |
| 33 | Bar fixed to the bottom of the screen | `announcement.bottom` | AnnouncementBar | variant |
| 34 | Band over a quiet pattern | `cta.band` | CtaBand | variant |
| 35 | Two actions for two audiences | `cta.saas`, `cta.agency` | CtaBand | variant |
| 36 | Address field and a button inline | `cta.form` | CtaBand | variant |
| 37 | Customer quote above the action | `cta.quote` | CtaBand | variant |

## Stats

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 38 | Four figures in a row | `stats.plain4` | StatsBand | variant |
| 39 | Figures that count up on view | `stats.plain4`, `pattern.count-up` | StatsBand | variant + contract |
| 40 | Icon beside each figure | `stats.icons` | StatsBand | variant |
| 41 | Customer logos above the figures | `proof.above` | ProofBand | new block |
| 42 | Figures stacked in one column | `stats.stack` | StatsBand | variant |
| 43 | Figures over a picture | `stats.image` | StatsBand | variant |
| 44 | Each figure in its own card | `stats.cards` | StatsBand | variant |

## Navigation

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 45 | Brand, links and one button | `navbar.inline` | NavBar | new block |
| 46 | Brand in the middle, links on both sides | `navbar.split` | NavBar | new block |
| 47 | Wide panel of grouped links under a menu | `megamenu.open` | MegaMenu | new block |
| 48 | Vertical sidebar with icons and the user | `sidenav.full` | SidebarNav | new block |
| 49 | Floating rounded bar | `navbar.inline` | NavBar | new block |
| 50 | Transparent bar over a picture | `navbar.media` | NavBar | new block |
| 51 | Bar with a search field and its shortcut | `navbar.search` | NavBar | new block |
| 52 | Tab bar at the bottom for phones | `bottomnav.labels` | BottomNav | new block |

## Testimonials

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 53 | Three quote cards in a row | `testimonials.grid3` | TestimonialGrid | variant |
| 54 | Endless strip of quotes | `testimonials.strip`, `pattern.marquee` | TestimonialGrid | variant + contract |
| 55 | Masonry of quotes of different height | `testimonials.masonry` | TestimonialGrid | variant |
| 56 | One large featured quote | `testimonials.featured` | TestimonialGrid | variant |
| 57 | Grid of customer videos | `videos.grid3` | VideoGrid | new block |
| 58 | Wall of short social posts | `testimonials.social` | TestimonialGrid | variant |
| 59 | Cloud of customer logos | `logos.grid4` | LogoCloud | variant |
| 60 | Quotes one at a time with arrows | `testimonials.single`, `pattern.carousel` | TestimonialGrid | variant + contract |

## Footer

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 61 | Brand and several columns of links | `sitemap.columns` | SitemapFooter | new block |
| 62 | Single line: brand, links, copyright | `footer.minimal`, `sitemap.row` | SiteFooter | variant |
| 63 | Giant brand word across the bottom | `sitemap.columns` | SitemapFooter | new block |
| 64 | Sign-up form first, links after | `sitemap.newsletter` | SitemapFooter | new block |
| 65 | Links with a service status pill | `sitemap.status` | SitemapFooter | new block |

## FAQ

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 66 | Questions as an accordion | `faq.list` | FaqList | variant |
| 67 | Questions in two columns | `faq.twoColumns` | FaqList | variant |
| 68 | Questions as a chat | `faq.chat` | FaqList | variant |
| 69 | Questions with a search field | `faq.search` | FaqList | variant |
| 70 | Questions grouped under tabs | `faq.tabs` | FaqList | variant |

## Dashboards

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 71 | Sidebar and a main area | `shell.sidebar` | AppShell | new block |
| 72 | Top bar and a main area | `shell.top` | AppShell | new block |
| 73 | Three panes: list, detail, side | `shell.panes` | AppShell | new block |
| 74 | Kanban lanes with cards | `kanban.detail`, `pattern.sortable-list` | KanbanBoard | new block + contract |
| 75 | Counters, a chart and the activity | `overview.split` | DashboardOverview | new block |
| 76 | Empty state with one action | `empty.orders` | EmptyPanel | variant |

## Onboarding

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 77 | Checklist whose tasks expand | `checklist.expand` | Checklist | variant |
| 78 | Tour: callouts that point at the interface | `tour.below` | TourCallout | new block |
| 79 | Welcome video in a dialog | `videomodal.default`, `pattern.video-embed` | VideoModal | new block + contract |
| 80 | Empty state with an illustration | `empty.illustrated` | EmptyPanel | variant |

## Blog

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 81 | Magazine front: one lead post and a grid | `posts.magazine` | PostGrid | variant |
| 82 | Single reading column | `article.column` | ArticleBody | new block |
| 83 | Article with a table of contents beside it | `article.toc` | ArticleBody | new block |
| 84 | Card grid with topic filters | `posts.filters` | PostGrid | variant |

## Contact

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 85 | Form beside the contact details | `contact.split` | ContactForm | variant |
| 86 | Channels: chat, mail, phone as cards | `channels.grid` | SupportChannels | variant |
| 87 | Whole page for the form, nothing else | `contact.page` | ContactForm | variant |

## Bonus

| # | Layout | Ours | Organism | Kind |
| --- | --- | --- | --- | --- |
| 88 | Us against the competitors | `compare.rivals` | ComparisonTable | new block |
| 89 | Announcement of a new feature | `announcement.badge` | AnnouncementBar | variant |
| 90 | Cookie notice as a card | `cookie.card` | CookieBanner | variant |
| 91 | Page not found | `errorpage.centered` | ErrorPage | new block |
| 92 | Loading skeleton of a page | `skeleton.cards` | SkeletonLayout | new block |
