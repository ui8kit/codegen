/** Twig runtime parity — real Twig engine via Composer vs React SSR + canonical renderer (see support/php-parity.ts). */
import { phpParitySuite } from "./support/php-parity";

await phpParitySuite("twig");
