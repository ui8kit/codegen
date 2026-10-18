// Self-test fixture of the rules group, detector block-root, case nested (violating).
import { Block, Stack, Text } from "@ui8kit/react-ui";
import { ui } from "@ui8kit/app-shared/content";

export function Fixture({ open = false, items = [] as string[] }) {
  return (
    <Block tag="section">
      <Block tag="aside">
        <Text>{ui.title}</Text>
      </Block>
    </Block>
  );
}
