package dbus

import (
	"errors"
	"fmt"
	"net"
	"strconv"
	"strings"
	"sync"

	"github.com/godbus/dbus/v5"
)

const (
	serviceName = "fi.w1.wpa_supplicant1"
	servicePath = "/fi/w1/wpa_supplicant1"
)

type WPA struct {
	KeyMgmt  []string `json:"keyMgmt,omitempty"`
	Pairwise []string `json:"pairwise,omitempty"`
	Group    string   `json:"group,omitempty"`
}

type RSN struct {
	KeyMgmt   []string `json:"keyMgmt,omitempty"`
	Pairwise  []string `json:"pairwise,omitempty"`
	Group     string   `json:"group,omitempty"`
	MgmtGroup string   `json:"mgmtGroup,omitempty"`
}

type WPS struct {
	Type string `json:"type,omitempty"`
}

type BSS struct {
	ID        int    `json:"id"`
	BSSID     string `json:"bssid"`
	SSID      string `json:"ssid"`
	WPA       WPA    `json:"wpa"`
	RSN       RSN    `json:"rsn"`
	WPS       WPS    `json:"wps"`
	Privacy   bool   `json:"privacy"`
	Mode      string `json:"mode"`
	Frequency int    `json:"frequency"`
}

type Conn struct {
	inner    *dbus.Conn
	signal   chan *dbus.Signal
	scanning bool
	mutex    sync.Mutex
}

func New() (*Conn, error) {
	inner, err := dbus.SystemBus()
	if err != nil {
		return nil, err
	}
	signal := make(chan *dbus.Signal, 4)
	inner.Signal(signal)
	return &Conn{inner, signal, false, sync.Mutex{}}, nil
}

func (c *Conn) Close() error {
	return c.inner.Close()
}

type object struct {
	inner dbus.BusObject
	name  string
}

func makeServiceInterfaceName(suffix string) string {
	return fmt.Sprintf("%s.%s", serviceName, suffix)
}

func (c *Conn) newObject(name string, path dbus.ObjectPath) object {
	var n string
	if name != "" {
		n = makeServiceInterfaceName(name)
	} else {
		n = serviceName
	}
	return object{c.inner.Object(serviceName, path), n}
}

func (o object) resolve(name string) string {
	return fmt.Sprintf("%s.%s", o.name, name)
}

func (o object) property(name string, value any) error {
	return o.inner.StoreProperty(o.resolve(name), value)
}

func (o object) call(method string, args ...any) error {
	return o.inner.Call(o.resolve(method), 0, args...).Err
}

type Capabilities struct {
	Pairwise []string `json:"pairwise"`
	Group    []string `json:"group"`
	KeyMgmt  []string `json:"keyMgmt"`
	Protocol []string `json:"protocol"`
	AuthAlg  []string `json:"authAlg"`
	Scan     []string `json:"scan"`
	Modes    []string `json:"modes"`
}

type Interface struct {
	ID           int          `json:"id"`
	Name         string       `json:"name"`
	State        string       `json:"state"`
	Capabilities Capabilities `json:"capabilities"`
}

func getStrArray(m map[string]dbus.Variant, k string) []string {
	v := m[k].Value()
	if v == nil {
		return []string{}
	}
	return v.([]string)
}

func getIDFromPath(path dbus.ObjectPath) (int, error) {
	p := string(path)
	id, err := strconv.Atoi(p[strings.LastIndex(string(p), "/")+1:])
	return id, err
}

func (c *Conn) getInterface(path dbus.ObjectPath) (*Interface, error) {
	obj := c.newObject("Interface", path)
	var err error
	id, err := getIDFromPath(path)
	if err != nil {
		return nil, err
	}
	var capabilities map[string]dbus.Variant
	if err = obj.property("Capabilities", &capabilities); err != nil {
		return nil, err
	}
	var state string
	if err = obj.property("State", &state); err != nil {
		return nil, err
	}
	var name string
	if err = obj.property("Ifname", &name); err != nil {
		return nil, err
	}
	return &Interface{
		ID:    id,
		Name:  name,
		State: state,
		Capabilities: Capabilities{
			Pairwise: getStrArray(capabilities, "Pairwise"),
			Group:    getStrArray(capabilities, "Group"),
			KeyMgmt:  getStrArray(capabilities, "KeyMgmt"),
			Protocol: getStrArray(capabilities, "Protocol"),
			AuthAlg:  getStrArray(capabilities, "AuthAlg"),
			Scan:     getStrArray(capabilities, "Scan"),
			Modes:    getStrArray(capabilities, "Modes"),
		},
	}, nil
}

func (c *Conn) GetInterfaces() ([]*Interface, error) {
	obj := c.newObject("", servicePath)
	var interfaces []dbus.ObjectPath
	if err := obj.property("Interfaces", &interfaces); err != nil {
		return nil, err
	}
	infs := make([]*Interface, len(interfaces))
	for i, p := range interfaces {
		inf, err := c.getInterface(p)
		if err != nil {
			return nil, err
		}
		infs[i] = inf
	}
	return infs, nil
}

