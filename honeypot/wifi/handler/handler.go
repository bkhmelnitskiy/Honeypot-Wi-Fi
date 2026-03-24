package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/bkhmelnitskiy/Honeypot-Wi-Fi/honeypot/wifi/dbus"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	dbus *dbus.Conn
}

func New(dbus *dbus.Conn) *Handler {
	return &Handler{dbus}
}

func (h *Handler) GetInterfaces(w http.ResponseWriter, r *http.Request) {
	infs, err := h.dbus.GetInterfaces()
	if err != nil {
		fmt.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(infs)
}

func getIDParam(r *http.Request, name string) (int, bool) {
	str := chi.URLParam(r, name)
	id, err := strconv.Atoi(str)
	if err != nil {
		return 0, false
	}
	return id, true
}

func (h *Handler) GetInterface(w http.ResponseWriter, r *http.Request) {
	id, ok := getIDParam(r, "interface")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	inf, err := h.dbus.GetInterface(id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(inf)
}

func (h *Handler) ScanInterface(w http.ResponseWriter, r *http.Request) {
	id, ok := getIDParam(r, "interface")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	ok, err := h.dbus.ScanInterface(id)
	if errors.Is(err, dbus.ErrAlreadyScanning) {
		w.WriteHeader(http.StatusTooManyRequests)
		return
	} else if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	type response struct {
		Ok bool `json:"ok"`
	}
	json.NewEncoder(w).Encode(response{ok})
}

func (h *Handler) GetInterfaceBSSs(w http.ResponseWriter, r *http.Request) {
	interfaceID, ok := getIDParam(r, "interface")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	bsss, err := h.dbus.GetBSSs(interfaceID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(bsss)
}

func (h *Handler) GetInterfaceBSS(w http.ResponseWriter, r *http.Request) {
	interfaceID, ok := getIDParam(r, "interface")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	id, ok := getIDParam(r, "bss")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	bss, err := h.dbus.GetBSS(interfaceID, id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(bss)
}
