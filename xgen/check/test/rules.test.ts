// The rules group: every detector is proven on its fixtures in svelte, react and vue, and the committed baselines hold.
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { detect } from "../src/rules/detectors";
import { gate, selfTest, toIr } from "../src/rules";

const repo = join(import.meta.dir, "..", "..", "..");
const ctx = { blockRoot: true, rootsOnBlock: () => undefined };

describe("rules", () => {
  test("self-test fixtures: one violating and one clean file per detector and runtime", () => expect(selfTest(repo)).toEqual([]));
  test("the baselines hold", () => expect(gate(repo).problems).toEqual([]));
  test("the same violation is found in every runtime", () => {
    const svelte = detect(toIr("svelte", `<Block tag="section"><div aria-expanded={open}>Save</div></Block>`), ctx);
    const react = detect(toIr("react", `export function X() { return <Block tag="section"><div aria-expanded={open}>Save</div></Block>; }`), ctx);
    const vue = detect(toIr("vue", `<template><Block tag="section"><div :aria-expanded="open">Save</div></Block></template>`), ctx);
    const kinds = (f: { detector: string }[]): string[] => f.map((x) => x.detector).sort();
    expect(kinds(svelte)).toEqual(["literal-text", "raw-native-tag", "reactive-aria"]);
    expect(kinds(react)).toEqual(kinds(svelte));
    expect(kinds(vue)).toEqual(kinds(svelte));
  });
  test("a static ARIA value and a naming expression are allowed", () => {
    expect(detect(toIr("svelte", `<Block tag="section"><Button aria-pressed={false} aria-label={ui.save} /></Block>`), ctx)).toEqual([]);
  });
  test("block-root: exclusive branches may each hold one Block, a second Block on the same path fails in every runtime", () => {
    const msgs = (rt: "svelte" | "react" | "vue", src: string): string[] => detect(toIr(rt, src), ctx).filter((f) => f.detector === "block-root").map((f) => f.message.split(" (")[0]!);
    const clean = [
      msgs("svelte", `{#if a}<Block tag="section" />{:else}<Block tag="aside" />{/if}`),
      msgs("react", `export function X() { if (a) return <Block tag="aside" />; return b ? <Block tag="section" /> : <Block tag="aside" />; }`),
      msgs("vue", `<template><Block v-if="a" tag="section" /><Block v-else tag="aside" /></template>`),
    ];
    expect(clean).toEqual([[], [], []]);
    const twoInBranch = [
      msgs("svelte", `{#if a}<Block tag="section" /><Block tag="aside" />{:else}<Block tag="aside" />{/if}`),
      msgs("react", `export function X() { return a ? <><Block tag="section" /><Block tag="aside" /></> : <Block tag="aside" />; }`),
      msgs("vue", `<template><template v-if="a"><Block tag="section" /><Block tag="aside" /></template><Block v-else tag="aside" /></template>`),
    ];
    for (const m of twoInBranch) expect(m).toEqual(["2 Block in one render path"]);
    const afterIf = [
      msgs("svelte", `<Block tag="section" />{#if a}<Block tag="aside" />{/if}`),
      msgs("react", `export function X() { return <><Block tag="section" />{a && <Block tag="aside" />}</>; }`),
      msgs("vue", `<template><Block tag="section" /><Block v-if="a" tag="aside" /></template>`),
    ];
    for (const m of afterIf) expect(m).toEqual(["2 Block in one render path"]);
  });
});
