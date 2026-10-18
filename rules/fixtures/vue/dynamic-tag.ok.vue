<!-- Self-test fixture of the rules group, detector dynamic-tag (clean). -->
<script setup lang="ts">
import { Block, Box, Button, Inline, Input, Text, Title } from "@ui8kit/vue-ui";
import { ui } from "@ui8kit/app-shared/content";
const props = defineProps<{ open?: boolean; ok?: boolean; level?: 1 | 2; tag?: string }>();
const toggle = (): void => {};
void props;
</script>

<template>
  <Block tag="section">
    <Title :level="level">{{ ui.title }}</Title>
  </Block>
</template>
