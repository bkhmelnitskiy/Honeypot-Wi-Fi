package dbus

import (
	"errors"
	"fmt"
	"strings"
	"sync"

	"github.com/godbus/dbus/v5"
)

const (
	managerIface     = "org.freedesktop.DBus.ObjectManager"
	propertiesIface  = "org.freedesktop.DBus.Properties"
	bluezIface       = "org.bluez"
	serviceIface     = "org.bluez.GattService1"
	charIface        = "org.bluez.GattCharacteristic1"
	advIface         = "org.bluez.LEAdvertisement1"
	advManagerIface  = "org.bluez.LEAdvertisingManager1"
	gattManagerIface = "org.bluez.GattManager1"
	deviceIface      = "org.bluez.Device1"
	adapterIface     = "org.bluez.Adapter1"
	deviceName       = "honeypot"
	serviceUUID      = "af1d1aa1-b82f-427b-9310-ab69162fe860"
	ssidCharUUID     = "60d1e593-768b-4a61-b0b4-503c32a09364"
	securityCharUUID = "10a1e240-345e-437e-befd-1641c768fb93"
	adapterPath      = dbus.ObjectPath("/org/bluez/hci0")
)

var (
	ErrAdapterNotPowered = errors.New("dbus: adapter is not powered")
	ErrAdapterStopped    = errors.New("dbus: adapter is powered off or stopped discovering")
	ErrDisconnected      = errors.New("dbus: already disconnected from peer")
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

func (o object) property(name string, value any) error {
	return o.inner.StoreProperty(o.resolve(name), value)
}

func (o object) call(method string, args ...any) *dbus.Call {
	return o.inner.Call(o.resolve(method), 0, args...)
}

type managedObjects map[dbus.ObjectPath]map[string]map[string]dbus.Variant

func (o object) getManagedObjects() (managedObjects, error) {
	var objs managedObjects
	method := fmt.Sprintf("%s.GetManagedObjects", managerIface)
	if err := o.inner.Call(method, 0).Store(&objs); err != nil {
		return nil, err
	}
	return objs, nil
}

type blueZ struct {
	conn                         *dbus.Conn
	root                         object
	adapter                      object
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
	adapter := newObject(conn, adapterIface, adapterPath)
	var powered bool
	if err = adapter.property("Powered", &powered); err != nil {
		return nil, err
	}
	if !powered {
		return nil, ErrAdapterNotPowered
	}
	return &blueZ{
		conn:    conn,
		root:    root,
		adapter: adapter,
		signalMatchPropertiesChanged: []dbus.MatchOption{
			dbus.WithMatchInterface(propertiesIface),
			dbus.WithMatchMember("PropertiesChanged"),
			dbus.WithMatchSender(bluezIface),
		},
		signalMatchInterfacesAdded: []dbus.MatchOption{
			dbus.WithMatchInterface(managerIface),
			dbus.WithMatchMember("InterfacesAdded"),
			dbus.WithMatchSender(bluezIface),
		},
		signalMatchInterfacesRemoved: []dbus.MatchOption{
			dbus.WithMatchInterface(managerIface),
			dbus.WithMatchMember("InterfacesRemoved"),
			dbus.WithMatchSender(bluezIface),
		},
	}, nil
}

func (b *blueZ) close() error {
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
	signal := make(chan *dbus.Signal)
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
				close(signal)
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
					interfaces := sig.Body[1].(map[string]map[string]dbus.Variant)
					if _, ok := interfaces[deviceIface]; ok {
						objects <- signalObject{deviceIface, properties{path, nil}}
					}
				}
			}
		}
	}()
	return objects, done, nil
}

func (b *blueZ) findPairedDevice() (properties, bool, error) {
	var objs managedObjects
	objs, err := b.root.getManagedObjects()
	if err != nil {
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
		paired := props["Paired"].Value().(bool)
		name := props["Name"].String()
		if paired && name == deviceName {
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
	if err = obj.property("Connected", &connected); err != nil {
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
		if !o.props.data["Connected"].Value().(bool) {
			close(done)
			return nil
		}
	}
}
