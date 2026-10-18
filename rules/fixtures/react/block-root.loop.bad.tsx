// Self-test fixture of the rules group, detector block-root, case loop (violating).
import { Block, Stack, Text } from "@ui8kit/react-ui";
import { ui } from "@ui8kit/app-shared/content";

export function Fixture({ open = false, items = [] as string[] }) {
  return (
    <>
      {items.map((item) => (
        <Block key={item} tag="section">
          <Text>{item}</Text>
        </Block>
      ))}
    </>
  );
}
