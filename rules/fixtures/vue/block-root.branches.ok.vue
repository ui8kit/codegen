<!-- Self-test fixture of the rules group, detector block-root, case branches (clean). -->
<script setup lang="ts">
import { Block, Stack, Text } from "@ui8kit/vue-ui";
import { ui } from "@ui8kit/app-shared/content";
const props = defineProps<{ open?: boolean; items: string[] }>();
void props;
</script>

<template>
  <Block v-if="open" tag="section">
    <Text>{{ ui.title }}</Text>
  </Block>
  <!-- a comment does not break the chain -->
  <Block v-else-if="items.length" tag="aside">
    <Text>{{ ui.title }}</Text>
  </Block>
  <Block v-else tag="section">
    <Text>{{ ui.title }}</Text>
  </Block>
</template>
