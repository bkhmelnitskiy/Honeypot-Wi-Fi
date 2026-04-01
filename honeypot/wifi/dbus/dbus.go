package dbus

import (
	"errors"
	"fmt"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/godbus/dbus/v5"
)

const (
	serviceName    = "fi.w1.wpa_supplicant1"
	servicePath    = "/fi/w1/wpa_supplicant1"
	timeoutScan    = 10 * time.Second
	timeoutConnect = 10 * time.Second
)

var (
	errAlreadySubscribed    = errors.New("dbus: already subscribed for this signal")
	ErrAlreadyScanning      = errors.New("dbus: already scanning for available networks")
	ErrAlreadyConnected     = errors.New("dbus: already connected to the network")
	ErrAlreadyConnecting    = errors.New("dbus: already connecting to the network")
	ErrNotConnected         = errors.New("dbus: interface is not connected to any network")
	ErrInvalidNetworkConfig = errors.New("dbus: network configuration is invalid")
	ErrNotFound             = errors.New("dbus: interface not found")
	ErrTimeout              = errors.New("dbus: operation took too long to complete")
)

type WPA struct {
	KeyMgmt  []string `json:"key_mgmt,omitempty"`
	Pairwise []string `json:"pairwise,omitempty"`
	Group    string   `json:"group,omitempty"`
}

