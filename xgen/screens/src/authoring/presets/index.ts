// The layout presets and the helpers the authoring code reads them with: layoutOf("hero.band") is the class string of the hero band.
import { preset } from "../../build";
import { presetAt, type PresetSpec, type Value } from "../../ir";
import { defaultPreset } from "./default-preset";

export const presets: PresetSpec[] = [defaultPreset];

/** a preset value by its path; fails the build when the path does not exist, so a typo never reaches the output */
const reader = (p: PresetSpec) => (path: string): Value => {
  if (presetAt(p, path) === undefined) throw new Error(`preset ${p.name} has no value at "${path}"`);
  return preset(p.name, path);
};

/** default block geometry (landing blocks) */
export const layoutOf = reader(defaultPreset);
