<!-- The outlet of the host frame: renders the screen chunk behind a loader. -->
<script setup lang="ts">
import { defineAsyncComponent, type Component } from "vue";
import type { UrlPort } from "./core";

const { load, url } = defineProps<{ load: () => Promise<{ default: Component }>; url: UrlPort }>();
const Screen = defineAsyncComponent(load);
</script>

<template>
  <Screen :url="url" />
</template>
