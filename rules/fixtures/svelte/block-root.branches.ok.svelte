<script lang="ts">
  // Self-test fixture of the rules group, detector block-root, case branches (clean).
  import { Block, Stack, Text } from "@ui8kit/svelte-ui";
  import { ui } from "@ui8kit/app-shared/content";
  let { open = false, items = [] as string[] } = $props();
</script>

{#if open}
  <Block tag="section">
    <Text>{ui.title}</Text>
  </Block>
{:else if items.length}
  <Block tag="aside">
    <Text>{ui.title}</Text>
  </Block>
{:else}
  <Block tag="section">
    <Text>{ui.title}</Text>
  </Block>
{/if}
