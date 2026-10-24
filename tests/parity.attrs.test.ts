/**
 * Attribute-rule parity (3.3.0) in all 9 real runtimes + the canonical renderer, against explicit expected HTML:
 *
 * 1. Precedence: the caller's Attrs (JS: rest props) win over a named attribute of the same name; the winning value is
 *    then checked — an unsafe URL is omitted, the named prop never comes back as a fallback.
 * 2. Empty values: a blank optional attribute (named prop or Attrs, "" or whitespace) is omitted, `href` included;
 *    `value` is the one nullable attribute (unset omits, "" renders value="").
 * 3. URLs: javascript:, vbscript:, data: are omitted; only `<img src>` allows data:image/(png|jpeg|gif|webp|avif|svg+xml).
 *    `srcset` is not a URL-checked attribute (forwarded as given).
 *
 * A missing toolchain (Go, PHP + Composer, Python + Jinja2) skips that runtime locally and fails with
 * UI8KIT_REQUIRE_ALL_RUNTIMES=1 (CI).
 */
import { describe, expect, it } from "bun:test";
import { normalizeHtml } from "./support/normalize";
import { RUNTIMES, renderEverywhere, toolchains, type AttrCase, type Runtime } from "./support/all-runtimes";

const REQUIRED = process.env["UI8KIT_REQUIRE_ALL_RUNTIMES"] === "1";
const SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
const PNG = "data:image/png;base64,iVBORw0KGgo=";

type Case = AttrCase & { id: string; expect: string };
const CASES: Case[] = [
  // 1. precedence: Attrs win, then the URL check (no fallback to the named prop)
  { id: "Link Href=/ok + Attrs href=javascript: → no href", part: "Link", props: { Href: "/ok", Attrs: { href: "javascript:alert(1)" } }, expect: "<a>Content</a>" },
  { id: "Link Href=javascript: + Attrs href=/ok → /ok", part: "Link", props: { Href: "javascript:alert(1)", Attrs: { href: "/ok" } }, expect: '<a href="/ok">Content</a>' },
  { id: "Link Href=/a + Attrs href=/b → /b (one attribute)", part: "Link", props: { Href: "/a", Attrs: { href: "/b" } }, expect: '<a href="/b">Content</a>' },
  { id: "Link Href=/ok + Attrs href='' → no href", part: "Link", props: { Href: "/ok", Attrs: { href: "" } }, expect: "<a>Content</a>" },
  { id: "Link External + Attrs target=_self → caller target", part: "Link", props: { Href: "/x", External: true, Attrs: { target: "_self" } }, expect: '<a href="/x" target="_self" rel="noopener noreferrer">Content</a>' },
  { id: "Button Attrs type=submit → caller type", part: "Button", props: { Attrs: { type: "submit" } }, expect: '<button type="submit">Content</button>' },
  { id: "Image Src=/a.png + Attrs src=vbscript: → no src", part: "Image", props: { Src: "/a.png", Alt: "", Attrs: { src: "vbscript:x" } }, expect: '<img alt="">' },
  // 2. empty values
  { id: "Link Href='' → no href", part: "Link", props: { Href: "" }, expect: "<a>Content</a>" },
  { id: "Link Href='  ' → no href", part: "Link", props: { Href: "  " }, expect: "<a>Content</a>" },
  { id: "Button Href='' → button", part: "Button", props: { Href: "" }, expect: '<button type="button">Content</button>' },
  { id: "Input ID/Name/Placeholder/AriaDescribedBy='' → omitted", part: "Input", props: { ID: "", Name: "", Placeholder: "", AriaDescribedBy: "" }, expect: '<input type="text">' },
  { id: "Input Attrs aria-describedby='' → omitted", part: "Input", props: { Attrs: { "aria-describedby": "" } }, expect: '<input type="text">' },
  { id: "Input Attrs data-x='' (undeclared) → kept", part: "Input", props: { Attrs: { "data-x": "" } }, expect: '<input type="text" data-x="">' },
  { id: "Image SrcSet/Sizes/Width='' → omitted", part: "Image", props: { Src: "/a.png", Alt: "a", SrcSet: "", Sizes: "", Width: "" }, expect: '<img src="/a.png" alt="a">' },
  { id: "Image Alt='' → alt='' (required)", part: "Image", props: { Src: "/a.png", Alt: "" }, expect: '<img src="/a.png" alt="">' },
  { id: "Input Value='' → value=''", part: "Input", props: { Value: "" }, expect: '<input type="text" value="">' },
  { id: "Input Value=' ' → value=' '", part: "Input", props: { Value: " " }, expect: '<input type="text" value=" ">' },
  { id: "Checkbox Value='' → value=''", part: "Checkbox", props: { Value: "" }, expect: '<input type="checkbox" value="">' },
  { id: "SelectOption Value='' → value=''", part: "SelectOption", props: { Value: "" }, expect: '<option value="">Content</option>' },
  // 3. URLs: data:image only in <img src>
  { id: "Image Src=data:image/svg+xml → kept", part: "Image", props: { Src: SVG, Alt: "" }, expect: `<img src="${SVG}" alt="">` },
  { id: "Image Src=data:image/png;base64 → kept", part: "Image", props: { Src: PNG, Alt: "" }, expect: `<img src="${PNG}" alt="">` },
  { id: "Image Src=' DATA:IMAGE/GIF;base64' → kept as given", part: "Image", props: { Src: " DATA:IMAGE/GIF;base64,R0lG", Alt: "" }, expect: '<img src=" DATA:IMAGE/GIF;base64,R0lG" alt="">' },
  { id: "Image Attrs src=data:image/webp → kept", part: "Image", props: { Alt: "", Attrs: { src: "data:image/webp;base64,UklGRg==" } }, expect: '<img alt="" src="data:image/webp;base64,UklGRg==">' },
  { id: "Image SrcSet=data:image/avif → kept", part: "Image", props: { Src: "/a.png", SrcSet: "data:image/avif;base64,AAAA 1x", Alt: "" }, expect: '<img src="/a.png" srcset="data:image/avif;base64,AAAA 1x" alt="">' },
  { id: "Image Src=data:image/bmp → omitted", part: "Image", props: { Src: "data:image/bmp;base64,Qk0=", Alt: "" }, expect: '<img alt="">' },
  { id: "Image Src=data:image/svg+xmlfoo → omitted", part: "Image", props: { Src: "data:image/svg+xmlfoo,x", Alt: "" }, expect: '<img alt="">' },
  { id: "Image Src=data:text/html → omitted", part: "Image", props: { Src: "data:text/html,<script>x</script>", Alt: "" }, expect: '<img alt="">' },
  { id: "Image Src=javascript: → omitted", part: "Image", props: { Src: "javascript:alert(1)", Alt: "" }, expect: '<img alt="">' },
  { id: "Link Href=data:image/png → omitted", part: "Link", props: { Href: PNG }, expect: "<a>Content</a>" },
  { id: "Link Attrs href=data:image/svg+xml → omitted", part: "Link", props: { Attrs: { href: SVG } }, expect: "<a>Content</a>" },
  { id: "Button Href=data:image/png → anchor without href", part: "Button", props: { Href: PNG }, expect: "<a>Content</a>" },
  { id: "Form Action=data:image/png → omitted", part: "Form", props: { Action: PNG }, expect: "<form>Content</form>" },
];

