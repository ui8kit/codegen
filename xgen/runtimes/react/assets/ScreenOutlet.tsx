// The outlet of the host frame: renders the screen chunk behind a loader (one lazy component per loader, cached).
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import type { UrlPort } from "./core";

export type ScreenModule = { default: ComponentType<{ url: UrlPort }> };
type Loader = () => Promise<ScreenModule>;

const cache = new Map<Loader, LazyExoticComponent<ComponentType<{ url: UrlPort }>>>();

export function ScreenOutlet({ load, url }: { load: Loader; url: UrlPort }) {
  let Screen = cache.get(load);
  if (!Screen) { Screen = lazy(load); cache.set(load, Screen); }
  return <Suspense fallback={null}><Screen url={url} /></Suspense>;
}
