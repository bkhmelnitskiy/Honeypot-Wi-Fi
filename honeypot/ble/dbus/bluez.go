package dbus

import (
	"errors"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/godbus/dbus/v5"
)

const (
	objectManagerIface          = "org.freedesktop.DBus.ObjectManager"
	propertiesIface             = "org.freedesktop.DBus.Properties"
	bluezIface                  = "org.bluez"
	serviceIface                = "org.bluez.GattService1"
	charIface                   = "org.bluez.GattCharacteristic1"
	deviceIface                 = "org.bluez.Device1"
	deviceName                  = "honeypot"
	serviceUUID                 = "af1d1aa1-b82f-427b-9310-ab69162fe860"
	ssidCharUUID                = "60d1e593-768b-4a61-b0b4-503c32a09364"
	securityCharUUID            = "10a1e240-345e-437e-befd-1641c768fb93"
	agentPath                   = dbus.ObjectPath("/honeypot/bluez/agent")
	connectTimeout              = 10 * time.Second
	connectTimeoutCheckInterval = 1 * time.Second
	connectDBusTimeout          = 4 * time.Second
	pairDBusTimeout             = 6 * time.Second
)

var (
	ErrAdapterNotPowered = errors.New("dbus: adapter is not powered")
	ErrDisconnected      = errors.New("dbus: already disconnected from peer")
	ErrConnectTimeout    = errors.New("dbus: connection establishment timeout expired")
)

type object struct {
	inner dbus.BusObject
	iface string
	path  dbus.ObjectPath
}

func newObject(conn *dbus.Conn, iface string, path dbus.ObjectPath) object {
	return object{conn.Object(bluezIface, path), iface, path}
}

func (o object) resolve(name string) string {
	return fmt.Sprintf("%s.%s", o.iface, name)
}

func (o object) getProperty(name string, value any) error {
	return o.inner.StoreProperty(o.resolve(name), value)
}

func (o object) setProperty(name string, value any) error {
	return o.inner.SetProperty(o.resolve(name), value)
}

func (o object) call(method string, args ...any) *dbus.Call {
	return o.inner.Call(o.resolve(method), 0, args...)
}

func (o object) callIface(iface string, method string, args ...any) *dbus.Call {
	return o.inner.Call(fmt.Sprintf("%s.%s", iface, method), 0, args...)
}

func (o object) callTimeout(method string, timeout time.Duration, args ...any) *dbus.Call {
	call := o.inner.Go(o.resolve(method), 0, make(chan *dbus.Call, 1), args...)
	select {
	case res := <-call.Done:
		return res
	case <-time.After(timeout):
		return nil
	}
}

func (o object) pair() error {
	call := o.callTimeout("Pair", pairDBusTimeout)
	if call == nil {
		o.call("CancelPairing")
		return ErrConnectTimeout
	}
	return call.Err
}

func (o object) connect() error {
	call := o.callTimeout("Connect", connectDBusTimeout)
	if call == nil {
		o.call("Disconnect")
		return ErrConnectTimeout
	}
	return call.Err
}

type agent struct {
}

func (a *agent) Release() {
}

func (a *agent) RequestPinCode(_ dbus.ObjectPath) (string, *dbus.Error) {
	return "", dbus.MakeFailedError(errors.New("NoInputNoOutput"))
}

func (a *agent) DisplayPinCode(_ dbus.ObjectPath, _ string) *dbus.Error {
	return nil
}

func (a *agent) RequestPasskey(_ dbus.ObjectPath) (uint32, *dbus.Error) {
	return 0, dbus.MakeFailedError(errors.New("NoInputNoOutput"))
}

func (a *agent) DisplayPasskey(_ dbus.ObjectPath, _ uint32, _ uint16) {
}

func (a *agent) RequestConfirmation(_ dbus.ObjectPath, _ uint32) *dbus.Error {
	return nil
}

func (a *agent) RequestAuthorization(_ dbus.ObjectPath) *dbus.Error {
	return nil
}

func (a *agent) AuthorizeService(_ dbus.ObjectPath, _ string) *dbus.Error {
	return nil
}

func (a *agent) Cancel() {
}

type blueZ struct {
	conn                         *dbus.Conn
	root                         object
	adapter                      object
	agentManager                 object
	signalMatchPropertiesChanged []dbus.MatchOption
	signalMatchInterfacesAdded   []dbus.MatchOption
	signalMatchInterfacesRemoved []dbus.MatchOption
	disconnected                 bool
	disconnectedMutex            sync.Mutex
}

func newBlueZ() (*blueZ, error) {
	conn, err := dbus.SystemBus()
	if err != nil {
		return nil, err
	}
	root := newObject(conn, bluezIface, "/")
	adapter := newObject(conn, "org.bluez.Adapter1", dbus.ObjectPath("/org/bluez/hci0"))
	agentManager := newObject(conn, "org.bluez.AgentManager1", "/org/bluez")
	var powered bool
	if err = adapter.getProperty("Powered", &powered); err != nil {
		return nil, err
	}
	if !powered {
		return nil, ErrAdapterNotPowered
	}
	if err = conn.Export(&agent{}, agentPath, "org.bluez.Agent1"); err != nil {
		return nil, err
	}
	if err = agentManager.call("RegisterAgent", agentPath, "NoInputNoOutput").Err; err != nil {
		return nil, err
	}
	if err = agentManager.call("RequestDefaultAgent", agentPath).Err; err != nil {
		return nil, err
	}
	return &blueZ{
		conn:         conn,
		root:         root,
		adapter:      adapter,
		agentManager: agentManager,
		signalMatchPropertiesChanged: []dbus.MatchOption{
			dbus.WithMatchInterface(propertiesIface),
			dbus.WithMatchMember("PropertiesChanged"),
			dbus.WithMatchSender(bluezIface),
		},
		signalMatchInterfacesAdded: []dbus.MatchOption{
			dbus.WithMatchInterface(objectManagerIface),
			dbus.WithMatchMember("InterfacesAdded"),
			dbus.WithMatchSender(bluezIface),
		},
		signalMatchInterfacesRemoved: []dbus.MatchOption{
			dbus.WithMatchInterface(objectManagerIface),
			dbus.WithMatchMember("InterfacesRemoved"),
			dbus.WithMatchSender(bluezIface),
		},
	}, nil
}