func makeInterfacePath(id int) dbus.ObjectPath {
	return dbus.ObjectPath(fmt.Sprintf("%s/Interfaces/%d", servicePath, id))
}

func (c *Conn) GetInterface(id int) (*Interface, error) {
	return c.getInterface(makeInterfacePath(id))
}

var ErrAlreadyScanning = errors.New("dbus: already scanning for available networks")

func (c *Conn) startScanInterface() error {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	if c.scanning {
		return ErrAlreadyScanning
	}
	c.scanning = true
	return nil
}

func (c *Conn) stopScanInterface() {
	c.mutex.Lock()
	c.scanning = false
	c.mutex.Unlock()
}

func (c *Conn) ScanInterface(id int) (bool, error) {
	var err error
	if err = c.startScanInterface(); err != nil {
		return false, err
	}
	defer c.stopScanInterface()
	path := makeInterfacePath(id)
	obj := c.newObject("Interface", path)
	var scanning bool
	if err = obj.property("Scanning", &scanning); err != nil {
		return false, err
	}
	if !scanning {
		args := map[string]dbus.Variant{
			"Type": dbus.MakeVariant("active"),
		}
		if err := obj.call("Scan", args); err != nil {
			return false, err
		}
	}
	opts := []dbus.MatchOption{
		dbus.WithMatchObjectPath(path),
		dbus.WithMatchInterface(makeServiceInterfaceName("Interface")),
		dbus.WithMatchSender(serviceName),
		dbus.WithMatchMember("ScanDone"),
	}
	if err = c.inner.AddMatchSignal(opts...); err != nil {
		return false, err
	}
	var sig *dbus.Signal
	for {
		sig = <-c.signal
		if sig.Path == path {
			break
		}
	}
	if err = c.inner.RemoveMatchSignal(opts...); err != nil {
		return false, err
	}
	return sig.Body[0].(bool), nil
}

func getStr(m map[string]dbus.Variant, k string) string {
	v := m[k].Value()
	if v == nil {
		return ""
	}
	return v.(string)
}

func (c *Conn) getBSS(path dbus.ObjectPath) (*BSS, error) {
	obj := c.newObject("BSS", path)
	var err error
	id, err := getIDFromPath(path)
	if err != nil {
		return nil, err
	}
	var ssid []byte
	if err = obj.property("SSID", &ssid); err != nil {
		return nil, err
	}
	var bssid net.HardwareAddr
	if err = obj.property("BSSID", &bssid); err != nil {
		return nil, err
	}
	var wpa map[string]dbus.Variant
	if err = obj.property("WPA", &wpa); err != nil {
		return nil, err
	}
	var rsn map[string]dbus.Variant
	if err = obj.property("RSN", &rsn); err != nil {
		return nil, err
	}
	var wps map[string]dbus.Variant
	if err = obj.property("WPS", &wps); err != nil {
		return nil, err
	}
	var privacy bool
	if err = obj.property("Privacy", &privacy); err != nil {
		return nil, err
	}
	var mode string
	if err = obj.property("Mode", &mode); err != nil {
		return nil, err
	}
	var frequency int
	if err = obj.property("Frequency", &frequency); err != nil {
		return nil, err
	}
	return &BSS{
		ID:    id,
		BSSID: bssid.String(),
		SSID:  string(ssid),
		WPA: WPA{
			KeyMgmt:  getStrArray(wpa, "KeyMgmt"),
			Pairwise: getStrArray(wpa, "Pairwise"),
			Group:    getStr(wpa, "Group"),
		},
		RSN: RSN{
			KeyMgmt:   getStrArray(rsn, "KeyMgmt"),
			Pairwise:  getStrArray(rsn, "KeyMgmt"),
			Group:     getStr(rsn, "Group"),
			MgmtGroup: getStr(rsn, "MgmtGroup"),
		},
		WPS: WPS{
			Type: getStr(wps, "Type"),
		},
		Privacy:   privacy,
		Mode:      mode,
		Frequency: frequency,
	}, nil
}

func (c *Conn) GetBSSs(interfaceID int) ([]*BSS, error) {
	obj := c.newObject("Interface", makeInterfacePath(interfaceID))
	var bsss []dbus.ObjectPath
	if err := obj.property("BSSs", &bsss); err != nil {
		return nil, err
	}
	b := make([]*BSS, len(bsss))
	for i, p := range bsss {
		bss, err := c.getBSS(p)
		if err != nil {
			return nil, err
		}
		b[i] = bss
	}
	return b, nil
}

func makeBSSPath(interfaceID, id int) dbus.ObjectPath {
	return dbus.ObjectPath(fmt.Sprintf("%s/Interfaces/%d/BSSs/%d", servicePath, interfaceID, id))
}

func (c *Conn) GetBSS(interfaceID, id int) (*BSS, error) {
	return c.getBSS(makeBSSPath(interfaceID, id))
}