type RSN struct {
	KeyMgmt   []string `json:"key_mgmt,omitempty"`
	Pairwise  []string `json:"pairwise,omitempty"`
	Group     string   `json:"group,omitempty"`
	MgmtGroup string   `json:"mgmt_group,omitempty"`
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

type Network struct {
	BSS        int            `json:"bss"`
	Properties map[string]any `json:"properties"`
}

type Capabilities struct {
	Pairwise []string `json:"pairwise"`
	Group    []string `json:"group"`
	KeyMgmt  []string `json:"key_mgmt"`
	Protocol []string `json:"protocol"`
	AuthAlg  []string `json:"auth_alg"`
	Scan     []string `json:"scan"`
	Modes    []string `json:"modes"`
}

type Interface struct {
	ID           int          `json:"id"`
	Name         string       `json:"name"`
	State        string       `json:"state"`
	Capabilities Capabilities `json:"capabilities"`
}

type Conn struct {
	inner   *dbus.Conn
	signals map[string]chan *dbus.Signal
	mutex   sync.Mutex
}

func getStr(m map[string]dbus.Variant, k string) string {
	v := m[k].Value()
	if v == nil {
		return ""
	}
	return v.(string)
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

func makeInterfacePath(id int) dbus.ObjectPath {
	return dbus.ObjectPath(fmt.Sprintf("%s/Interfaces/%d", servicePath, id))
}

func isError(err error, name string) bool {
	var dbusError *dbus.Error
	return errors.As(err, &dbusError) &&
		dbusError.Name == fmt.Sprintf("%s.%s", serviceName, name)
}

func New() (*Conn, error) {
	inner, err := dbus.SystemBus()
	if err != nil {
		return nil, err
	}
	c := &Conn{
		inner,
		make(map[string]chan *dbus.Signal),
		sync.Mutex{},
	}
	signal := make(chan *dbus.Signal, 16)
	inner.Signal(signal)
	go func() {
		for {
			sig := <-signal
			c.mutex.Lock()
			s, ok := c.signals[sig.Name]
			c.mutex.Unlock()
			if ok {
				s <- sig
			}
		}
	}()
	return c, nil
}

func (c *Conn) Close() error {
	return c.inner.Close()
}

type object struct {
	inner dbus.BusObject
	name  string
	path  dbus.ObjectPath
}

func (c *Conn) newObject(category string, path dbus.ObjectPath) object {
	var name string
	if category != "" {
		name = fmt.Sprintf("%s.%s", serviceName, category)
	} else {
		name = serviceName
	}
	return object{c.inner.Object(serviceName, path), name, path}
}

func (c *Conn) newInterfaceObject(id int) object {
	return c.newObject("Interface", makeInterfacePath(id))
}

func (o object) resolve(name string) string {
	return fmt.Sprintf("%s.%s", o.name, name)
}

func (o object) property(name string, value any) error {
	if err := o.inner.StoreProperty(o.resolve(name), value); err != nil {
		if err.Error() == "Method \"Get\" with signature \"ss\" on interface \"org.freedesktop.DBus.Properties\" doesn't exist\n" {
			return ErrNotFound
		} else {
			return err
		}
	}
	return nil
}

func (o object) call(method string, args ...any) *dbus.Call {
	return o.inner.Call(o.resolve(method), 0, args...)
}

type subscriber struct {
	opts []dbus.MatchOption
	name string
	conn *Conn
}

func (c *Conn) newSubscriber(obj object, signal string) subscriber {
	opts := []dbus.MatchOption{
		dbus.WithMatchObjectPath(obj.path),
		dbus.WithMatchInterface(obj.name),
		dbus.WithMatchSender(serviceName),
		dbus.WithMatchMember(signal),
	}
	return subscriber{opts, fmt.Sprintf("%s.%s", obj.name, signal), c}
}

func (s subscriber) addMatch() error {
	return s.conn.inner.AddMatchSignal(s.opts...)
}

func (s subscriber) removeMatch() error {
	return s.conn.inner.RemoveMatchSignal(s.opts...)
}

func (s subscriber) addChannel() (chan *dbus.Signal, bool) {
	s.conn.mutex.Lock()
	defer s.conn.mutex.Unlock()
	if _, ok := s.conn.signals[s.name]; ok {
		return nil, false
	}
	ch := make(chan *dbus.Signal, 4)
	s.conn.signals[s.name] = ch
	return ch, true
}

func (s subscriber) removeChannel() {
	s.conn.mutex.Lock()
	ch, ok := s.conn.signals[s.name]
	if ok {
		close(ch)
		delete(s.conn.signals, s.name)
	}
	s.conn.mutex.Unlock()
}

func (s subscriber) subscribe() (chan *dbus.Signal, error) {
	ch, ok := s.addChannel()
	if !ok {
		return nil, errAlreadySubscribed
	}
	if err := s.addMatch(); err != nil {
		s.removeChannel()
		return nil, err
	}
	return ch, nil
}

func (s subscriber) unsubscribe() error {
	err := s.removeMatch()
	s.removeChannel()
	return err
}

func (c *Conn) GetInterface(id int) (*Interface, error) {
	obj := c.newInterfaceObject(id)
	var err error
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
	var err error
	var interfaces []dbus.ObjectPath
	if err = obj.property("Interfaces", &interfaces); err != nil {
		return nil, err
	}
	infs := make([]*Interface, len(interfaces))
	for i, p := range interfaces {
		id, err := getIDFromPath(p)
		if err != nil {
			return nil, err
		}
		inf, err := c.GetInterface(id)
		if err != nil {
			return nil, err
		}
		infs[i] = inf
	}
	return infs, nil
}

func (c *Conn) ScanInterface(id int) (bool, error) {
	obj := c.newInterfaceObject(id)
	sub := c.newSubscriber(obj, "ScanDone")
	var scanning bool
	var err error
	if err = obj.property("Scanning", &scanning); err != nil {
		return false, err
	}
	if !scanning {
		args := map[string]dbus.Variant{
			"Type": dbus.MakeVariant("active"),
		}
		if err := obj.call("Scan", args).Err; err != nil {
			return false, err
		}
	}
	ch, err := sub.subscribe()
	if err != nil {
		if errors.Is(err, errAlreadySubscribed) {
			return false, ErrAlreadyScanning
		} else {
			return false, err
		}
	}
	defer sub.unsubscribe()
	select {
	case sig := <-ch:
		return sig.Body[0].(bool), nil
	case <-time.After(timeoutScan):
		return false, ErrTimeout
	}
}

func (c *Conn) CurrentNetwork(interfaceID int) (*Network, error) {
	obj := c.newInterfaceObject(interfaceID)
	var err error
	var state string
	if err = obj.property("State", &state); err != nil {
		return nil, err
	}
	if state != "completed" {
		return nil, ErrNotConnected
	}
	var currentBSS dbus.ObjectPath
	if err = obj.property("CurrentBSS", &currentBSS); err != nil {
		return nil, err
	}
	bss, err := getIDFromPath(currentBSS)
	if err != nil {
		return nil, err
	}
	var currentNetwork dbus.ObjectPath
	if err = obj.property("CurrentNetwork", &currentNetwork); err != nil {
		return nil, err
	}
	networkObj := c.newObject("Network", currentNetwork)
	var properties map[string]dbus.Variant
	if err = networkObj.property("Properties", &properties); err != nil {
		return nil, err
	}
	network := &Network{
		BSS:        bss,
		Properties: make(map[string]any),
	}
	for k, v := range properties {
		network.Properties[k] = v.Value()
	}
	return network, nil
}

func (c *Conn) ConnectNetwork(interfaceID int, config map[string]any) error {
	obj := c.newInterfaceObject(interfaceID)
	var err error
	var state string
	if err = obj.property("State", &state); err != nil {
		return err
	}
	if state == "completed" {
		return ErrAlreadyConnected
	}
	if state != "disconnected" && state != "inactive" {
		return ErrAlreadyConnecting
	}
	if err = obj.call("RemoveAllNetworks").Err; err != nil {
		return err
	}
	args := make(map[string]dbus.Variant)
	for k, v := range config {
		args[k] = dbus.MakeVariant(v)
	}
	call := obj.call("AddNetwork", args)
	if err = call.Err; err != nil {
		if isError(err, "InvalidArgs") {
			return ErrInvalidNetworkConfig
		} else {
			return err
		}
	}
	path := call.Body[0].(dbus.ObjectPath)
	if err = obj.call("SelectNetwork", path).Err; err != nil {
		return err
	}
	sub := c.newSubscriber(obj, "PropertiesChanged")
	ch, err := sub.subscribe()
	if err != nil {
		if errors.Is(err, errAlreadySubscribed) {
			return ErrAlreadyConnecting
		} else {
			return err
		}
	}
	defer sub.unsubscribe()
	enquoted := fmt.Sprintf("%q", "completed")
	for {
		select {
		case sig := <-ch:
			properties := sig.Body[0].(map[string]dbus.Variant)
			s, ok := properties["State"]
			if ok && s.String() == enquoted {
				return nil
			}
		case <-time.After(timeoutConnect):
			return ErrTimeout
		}
	}
}

func (c *Conn) DisconnectNetwork(interfaceID int) error {
	obj := c.newInterfaceObject(interfaceID)
	var err error
	var state string
	if err = obj.property("State", &state); err != nil {
		return err
	}
	if state != "completed" {
		return ErrNotConnected
	}
	var currentNetwork dbus.ObjectPath
	if err = obj.property("CurrentNetwork", &currentNetwork); err != nil {
		return err
	}
	if err = obj.call("Disconnect").Err; err != nil {
		if isError(err, "NotConnected") {
			return ErrNotConnected
		} else {
			return err
		}
	}
	return obj.call("RemoveNetwork", currentNetwork).Err
}

func (c *Conn) GetBSS(interfaceID, id int) (*BSS, error) {
	path := dbus.ObjectPath(fmt.Sprintf("%s/BSSs/%d", makeInterfacePath(interfaceID), id))
	obj := c.newObject("BSS", path)
	var err error
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
	obj := c.newInterfaceObject(interfaceID)
	var bsss []dbus.ObjectPath
	var err error
	if err = obj.property("BSSs", &bsss); err != nil {
		return nil, err
	}
	b := make([]*BSS, len(bsss))
	for i, p := range bsss {
		id, err := getIDFromPath(p)
		if err != nil {
			return nil, err
		}
		bss, err := c.GetBSS(interfaceID, id)
		if err != nil {
			return nil, err
		}
		b[i] = bss
	}
	return b, nil
}
