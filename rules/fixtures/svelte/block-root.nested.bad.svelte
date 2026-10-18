<script lang="ts">
  // Self-test fixture of the rules group, detector block-root, case nested (violating).
  import { Block, Stack, Text } from "@ui8kit/svelte-ui";
  import { ui } from "@ui8kit/app-shared/content";
  let { open = false, items = [] as string[] } = $props();
</script>

<Block tag="section">
  <Block tag="aside">
    <Text>{ui.title}</Text>
  </Block>
</Block>
