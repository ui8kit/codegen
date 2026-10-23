<?php

declare(strict_types=1);

namespace __NAMESPACE__;

/**
 * UI8Kit PHP runtime helpers used by the generated Twig and Latte templates.
 * One implementation of every decision-table primitive; mirrors
 * runtime/go/expr.go + utils.go and runtime/ts/expr.ts so all runtimes
 * resolve defaults identically. Variadic Go helpers take arrays here so
 * Twig and Latte call them with the same shape.
 */
final class Rt
{
    private static function s(mixed $v): string
    {
        return is_bool($v) ? ($v ? 'true' : 'false') : (string) ($v ?? '');
    }

    /** cn = clsx join + tailwind-merge conflict resolution (CnMerge, port of cn_merge.go). */
    public static function cn(array $classes): string
    {
        return CnMerge::merge(array_map([self::class, 's'], $classes));
    }

    /** Omit-if-empty attribute value: blank → null so the attribute is dropped. */
    public static function orNull(mixed $v): ?string
    {
        $s = self::s($v);
        return trim($s) === '' ? null : $s;
    }

    public static function isSetStr(mixed $v): bool
    {
        return trim(self::s($v)) !== '';
    }

    public static function defaultIfEmpty(mixed $v, string $fallback): string
    {
        $t = trim(self::s($v));
        return $t === '' ? $fallback : $t;
    }

    public static function oneOfOr(mixed $v, string $fallback, array $allowed): string
    {
        $t = trim(self::s($v));
        return in_array($t, $allowed, true) ? $t : $fallback;
    }

    public static function oneOfOrLower(mixed $v, string $fallback, array $allowed): string
    {
        return self::oneOfOr(strtolower(trim(self::s($v))), $fallback, $allowed);
    }

    /** Decision table: mapping[trim(v)] ?? fallback. */
    public static function mapOr(mixed $v, array $mapping, string $fallback): string
    {
        $k = trim(self::s($v));
        return array_key_exists($k, $mapping) ? (string) $mapping[$k] : $fallback;
    }

    public static function mapOrLower(mixed $v, array $mapping, string $fallback): string
    {
        return self::mapOr(strtolower(trim(self::s($v))), $mapping, $fallback);
    }

    /** Integer decision table: mapping[v] ?? fallback. */
    public static function intMapOr(mixed $v, array $mapping, string $fallback): string
    {
        $k = (int) ($v ?? 0);
        return array_key_exists($k, $mapping) ? (string) $mapping[$k] : $fallback;
    }

    /** ARIA state stringification: always 'true'/'false', never omitted. */
    public static function boolStr(mixed $v): string
    {
        return $v ? 'true' : 'false';
    }

    /** Concatenation of trimmed parts (icon Prefix + Name). */
    public static function concatTrim(array $parts): string
    {
        $out = '';
        foreach ($parts as $p) {
            $out .= trim(self::s($p));
        }
        return $out;
    }

    /** Returns tag when allowed for the group, otherwise fallback (tag groups: Tags::GROUPS). */
    public static function resolveTag(mixed $tag, string $fallback, string $group): string
    {
        $t = strtolower(trim(self::s($tag)));
        if ($t === '') {
            return $fallback;
        }
        return in_array($t, Tags::GROUPS[$group] ?? [], true) ? $t : $fallback;
    }

    /**
     * Merge recipe base, keyed variant selections, compound variants and tail
     * classes (Go Compose). Recipe shape is *.variants.json: base, keys,
     * defaults, byKey, compound. Unknown choices are silently dropped.
     */
    public static function compose(array $recipe, array $selection, array $extra = []): string
    {
        $parts = [];
        $base = trim((string) ($recipe['base'] ?? ''));
        if ($base !== '') {
            $parts[] = $base;
        }
        $pick = static function (string $key) use ($recipe, $selection): string {
            $choice = trim(self::s($selection[$key] ?? ''));
            return $choice !== '' ? $choice : trim((string) ($recipe['defaults'][$key] ?? ''));
        };
        foreach (($recipe['keys'] ?? []) as $key) {
            $choices = $recipe['byKey'][$key] ?? null;
            if ($choices === null) {
                continue;
            }
            $choice = $pick($key);
            if ($choice === '') {
                if (count($choices) > 0) {
                    throw new \LogicException("[compose] missing default for key \"$key\"");
                }
                continue;
            }
            $cls = $choices[$choice] ?? null;
            if ($cls !== null && trim((string) $cls) !== '') {
                $parts[] = (string) $cls;
            }
        }
        foreach (($recipe['compound'] ?? []) as $c) {
            $ok = true;
            foreach ($c as $k => $want) {
                if ($k === 'class') {
                    continue;
                }
                $ok = $ok && in_array($pick((string) $k), explode('|', (string) $want), true);
            }
            if ($ok && trim((string) ($c['class'] ?? '')) !== '') {
                $parts[] = (string) $c['class'];
            }
        }
        return self::cn([...$parts, ...$extra]);
    }

    /**
     * Attribute string for Twig templates. Computed attrs first, caller
     * attrs merged last so the caller wins. null/false omit, true prints a
     * bare boolean attribute, everything else stringifies and escapes.
     */
    private const URL_ATTRS = ['href', 'src', 'action', 'formaction', 'poster', 'cite', 'background', 'xlink:href'];

    /** URL attribute value: '' for javascript:, vbscript: and data: (ASCII whitespace/control chars removed, case-insensitive). */
    public static function safeUrl(mixed $v): string
    {
        $s = self::s($v);
        return preg_match('/^(javascript|vbscript|data):/', strtolower((string) preg_replace('/[\x00-\x20]/', '', $s))) ? '' : $s;
    }

    /** Passthrough URL attribute: null (omitted) for an unsafe scheme, else the value as given (null stays null). */
    public static function urlOrNull(mixed $v): ?string
    {
        if ($v === null) {
            return null;
        }
        $s = self::s($v);
        return $s !== '' && self::safeUrl($s) === '' ? null : $s;
    }

    /** Drops URL attributes with an unsafe URL (Latte n:attr maps, Twig attrs). */
    public static function safeAttrs(array $attrs): array
    {
        foreach ($attrs as $name => $value) {
            if (is_string($value) && $value !== '' && in_array(strtolower((string) $name), self::URL_ATTRS, true) && self::safeUrl($value) === '') {
                unset($attrs[$name]);
            }
        }
        return $attrs;
    }

    public static function attrs(array $attrs, array $rest = []): string
    {
        $out = '';
        foreach (self::safeAttrs(array_merge($attrs, $rest)) as $name => $value) {
            if ($value === null || $value === false) {
                continue;
            }
            if ($value === true) {
                $out .= ' ' . $name;
                continue;
            }
            $out .= ' ' . $name . '="' . htmlspecialchars(self::s($value), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '"';
        }
        return $out;
    }
}
