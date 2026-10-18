// Files that still exceed the readability limits (audit-rules.ts READABILITY), with their numbers today. Lower an entry when a file
// gets better and delete it when the file is within the limits; `bun xgen/check/tools/readability-allow.ts` prints the current table.
export interface Measure { lines?: number; long?: number; bytes?: number; props?: number }
/** an allowance names its reason: a file that is only waiting for a split has no place here */
export type Allowance = Measure & { why: string };
export const HTML_ATTRS = "an HTML-attribute primitive: its props mirror the attributes of the native element, so grouping them would hide the platform API";

export const READABILITY_ALLOW: Record<string, Allowance> = {
  "button": { props: 14, why: HTML_ATTRS },
  "image": { props: 16, why: HTML_ATTRS },
  "input": { props: 15, why: HTML_ATTRS },
};
