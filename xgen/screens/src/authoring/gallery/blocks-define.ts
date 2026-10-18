import { makeDefine } from "./block-kit";
import { allOrganisms } from "../blocks/organisms";
import { framePatterns } from "../components/frames";
import { patterns } from "../components/patterns";
import { parts } from "../components/parts";

/** `define({...})` builds a block spec and its texts from a short definition */
export const define = makeDefine(allOrganisms, new Set([...parts, ...patterns, ...framePatterns].map((p) => p.name)));
