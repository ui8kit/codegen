<script lang="ts">
  // Self-test fixture of the rules group, detector literal-text (clean).
  import { Block, Box, Button, Inline, Input, Text, Title } from "@ui8kit/svelte-ui";
  import { ui } from "@ui8kit/app-shared/content";
  let { open = false, ok = true, level = 2, tag = "h2", toggle = () => {} } = $props();
</script>

<Block tag="section">
  <Text>{ui.save}</Text>
  <Input placeholder={ui.name} />
  <Text>{ok ? ui.yes : ui.no}</Text>
</Block>
