// Self-test fixture of the rules group, detector literal-text (violating).
import { Block, Box, Button, Inline, Input, Text, Title } from "@ui8kit/react-ui";
import { ui } from "@ui8kit/app-shared/content";

export function Fixture({ open = false, ok = true, level = 2, toggle = () => {} }) {
  const Tag = level === 1 ? "h1" : "h2";
  void Tag;
  return (
    <Block tag="section">
      <Text>Save changes</Text>
      <Input placeholder="Your name" />
      <Text>{ok ? "Yes" : "No"}</Text>
    </Block>
  );
}
