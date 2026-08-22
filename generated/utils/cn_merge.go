package uiutils

import (
	"strings"
	"unicode"
)

func mergeTailwind(classes ...string) string {
	var tokens []string
	for _, chunk := range classes {
		for _, part := range strings.Fields(chunk) {
			tokens = append(tokens, part)
		}
	}
	if len(tokens) == 0 {
		return ""
	}

	type item struct {
		token string
		keys  []string
	}
	kept := make([]item, 0, len(tokens))
	indexByKey := map[string]int{}

	for _, token := range tokens {
		keys := conflictKeys(token)
		if len(keys) > 0 {
			seen := map[int]struct{}{}
			for _, key := range keys {
				if i, ok := indexByKey[key]; ok {
					seen[i] = struct{}{}
				}
			}
			if len(seen) > 0 {
				next := kept[:0]
				remap := map[int]int{}
				for i, it := range kept {
					if _, drop := seen[i]; drop {
						continue
					}
					remap[i] = len(next)
					next = append(next, it)
				}
				kept = next
				for key, i := range indexByKey {
					if ni, ok := remap[i]; ok {
						indexByKey[key] = ni
					} else {
						delete(indexByKey, key)
					}
				}
			}
		}
		pos := len(kept)
		kept = append(kept, item{token: token, keys: keys})
		for _, key := range keys {
			indexByKey[key] = pos
		}
	}

	out := make([]string, 0, len(kept))
	for _, it := range kept {
		out = append(out, it.token)
	}
	return strings.Join(out, " ")
}

func conflictKeys(token string) []string {
	prefix, core := splitVariant(token)
	if core == "" {
		return nil
	}
	groups := utilityGroups(core)
	if len(groups) == 0 {
		return nil
	}
	keys := make([]string, 0, len(groups))
	for _, group := range groups {
		keys = append(keys, prefix+group)
	}
	return keys
}

func splitVariant(token string) (prefix, core string) {
	depth := 0
	cut := -1
	for i, r := range token {
		switch r {
		case '[':
			depth++
		case ']':
			if depth > 0 {
				depth--
			}
		case ':':
			if depth == 0 {
				cut = i
			}
		}
	}
	if cut == -1 {
		return "", strings.TrimPrefix(token, "!")
	}
	return token[:cut+1], strings.TrimPrefix(token[cut+1:], "!")
}

func utilityGroups(core string) []string {
	switch core {
	case "block", "inline", "inline-block", "inline-flex", "flex", "grid", "contents", "hidden":
		return []string{"display"}
	case "flex-row", "flex-col", "flex-row-reverse", "flex-col-reverse":
		return []string{"flex-direction"}
	case "static", "relative", "absolute", "fixed", "sticky":
		return []string{"position"}
	case "isolate", "isolation-auto":
		return []string{"isolation"}
	}

	if group, ok := prefixGroup(core, [][2]string{
		{"gap-x-", "gap-x"},
		{"gap-y-", "gap-y"},
		{"gap-", "gap"},
		{"items-", "align-items"},
		{"justify-", "justify-content"},
		{"self-", "align-self"},
		{"content-", "align-content"},
		{"overflow-", "overflow"},
		{"inset-x-", "inset-x"},
		{"inset-y-", "inset-y"},
		{"inset-", "inset"},
		{"min-w-", "min-width"},
		{"min-h-", "min-height"},
		{"max-w-", "max-width"},
		{"max-h-", "max-height"},
		{"shadow-", "shadow"},
		{"ring-", "ring"},
		{"rounded-", "rounded"},
		{"leading-", "leading"},
		{"tracking-", "tracking"},
		{"opacity-", "opacity"},
		{"z-", "z"},
		{"top-", "top"},
		{"right-", "right"},
		{"bottom-", "bottom"},
		{"left-", "left"},
	}); ok {
		return []string{group}
	}

	switch {
	case core == "border":
		return []string{"border-width"}
	case core == "rounded":
		return []string{"rounded"}
	case core == "shadow" || core == "shadow-none":
		return []string{"shadow"}
	case core == "grow" || strings.HasPrefix(core, "grow-") || core == "flex-1" || core == "flex-auto" || core == "flex-none" || core == "flex-initial":
		return []string{"flex-size"}
	case core == "shrink" || core == "shrink-0":
		return []string{"flex-shrink"}
	}

	if strings.HasPrefix(core, "size-") {
		return []string{"width", "height"}
	}
	if strings.HasPrefix(core, "w-") {
		return []string{"width"}
	}
	if strings.HasPrefix(core, "h-") {
		return []string{"height"}
	}

	if strings.HasPrefix(core, "p-") && !hasDirectionPrefix(core, "p") {
		return []string{"padding", "padding-x", "padding-y", "padding-t", "padding-r", "padding-b", "padding-l"}
	}
	if g, ok := spaceAxis(core, "p"); ok {
		return g
	}
	if strings.HasPrefix(core, "m-") && !hasDirectionPrefix(core, "m") {
		return []string{"margin", "margin-x", "margin-y", "margin-t", "margin-r", "margin-b", "margin-l"}
	}
	if g, ok := spaceAxis(core, "m"); ok {
		return g
	}

	if strings.HasPrefix(core, "bg-") {
		return []string{"bg"}
	}
	if isTextSize(core) {
		return []string{"text-size"}
	}
	if strings.HasPrefix(core, "text-") {
		return []string{"text-color"}
	}
	if strings.HasPrefix(core, "font-") && isFontWeight(core) {
		return []string{"font-weight"}
	}
	return nil
}

func prefixGroup(core string, prefixes [][2]string) (string, bool) {
	for _, pair := range prefixes {
		if strings.HasPrefix(core, pair[0]) {
			return pair[1], true
		}
	}
	return "", false
}

func hasDirectionPrefix(core, kind string) bool {
	for _, dir := range []string{"x-", "y-", "t-", "r-", "b-", "l-", "s-", "e-"} {
		if strings.HasPrefix(core, kind+dir) {
			return true
		}
	}
	return false
}

func spaceAxis(core, kind string) ([]string, bool) {
	switch {
	case strings.HasPrefix(core, kind+"x-"):
		return []string{kindName(kind) + "-x"}, true
	case strings.HasPrefix(core, kind+"y-"):
		return []string{kindName(kind) + "-y"}, true
	case strings.HasPrefix(core, kind+"t-"):
		return []string{kindName(kind) + "-t"}, true
	case strings.HasPrefix(core, kind+"r-"):
		return []string{kindName(kind) + "-r"}, true
	case strings.HasPrefix(core, kind+"b-"):
		return []string{kindName(kind) + "-b"}, true
	case strings.HasPrefix(core, kind+"l-"):
		return []string{kindName(kind) + "-l"}, true
	}
	return nil, false
}

func kindName(kind string) string {
	if kind == "p" {
		return "padding"
	}
	return "margin"
}

func isTextSize(core string) bool {
	switch core {
	case "text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl", "text-6xl", "text-7xl", "text-8xl", "text-9xl":
		return true
	}
	if strings.HasPrefix(core, "text-[") {
		rest := strings.TrimPrefix(core, "text-[")
		if rest == "" {
			return false
		}
		return unicode.IsDigit(rune(rest[0])) || rest[0] == '.'
	}
	return false
}

func isFontWeight(core string) bool {
	switch core {
	case "font-thin", "font-extralight", "font-light", "font-normal", "font-medium", "font-semibold", "font-bold", "font-extrabold", "font-black":
		return true
	}
	return false
}
