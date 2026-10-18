import { dropDefaultProps, withLandmarkLabels } from "../landmarks";
import { parts } from "../components/parts";
import { patterns } from "../components/patterns";
import { framePatterns } from "../components/frames";
// Every organism of the catalog, in one list. The blocks read their axes from these specs.
import { pricingCard } from "./pricing-card";
import { siteOrganisms } from "./site";
import { marketingOrganisms } from "./marketing";
import { landingOrganisms } from "./landing";
import { pricingOrganisms } from "./pricing-more";
import { showcaseOrganisms } from "./showcase";
import { navigationOrganisms } from "./navigation";
import { workspaceOrganisms } from "./workspace";
import { guideOrganisms } from "./guide";
import { signupOrganisms } from "./signup";

import { commerceOrganisms } from "./commerce";
import { contentOrganisms } from "./content";
import { templateOrganisms } from "./templates";
import { promoOrganisms } from "./promo";
import { accountOrganisms } from "./account";
import { dashboardOrganisms } from "./dashboard";
import { storefrontOrganisms } from "./storefront";
import { deliveryOrganisms } from "./delivery";
import { checkoutOrganisms } from "./checkout";
import { checkoutParts } from "../components/checkout-parts";
import { shopParts } from "../components/shop-parts";
import { peopleParts } from "../components/people-parts";
import { workParts } from "../components/work-parts";
import { peopleOrganisms } from "./people";
import { workOrganisms } from "./work";
import { shellParts } from "../components/shell-parts";
import { shellOrganisms } from "./shells";
import { heroSplitParts } from "../components/hero-split-parts";
import { heroSplitOrganisms } from "./hero-split";
import { faqParts } from "../components/faq-parts";
import { faqSplitOrganisms } from "./faq-split";
import { ctaProofParts } from "../components/cta-proof-parts";
import { ctaProofOrganisms } from "./cta-proof";
import { quoteSplitParts } from "../components/quote-split-parts";
import { quoteSplitOrganisms } from "./quote-split";
import { postSplitParts } from "../components/post-split-parts";
import { postSplitOrganisms } from "./post-split";
import { footerSplitParts } from "../components/footer-split-parts";
import { footerSplitOrganisms } from "./footer-split";
import { featureSplitParts } from "../components/feature-split-parts";
import { featureSplitOrganisms } from "./feature-split";
import { pageTrailParts } from "../components/page-trail-parts";
import { pageTrailOrganisms } from "./page-trail";
import { postShowcaseParts } from "../components/post-showcase-parts";
import { postShowcaseOrganisms } from "./post-showcase";
import { mediaListParts } from "../components/media-list-parts";
import { mediaListOrganisms } from "./media-list";
import { featureShowcaseOrganisms } from "./feature-showcase";
import { storyTabsParts } from "../components/story-tabs-parts";
import { storyTabsOrganisms } from "./story-tabs";
import { landmarkParts } from "../components/landmarks";

export const allOrganisms = [
  pricingCard, ...siteOrganisms, ...landingOrganisms, ...pricingOrganisms, ...showcaseOrganisms, ...navigationOrganisms, ...workspaceOrganisms,
  ...guideOrganisms, ...signupOrganisms, ...marketingOrganisms, ...commerceOrganisms, ...contentOrganisms, ...templateOrganisms,
  ...promoOrganisms, ...accountOrganisms, ...dashboardOrganisms, ...checkoutParts, ...shopParts, ...storefrontOrganisms, ...deliveryOrganisms,
  ...checkoutOrganisms, ...peopleParts, ...workParts, ...peopleOrganisms, ...workOrganisms, ...shellParts, ...shellOrganisms,
  ...heroSplitParts, ...heroSplitOrganisms, ...faqParts, ...faqSplitOrganisms,
  ...ctaProofParts, ...ctaProofOrganisms, ...quoteSplitParts, ...quoteSplitOrganisms,
  ...postSplitParts, ...postSplitOrganisms, ...footerSplitParts, ...footerSplitOrganisms,
  ...featureSplitParts, ...featureSplitOrganisms, ...pageTrailParts, ...pageTrailOrganisms,
  ...postShowcaseParts, ...postShowcaseOrganisms, ...mediaListParts, ...mediaListOrganisms,
  ...featureShowcaseOrganisms, ...storyTabsParts, ...storyTabsOrganisms, ...landmarkParts
];

// every organism that holds a landmark takes `landmarkLabel` (authoring/landmarks.ts); run once, before any page composes them
withLandmarkLabels([...allOrganisms, ...parts, ...patterns, ...framePatterns]);
dropDefaultProps([...allOrganisms, ...parts, ...patterns, ...framePatterns]);
