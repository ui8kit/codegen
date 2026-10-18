<!-- Self-test fixture of the rules group, detector block-root, case loop (violating). -->
<script setup lang="ts">
import { Block, Stack, Text } from "@ui8kit/vue-ui";
import { ui } from "@ui8kit/app-shared/content";
const props = defineProps<{ open?: boolean; items: string[] }>();
void props;
</script>

<template>
  <Block v-for="item in items" :key="item" tag="section">
    <Text>{{ item }}</Text>
  </Block>
</template>