func (b *blueZ) close() error {
	b.agentManager.call("UnregisterAgent", agentPath)
	return b.conn.Close()
}

func (b *blueZ) newObject(iface string, path dbus.ObjectPath) object {
	return newObject(b.conn, iface, path)
}

type properties struct {
	path dbus.ObjectPath
	data map[string]dbus.Variant
}

type signalObject struct {
	iface string
	props properties
}

func (b *blueZ) signalSubscribe() (chan signalObject, chan struct{}, error) {
	signal := make(chan *dbus.Signal, 32)
	b.conn.Signal(signal)
	var err error
	if err = b.conn.AddMatchSignal(b.signalMatchPropertiesChanged...); err != nil {
		return nil, nil, err
	}
	if err = b.conn.AddMatchSignal(b.signalMatchInterfacesAdded...); err != nil {
		return nil, nil, err
	}
	if err = b.conn.AddMatchSignal(b.signalMatchInterfacesRemoved...); err != nil {
		return nil, nil, err
	}
	objects := make(chan signalObject)
	done := make(chan struct{})
	go func() {
		for {
			select {
			case <-done:
				b.conn.RemoveMatchSignal(b.signalMatchPropertiesChanged...)
				b.conn.RemoveMatchSignal(b.signalMatchInterfacesAdded...)
				b.conn.RemoveMatchSignal(b.signalMatchInterfacesRemoved...)
				b.conn.RemoveSignal(signal)
				return
			case sig := <-signal:
				if strings.HasSuffix(sig.Name, "PropertiesChanged") {
					iface := sig.Body[0].(string)
					data := sig.Body[1].(map[string]dbus.Variant)
					objects <- signalObject{iface, properties{sig.Path, data}}
				} else if strings.HasSuffix(sig.Name, "InterfacesAdded") {
					path := sig.Body[0].(dbus.ObjectPath)
					interfaces := sig.Body[1].(map[string]map[string]dbus.Variant)
					data, ok := interfaces[deviceIface]
					if ok {
						objects <- signalObject{deviceIface, properties{path, data}}
					}
				} else if strings.HasSuffix(sig.Name, "InterfacesRemoved") {
					path := sig.Body[0].(dbus.ObjectPath)
					interfaces := sig.Body[1].([]string)
					if slices.Contains(interfaces, deviceIface) {
						objects <- signalObject{deviceIface, properties{path, nil}}
					}
				}
			}
		}
	}()
	return objects, done, nil
}

func isPropFlag(props map[string]dbus.Variant, name string) bool {
	value := props[name].Value()
	if value == nil {
		return false
	}
	return value.(bool)
}

func unquote(s string) string {
	u, err := strconv.Unquote(s)
	if err != nil {
		return s
	}
	return u
}

func isDeviceName(props map[string]dbus.Variant) bool {
	v, ok := props["Name"]
	if ok {
		name := v.String()
		return unquote(name) == deviceName
	} else {
		return false
	}
}

type managedObjects map[dbus.ObjectPath]map[string]map[string]dbus.Variant

func (b *blueZ) findPairedDevice() (properties, bool, error) {
	var objs managedObjects
	if err := b.root.callIface(objectManagerIface, "GetManagedObjects").Store(&objs); err != nil {
		return properties{}, false, err
	}
	for path, v := range objs {
		props, ok := v[deviceIface]
		if !ok {
			continue
		}
		if !strings.HasPrefix(string(path), string(b.adapter.path)) {
			continue
		}
		if isPropFlag(props, "Paired") && isDeviceName(props) {
			return properties{path, props}, true, nil
		}
	}
	return properties{}, false, nil
}

func (b *blueZ) setDisconnected(disconnected bool) {
	b.disconnectedMutex.Lock()
	b.disconnected = disconnected
	b.disconnectedMutex.Unlock()
}

func (b *blueZ) isDisconnected() bool {
	b.disconnectedMutex.Lock()
	defer b.disconnectedMutex.Unlock()
	return b.disconnected
}

func (b *blueZ) disconnect(path dbus.ObjectPath) error {
	if b.isDisconnected() {
		return nil
	}
	defer b.setDisconnected(true)
	obj := b.newObject(deviceIface, path)
	var connected bool
	var err error
	if err = obj.getProperty("Connected", &connected); err != nil {
		return err
	}
	if !connected {
		return nil
	}
	if err = obj.call("Disconnect").Err; err != nil {
		return err
	}
	objects, done, err := b.signalSubscribe()
	if err != nil {
		return err
	}
	for {
		o := <-objects
		if o.iface != deviceIface || o.props.path != path {
			continue
		}
		if !isPropFlag(o.props.data, "Connected") {
			close(done)
			return nil
		}
	}
}
