/**
 * Unsafe URL edge cases (javascript:, vbscript:, data:; obfuscated with case and control chars), shared by the server
 * parity suites. Canonical contract: the attribute is omitted (named URL props and URL keys of Attrs). React blocks
 * javascript: with its own placeholder URL, so these cases compare the servers with the canonical renderer only.
 */
const REACT = "React replaces a javascript: URL with its own placeholder; servers omit the attribute (canonical)";
type C = { props: Record<string, unknown>; canonicalOnly: string };
const c = (props: Record<string, unknown>): C => ({ props, canonicalOnly: REACT });

export const UNSAFE_URL_EDGES: Record<string, Record<string, C>> = {
  Link: {
    "unsafe href": c({ Href: "javascript:alert(1)" }),
    "obfuscated href": c({ Href: " JaVa\tScRiPt:alert(1)" }),
    "unsafe url keys in Attrs": c({ Href: "/ok", Attrs: { formaction: "vbscript:x", "data-x": "javascript:kept" } }),
  },
  Form: { "unsafe action": c({ Action: "javascript:alert(1)" }) },
  Image: { "unsafe src": c({ Src: "data:text/html,<script>x</script>", Alt: "a" }) },
  Button: { "unsafe href": c({ Href: "vbscript:msgbox(1)" }) },
};

/** merge into an EDGE table */
export function withUnsafeUrls<T extends Record<string, Record<string, unknown>>>(edge: T): T {
  const out: Record<string, Record<string, unknown>> = { ...edge };
  for (const [part, cases] of Object.entries(UNSAFE_URL_EDGES)) out[part] = { ...(out[part] ?? {}), ...cases };
  return out as T;
}
