// Self-test fixture of the rules group, detector block-root, case branches (clean): Show and Switch/Match are exclusive branches.
import { Match, Show, Switch } from "solid-js";
import { Block, Text } from "@ui8kit/solid-ui";
import { ui } from "@ui8kit/app-shared/content";

export function Fixture({ open = false, wide = false, items = [] as string[] }) {
  return (
    <Show
      when={items.length}
      fallback={
        <Block tag="aside">
          <Text>{ui.title}</Text>
        </Block>
      }
    >
      <Switch fallback={<Block tag="div"><Text>{ui.title}</Text></Block>}>
        <Match when={open}>
          <Block tag="section">
            <Text>{ui.title}</Text>
          </Block>
        </Match>
        <Match when={wide}>
          <Block tag="aside">
            <Text>{ui.title}</Text>
          </Block>
        </Match>
      </Switch>
    </Show>
  );
}
