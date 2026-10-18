#!/usr/bin/env bash
# Pre-push audit: the commits of the branch must not carry private/, shots/, .fig, design-kit assets, secrets or server addresses.
# Usage: xgen-audit [base-ref]   (bin of @ui8kit/xgen-tooling, default origin/main); from the root: bun run audit:push
# The Lucide icon data (public, ISC) is the one thing left out of the secret scan: SVG path numbers look like addresses.
# base: the last pushed state of this branch; the empty tree before the first push
if [ -n "$1" ]; then base="$1"; elif git rev-parse -q --verify origin/main >/dev/null; then base="origin/main"; else base=$(git hash-object -t tree -w /dev/null); fi
bad=$(git diff --name-only "$base"..HEAD | grep -iE '(^|/)(private|shots|\.manual)/|\.fig$|(^|/)public/p/|\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|fig)$|\.env|\.pem$|\.key$|id_rsa' || true)
sec=$(git diff "$base"..HEAD -- . ':(top,exclude)packages/tooling/bin/audit.sh' ':(top,exclude)xgen/specs/assets/lucide-icons.json' ':(top,exclude)packages/*/ui/src/primitives/lucide-icon/lucide-icons.ts' ':(top,exclude)packages/templ/ui/ui/lucide-icon/lucide_icons.go' ':(top,exclude)packages/twig/ui/ui/lucide-icon/lucide-icons.json' ':(top,exclude)packages/jinja2/ui/ui/lucide-icon/lucide-icons.json' ':(top,exclude)packages/latte/ui/ui/lucide-icon/lucide-icons.json' | grep -E '^\+' | grep -v '^+++' | grep -iE 'BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{20,}|github_pat_|sk-[A-Za-z0-9]{20,}|ssh [a-z@]|(^|[^0-9.])([0-9]{1,3}\.){3}[0-9]{1,3}([^0-9.]|$)|[a-z0-9]+-vps\b' | grep -v '127\.0\.0\.1' || true)
if [ -n "$bad" ] || [ -n "$sec" ]; then echo "AUDIT FAILED"; echo "$bad"; echo "$sec" | cut -c1-120; exit 1; fi
echo "audit ok: $(git diff --name-only "$base"..HEAD | wc -l) files, no private/shots/.fig/public/p, no secrets or addresses"
