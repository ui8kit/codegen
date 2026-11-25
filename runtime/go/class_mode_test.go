package uiutils

import "testing"

func TestClassModeDefaultIsUtilities(t *testing.T) {
	if ClassMode() != ClassesUtilities {
		t.Fatalf("default mode %q", ClassMode())
	}
	if got := Cn("inline-flex px-2", "inline-block"); got != "px-2 inline-block" {
		t.Fatalf("utilities Cn merges: got %q", got)
	}
}

func TestClassModeSemanticJoinsCnAndMergesCompose(t *testing.T) {
	SetClassMode(ClassesSemantic)
	defer SetClassMode(ClassesUtilities)
	if ClassMode() != ClassesSemantic {
		t.Fatalf("mode %q", ClassMode())
	}
	if got := Cn(" ui-button  ui-button-outline ", "", "button-cart"); got != "ui-button ui-button-outline button-cart" {
		t.Fatalf("semantic Cn joins: got %q", got)
	}
	if got := Cn("p-2", "p-4"); got != "p-2 p-4" {
		t.Fatalf("semantic Cn does not merge: got %q", got)
	}
	icon := Variants{Base: "inline-flex shrink-0", Keys: []string{"size"},
		ByKey: map[string]map[string]string{"size": {"sm": "size-4"}}, Defaults: map[string]string{"size": "sm"}}
	if got := Compose(icon, nil, "inline-block shrink-0"); got != "size-4 inline-block shrink-0" {
		t.Fatalf("Compose merges in semantic mode: got %q", got)
	}
	SetClassMode("anything")
	if ClassMode() != ClassesUtilities {
		t.Fatal("unknown mode must fall back to utilities")
	}
}
