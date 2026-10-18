// The URL as a reactive port for Svelte: the hash store of the app runtime, mirrored into runes.
import { createHashStore, type UrlPort } from "./core";

class SvelteUrl implements UrlPort {
  path = $state("");
  query = $state<Record<string, string>>({});
  readonly #store = createHashStore();

  constructor() {
    this.#sync();
    this.#store.subscribe(() => this.#sync());
  }

  #sync(): void {
    const s = this.#store.getSnapshot();
    this.path = s.path;
    this.query = s.query;
  }

  go(path: string, query?: Record<string, string | undefined>): void {
    this.#store.go(path, query);
  }
}

export const url: UrlPort = new SvelteUrl();
