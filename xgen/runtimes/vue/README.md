# @ui8kit/xgen-runtime-vue

Vue 3 emitter (SFC, `<script setup lang="ts">`): bricks, organisms, screens, app scaffold.

Part of xgen (see `../README.md` and `../../README.md`). Self-contained: depends only on other `@ui8kit/xgen-*` packages. Tests: `bun test`.

- `src/emit.ts`: one `.vue` file per part: the variant tables and the props type in a plain `<script>`, the component in `<script setup>` (typed `defineProps` with reactive destructure, `class` as a prop, free attributes through `useAttrs()`, the default slot, `<component :is>` for resolved tags).
- `src/view.ts`: organisms and screens through the shared walker of runtimes/core with a Vue `Syntax`: `v-if` / `v-for` on the element of a branch (a `<template>` around several nodes), scoped slots, `defineEmits`, `computed`.
- `src/template.ts`: the brace form of the walker in Vue text (`name={expr}` -> `:name="expr"`, string literals in single quotes).
- `src/app.ts`: the host app (Vite, `@vitejs/plugin-vue`), screens loaded with `defineAsyncComponent`; `assets/url.ts` is the reactive URL port.
