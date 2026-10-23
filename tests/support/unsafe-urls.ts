/**
 * Unsafe URL edge cases (javascript:, vbscript:, data:; obfuscated with case and control chars), shared by the server
 * and JS parity suites. Contract: the attribute is omitted (named URL props and URL keys of Attrs) in every runtime,
 * React included (no React placeholder URL), so all runtimes are compared with React.
 */
type C = { props: Record<string, unknown>; reactProps?: Record<string, unknown> };
/** React (and the other JS runtimes) take Attrs entries as rest props */
const c = (props: Record<string, unknown>): C => {
  const { Attrs, ...rest } = props as { Attrs?: Record<string, unknown> };
  return Attrs ? { props, reactProps: { ...rest, ...Attrs } } : { props };
};

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
