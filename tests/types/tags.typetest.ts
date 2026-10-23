/**
 * Type-level contract (checked by `typecheck:generated`, never executed):
 * polymorphic `tag` accepts HTML5 element names only.
 */

import type { BoxProps } from "../../generated/ui/box/box";
import type { TextProps } from "../../generated/ui/text/text";
import type { BoxBaseProps } from "../../generated/ui/box/box.shared";
import type { TextBaseProps } from "../../generated/ui/text/text.shared";
import type { BoxElementProps } from "../../generated/ui/box/box.wc";
import type { ImageBaseProps } from "../../generated/ui/image/image.shared";
import type { IconSize } from "../../generated/ui/icon/icon.shared";

export const okBox: BoxProps = { tag: "section" };
export const okTable: BoxBaseProps = { tag: "table" };
export const okText: TextProps = { tag: "h2" };
export const okWc: BoxElementProps = { tag: "nav" };
export const okSize: IconSize = "md";
export const okImage: ImageBaseProps = { alt: "" };

// @ts-expect-error layout vocabulary is not a tag
export const badStack: BoxProps = { tag: "stack" };
// @ts-expect-error layout vocabulary is not a tag
export const badBlock: BoxBaseProps = { tag: "block" };
// @ts-expect-error arbitrary strings are rejected
export const badDivv: BoxElementProps = { tag: "divv" };
// @ts-expect-error headings are Text tags, not Box tags
export const badHeading: BoxBaseProps = { tag: "h1" };
// @ts-expect-error title is not an HTML text tag here
export const badTitle: TextBaseProps = { tag: "title" };
// @ts-expect-error size tokens are a closed set
export const badSize: IconSize = "2.5";
// @ts-expect-error alt is required
export const badImage: ImageBaseProps = {};
