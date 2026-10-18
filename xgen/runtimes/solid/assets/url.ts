// The URL as a port for Solid: the hash store of the app runtime read through a signal.
import { createSignal, onCleanup, type Accessor } from "solid-js";
import { createHashStore, type UrlPort } from "./core";

const store = createHashStore();

export function useUrl(): Accessor<UrlPort> {
  const [snapshot, setSnapshot] = createSignal(store.getSnapshot());
  onCleanup(store.subscribe(() => setSnapshot(store.getSnapshot())));
  return () => ({ ...snapshot(), go: store.go });
}
