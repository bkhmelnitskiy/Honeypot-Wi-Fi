package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/bkhmelnitskiy/Honeypot-Wi-Fi/honeypot/wifi/dbus"
	"github.com/bkhmelnitskiy/Honeypot-Wi-Fi/honeypot/wifi/handler"
	"github.com/go-chi/chi/v5"
)

func run() error {
	bus, err := dbus.New()
	if err != nil {
		return err
	}
	h := handler.New(bus)
	r := chi.NewRouter()
	r.Route("/interface", func(r chi.Router) {
		r.Get("/", h.GetInterfaces)
		r.Route("/{interface-id}", func(r chi.Router) {
			r.Get("/", h.GetInterface)
			r.Get("/scan", h.ScanInterface)
			r.Route("/network", func(r chi.Router) {
				r.Get("/", h.CurrentNetwork)
				r.Post("/", h.ConnectNetwork)
				r.Delete("/", h.DisconnectNetwork)
			})
			r.Route("/bss", func(r chi.Router) {
				r.Get("/", h.GetBSSs)
				r.Get("/{bss-id}", h.GetBSS)
			})
		})
	})
	return http.ListenAndServe("localhost:3000", r)
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
}
