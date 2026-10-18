// Self-test fixture of the rules group, detector dynamic-tag (violating): Solid's Dynamic picks the tag at run time.
import { Dynamic } from "solid-js/web";
import { Block } from "@ui8kit/solid-ui";
import { ui } from "@ui8kit/app-shared/content";

export function Fixture({ level = 2 }) {
  return (
    <Block tag="section">
      <Dynamic component={level === 1 ? "h1" : "h2"}>{ui.title}</Dynamic>
    </Block>
  );
}
