package uiutils

import (
	"strings"
	"testing"
)

func TestMergeTailwindLastWins(t *testing.T) {
	got := Cn("flex flex-col gap-6 rounded-xl py-6 px-6", "gap-0 overflow-hidden rounded py-0")
	want := "flex flex-col px-6 gap-0 overflow-hidden rounded py-0"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestMergePaddingShorthand(t *testing.T) {
	got := Cn("grid items-start gap-1.5 px-6", "relative m-0 flex flex-row items-center justify-between border-b p-2")
	if !containsAll(got, "relative", "m-0", "flex", "flex-row", "items-center", "justify-between", "border-b", "p-2") {
		t.Fatalf("missing header overrides: %q", got)
	}
	if containsToken(got, "grid") || containsToken(got, "px-6") {
		t.Fatalf("stale header utilities remain: %q", got)
	}
}

func containsAll(s string, parts ...string) bool {
	for _, part := range parts {
		if !containsToken(s, part) {
			return false
		}
	}
	return true
}

func containsToken(s, token string) bool {
	for _, part := range strings.Fields(s) {
		if part == token {
			return true
		}
	}
	return false
}

func TestMergeRingOffsetKeepsRingColor(t *testing.T) {
	cases := map[string]string{
		"ring-offset-2 ring-ring":                 "ring-offset-2 ring-ring",
		"ring-2 ring-offset-2 ring-ring":          "ring-2 ring-offset-2 ring-ring",
		"ring-offset-2 ring-offset-4":             "ring-offset-4",
		"ring-offset-background ring-offset-card": "ring-offset-card",
		"ring-ring ring-offset-background ring-2": "ring-ring ring-offset-background ring-2",
	}
	for in, want := range cases {
		if got := Cn(in); got != want {
			t.Fatalf("Cn(%q) = %q want %q", in, got, want)
		}
	}
}

func TestMergeObjectAndAspect(t *testing.T) {
	cases := [][2]string{
		{"object-cover object-center object-contain", "object-center object-contain"},
		{"object-center object-top", "object-top"},
		{"aspect-auto aspect-video", "aspect-video"},
	}
	for _, c := range cases {
		if got := Cn(c[0]); got != c[1] {
			t.Fatalf("Cn(%q) = %q want %q", c[0], got, c[1])
		}
	}
}
