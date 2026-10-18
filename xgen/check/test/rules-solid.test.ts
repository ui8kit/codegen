import { expect, test } from "bun:test";
import { toIr } from "../src/rules/index";

const kinds = (nodes: Array<{ kind: string; children?: unknown[] }>): string[] =>
  nodes.flatMap((n) => [n.kind, ...kinds((n.children ?? []) as Array<{ kind: string; children?: unknown[] }>)]);

test("solid: Show and Switch/Match are choices, For and Index are loops, Dynamic is a dynamic tag", () => {
  const src = `import { For, Index, Match, Show, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Block, Text } from "@ui8kit/solid-ui";
export function X(props: { a: boolean; xs: string[] }) {
  return (
    <Block>
      <Show when={props.a} fallback={<Text>b</Text>}><Text>a</Text></Show>
      <Switch><Match when={props.a}><Text>c</Text></Match></Switch>
      <For each={props.xs}>{(x) => <Text>{x}</Text>}</For>
      <Index each={props.xs}>{(x) => <Text>{x()}</Text>}</Index>
      <Dynamic component="h2">t</Dynamic>
    </Block>
  );
}`;
  const k = kinds(toIr("solid", src).nodes as never);
  expect(k.filter((x) => x === "choice").length).toBe(2);
  expect(k.filter((x) => x === "loop").length).toBe(2);
  expect(k).toContain("dynamic");
});

test("solid: a Switch brick of the kit (not from solid-js) stays a component", () => {
  const src = `import { Block, Switch } from "@ui8kit/solid-ui";
export function X() { return <Block><Switch name="n" /></Block>; }`;
  const k = kinds(toIr("solid", src).nodes as never);
  expect(k).not.toContain("choice");
  expect(k.filter((x) => x === "component").length).toBe(2);
});
