<!-- Hand-written: Slot has no spec (React-only helper), so `bun run docs` does not touch this page. -->

# Slot (React only)

`Slot` merges its props onto its single child element. It powers `asChild` on Box, Text and
Button in React; other runtimes have no equivalent (use `<Name>Classes` helpers instead).

File: `{dir}/ui/slot/slot.tsx` (installed with the React primitives that need it).

## Behaviour

- Renders its first child, which must be a valid React element (otherwise renders nothing); the
  child's type replaces the primitive's element.
- `className`: `cn(primitiveClasses, childClassName)` (clsx + tailwind-merge), so the child's
  classes win on conflicts.
- `on*` handlers present on both are composed: child handler first, then the primitive's.
- Other props: the primitive's (slot's) value overrides the child's.
- Refs are merged (forwarded ref + child's own ref).

## Usage

```tsx
import { Button } from "./ui/button/button";
import { Link as RouterLink } from "react-router-dom";

<Button asChild className="bg-primary text-primary-foreground">
  <RouterLink to="/docs">Docs</RouterLink>
</Button>
```

Renders the router's `<a>` with the Button's classes and attributes.

---

[Docs index](../README.md) · [Contract](../contract.md)
