package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/bkhmelnitskiy/Honeypot-Wi-Fi/honeypot/wifi/dbus"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	dbus *dbus.Conn
}

func New(dbus *dbus.Conn) *Handler {
	return &Handler{dbus}
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Add("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func (h *Handler) GetInterfaces(w http.ResponseWriter, r *http.Request) {
	infs, err := h.dbus.GetInterfaces()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	writeJSON(w, infs)
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
	id, ok := getIDParam(r, "interface-id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	inf, err := h.dbus.GetInterface(id)
	if err != nil {
		if errors.Is(err, dbus.ErrNotFound) {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}
	writeJSON(w, inf)
}

func (h *Handler) ScanInterface(w http.ResponseWriter, r *http.Request) {
	id, ok := getIDParam(r, "interface-id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	ok, err := h.dbus.ScanInterface(id)
	if err != nil {
		if errors.Is(err, dbus.ErrNotFound) {
			w.WriteHeader(http.StatusNotFound)
		} else if errors.Is(err, dbus.ErrAlreadyScanning) {
			w.WriteHeader(http.StatusConflict)
		} else if errors.Is(err, dbus.ErrTimeout) {
			w.WriteHeader(http.StatusGatewayTimeout)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}
	type response struct {
		Ok bool `json:"ok"`
	}
	writeJSON(w, response{ok})
}

func (h *Handler) CurrentNetwork(w http.ResponseWriter, r *http.Request) {
	interfaceID, ok := getIDParam(r, "interface-id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	n, err := h.dbus.CurrentNetwork(interfaceID)
	if err != nil {
		if errors.Is(err, dbus.ErrNotFound) || errors.Is(err, dbus.ErrNotConnected) {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}
	writeJSON(w, n)
}

func (h *Handler) ConnectNetwork(w http.ResponseWriter, r *http.Request) {
	interfaceID, ok := getIDParam(r, "interface-id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	mime := strings.ToLower(
		strings.TrimSpace(
			strings.Split(r.Header.Get("Content-Type"), ";")[0],
		),
	)
	if mime != "application/json" {
		w.WriteHeader(http.StatusUnsupportedMediaType)
		return
	}
	type request struct {
		Config map[string]any `json:"config"`
	}
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var body request
	var err error
	if err = dec.Decode(&body); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err = h.dbus.ConnectNetwork(interfaceID, body.Config); err != nil {
		if errors.Is(err, dbus.ErrNotFound) {
			w.WriteHeader(http.StatusNotFound)
		} else if errors.Is(err, dbus.ErrAlreadyConnected) || errors.Is(err, dbus.ErrAlreadyConnecting) {
			w.WriteHeader(http.StatusConflict)
		} else if errors.Is(err, dbus.ErrInvalidNetworkConfig) {
			w.WriteHeader(http.StatusBadRequest)
		} else if errors.Is(err, dbus.ErrTimeout) {
			w.WriteHeader(http.StatusGatewayTimeout)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DisconnectNetwork(w http.ResponseWriter, r *http.Request) {
	interfaceID, ok := getIDParam(r, "interface-id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := h.dbus.DisconnectNetwork(interfaceID); err != nil {
		if errors.Is(err, dbus.ErrNotFound) || errors.Is(err, dbus.ErrNotConnected) {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetBSSs(w http.ResponseWriter, r *http.Request) {
	interfaceID, ok := getIDParam(r, "interface-id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	bsss, err := h.dbus.GetBSSs(interfaceID)
	if err != nil {
		if errors.Is(err, dbus.ErrNotFound) {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}
	writeJSON(w, bsss)
}

func (h *Handler) GetBSS(w http.ResponseWriter, r *http.Request) {
	interfaceID, ok := getIDParam(r, "interface-id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	id, ok := getIDParam(r, "bss-id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	bss, err := h.dbus.GetBSS(interfaceID, id)
	if err != nil {
		if errors.Is(err, dbus.ErrNotFound) {
			w.WriteHeader(http.StatusNotFound)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
		return
	}
	writeJSON(w, bss)
}