const missing: Partial<Record<Runtime, string>> = {
  ...(toolchains.templ ? {} : { templ: "Go" }),
  ...(toolchains.php ? {} : { twig: "PHP + Composer", latte: "PHP + Composer" }),
  ...(toolchains.jinja2 ? {} : { jinja2: "python3 + Jinja2" }),
};
const results = await renderEverywhere(CASES);

describe("attribute rules: precedence, empty values, URLs (all 9 runtimes)", () => {
  CASES.forEach((c, i) => {
    describe(c.id, () => {
      it("canonical", () => expect(normalizeHtml(results[i]!.canonical!)).toEqual(normalizeHtml(c.expect)));
      for (const rt of RUNTIMES) {
        const html = results[i]![rt];
        if (html === undefined) {
          if (REQUIRED) it(rt, () => { throw new Error(`${rt}: ${missing[rt]} not found (UI8KIT_REQUIRE_ALL_RUNTIMES=1)`); });
          else it.skip(`${rt} (no ${missing[rt]})`, () => {});
          continue;
        }
        it(rt, () => expect(normalizeHtml(html)).toEqual(normalizeHtml(c.expect)));
      }
    });
  });
  it("no duplicate attributes in any runtime output", () => {
    for (const r of results) for (const [rt, html] of Object.entries(r)) {
      const tag = /<[a-z]+([^>]*)>/.exec(html ?? "")?.[1] ?? "";
      const names = [...tag.matchAll(/\s([a-zA-Z-:]+)(?==|\s|\/|$)/g)].map((m) => m[1]!.toLowerCase());
      expect(new Set(names).size, `${rt}: ${html}`).toBe(names.length);
    }
  });
});
