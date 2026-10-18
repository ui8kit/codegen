<!-- Self-test fixture of the rules group, detector block-root, case siblings (violating). -->
<script setup lang="ts">
import { Block, Stack, Text } from "@ui8kit/vue-ui";
import { ui } from "@ui8kit/app-shared/content";
const props = defineProps<{ open?: boolean; items: string[] }>();
void props;
</script>

<template>
  <Block tag="section">
    <Text>{{ ui.title }}</Text>
  </Block>
  <Block tag="aside">
    <Text>{{ ui.title }}</Text>
  </Block>
</template>
