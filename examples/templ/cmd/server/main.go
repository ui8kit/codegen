package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	templpreview "github.com/ui8kit/codegen-examples/templ"
)

func main() {
	addr := envOr("ADDR", "127.0.0.1:8080")
	staticDir := filepath.Join(examplesRoot(), "web", "static")

	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		if err := templpreview.Page().Render(r.Context(), w); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	})
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(staticDir))))

	log.Printf("codegen welcome (templ) http://%s/", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func examplesRoot() string {
	dir, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "package.json")); err == nil {
			if _, err := os.Stat(filepath.Join(dir, "web", "static")); err == nil {
				return dir
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			log.Fatal("examples root not found")
		}
		dir = parent
	}
}
