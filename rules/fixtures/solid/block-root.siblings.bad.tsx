// Self-test fixture of the rules group, detector block-root, case siblings (violating): a Block beside a Show with another Block.
import { Show } from "solid-js";
import { Block, Text } from "@ui8kit/solid-ui";
import { ui } from "@ui8kit/app-shared/content";

export function Fixture({ open = false }) {
  return (
    <>
      <Block tag="section">
        <Text>{ui.title}</Text>
      </Block>
      <Show when={open}>
        <Block tag="aside">
          <Text>{ui.title}</Text>
        </Block>
      </Show>
    </>
  );
}
