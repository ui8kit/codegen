// The URL as a port for React: the hash store of the app runtime read through useSyncExternalStore.
import { useMemo, useSyncExternalStore } from "react";
import { createHashStore, type UrlPort } from "./core";

const store = createHashStore();

export function useUrl(): UrlPort {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return useMemo(() => ({ ...snapshot, go: store.go }), [snapshot]);
}
