// Self-test fixture of the rules group, detector reactive-aria (clean).
import { Block, Box, Button, Inline, Input, Text, Title } from "@ui8kit/react-ui";
import { ui } from "@ui8kit/app-shared/content";

export function Fixture({ open = false, ok = true, level = 2, toggle = () => {} }) {
  const Tag = level === 1 ? "h1" : "h2";
  void Tag;
  return (
    <Block tag="section">
      <Button expanded={open} aria-label={ui.more} onClick={toggle}>{ui.more}</Button>
    </Block>
  );
}
