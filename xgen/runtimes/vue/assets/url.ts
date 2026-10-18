// The URL as a reactive port for Vue: the hash store of the app runtime, mirrored into a reactive object.
import { reactive } from "vue";
import { createHashStore, type UrlPort } from "./core";

const store = createHashStore();

export const url: UrlPort = reactive({ ...store.getSnapshot(), go: store.go });
store.subscribe(() => Object.assign(url, store.getSnapshot()));
