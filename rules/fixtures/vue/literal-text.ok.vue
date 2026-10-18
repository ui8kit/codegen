<!-- Self-test fixture of the rules group, detector literal-text (clean). -->
<script setup lang="ts">
import { Block, Box, Button, Inline, Input, Text, Title } from "@ui8kit/vue-ui";
import { ui } from "@ui8kit/app-shared/content";
const props = defineProps<{ open?: boolean; ok?: boolean; level?: 1 | 2; tag?: string }>();
const toggle = (): void => {};
void props;
</script>

<template>
  <Block tag="section">
    <Text>{{ ui.save }}</Text>
    <Input :placeholder="ui.name" />
    <Text>{{ ok ? ui.yes : ui.no }}</Text>
  </Block>
</template>
