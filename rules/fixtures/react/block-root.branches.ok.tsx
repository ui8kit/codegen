// Self-test fixture of the rules group, detector block-root, case branches (clean).
import { Block, Stack, Text } from "@ui8kit/react-ui";
import { ui } from "@ui8kit/app-shared/content";

export function Fixture({ open = false, items = [] as string[] }) {
  if (!items.length) return <Block tag="aside"><Text>{ui.title}</Text></Block>;
  return open ? (
    <Block tag="section">
      <Text>{ui.title}</Text>
    </Block>
  ) : (
    <Block tag="aside">
      <Text>{ui.title}</Text>
    </Block>
  );
}
