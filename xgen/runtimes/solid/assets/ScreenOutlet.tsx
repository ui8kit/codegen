// The outlet of the host frame: renders the screen chunk behind a loader (one lazy component per loader, cached).
// A screen reads its URL once, as a Solid component runs once: a new URL renders the screen again (keyed), and the
// focused control (by data-testid or id) gets the focus and the caret back, so typing in a search box goes on.
import { lazy, Show, Suspense, type Accessor, type Component, type JSX } from "solid-js";
import type { UrlPort } from "./core";

export type ScreenModule = { default: Component<{ url: UrlPort }> };
type Loader = () => Promise<ScreenModule>;

const cache = new Map<Loader, Component<{ url: UrlPort }>>();

function keepFocus(): void {
  const el = document.activeElement as HTMLInputElement | null;
  const id = el?.getAttribute("data-testid") ?? el?.id;
  if (!el || !id || el === document.body) return;
  const attr = el.hasAttribute("data-testid") ? "data-testid" : "id";
  const caret = typeof el.selectionStart === "number" ? [el.selectionStart, el.selectionEnd ?? el.selectionStart] : undefined;
  queueMicrotask(() => {
    const next = document.querySelector<HTMLInputElement>(`[${attr}="${CSS.escape(id)}"]`);
    if (!next || next === document.activeElement) return;
    next.focus();
    if (caret) try { next.setSelectionRange(caret[0]!, caret[1]!); } catch { /* not a text field */ }
  });
}

export function ScreenOutlet(props: { load: Loader; url: Accessor<UrlPort> }): JSX.Element {
  let Screen = cache.get(props.load);
  if (!Screen) { Screen = lazy(props.load); cache.set(props.load, Screen); }
  const S = Screen;
  let first = true;
  const url = (): UrlPort => { const u = props.url(); if (!first) keepFocus(); first = false; return u; };
  return <Suspense fallback={null}><Show when={url()} keyed>{(u) => <S url={u} />}</Show></Suspense>;
}
