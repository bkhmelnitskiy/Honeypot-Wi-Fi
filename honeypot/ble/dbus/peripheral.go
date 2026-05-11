package dbus

import (
	"errors"
	"fmt"
	"maps"

	"github.com/godbus/dbus/v5"
	"github.com/godbus/dbus/v5/prop"
)

const (
	managerPath      = dbus.ObjectPath("/honeypot/ble")
	servicePath      = dbus.ObjectPath("/honeypot/ble/service0")
	ssidCharPath     = dbus.ObjectPath("/honeypot/ble/service0/char0")
	securityCharPath = dbus.ObjectPath("/honeypot/ble/service0/char0")
	advPath          = dbus.ObjectPath("/honeypot/ble/advertisement0")
)

type peripheralConn struct {
	device properties
}

type peripheral struct {
	blueZ         *blueZ
	conn          *peripheralConn
	ssidWriteChan chan []byte
}

type Peripheral interface {
	Connect() error
	WriteSecurity(security Security) error
	NotifySSID() (chan string, chan struct{}, error)
	Disconnect() error
	Close() error
}

func NewPeripheral() (Peripheral, error) {
	blueZ, err := newBlueZ()
	if err != nil {
		return nil, err
	}
	return &peripheral{blueZ, nil, make(chan []byte)}, err
}

func (c *peripheral) Close() error {
	close(c.ssidWriteChan)
	return c.blueZ.close()
}

type gattService struct {
	props *prop.Properties
}

type gattChar struct {
	props     *prop.Properties
	writeChan chan []byte
}

func (c *gattChar) ReadValue(options map[string]dbus.Variant) ([]byte, *dbus.Error) {
	return c.props.GetMust(charIface, "Value").([]byte), nil
}

func (c *gattChar) WriteValue(value []byte, options map[string]dbus.Variant) *dbus.Error {
	if c.writeChan != nil {
		c.writeChan <- value
	}
	return nil
}

type objectManager struct {
	peripheral *peripheral
	objects    managedObjects
}

func (m *objectManager) addObject(path dbus.ObjectPath, iface string, props map[string]*prop.Prop) {
	variants := make(map[string]dbus.Variant)
	for k, v := range props {
		variants[k] = dbus.MakeVariant(v)
	}
	m.objects[path] = map[string]map[string]dbus.Variant{iface: variants}
}

func (m *objectManager) addService(props map[string]*prop.Prop) error {
	conn := m.peripheral.blueZ.conn
	p, err := prop.Export(
		conn,
		servicePath,
		map[string]map[string]*prop.Prop{charIface: props},
	)
	if err != nil {
		return err
	}
	service := &gattService{p}
	if err = conn.Export(service, servicePath, serviceIface); err != nil {
		return err
	}
	m.addObject(servicePath, serviceIface, props)
	return nil
}

func (m *objectManager) addChar(
	props map[string]*prop.Prop,
	path dbus.ObjectPath,
	writeChan chan []byte) error {
	conn := m.peripheral.blueZ.conn
	p, err := prop.Export(
		conn,
		path,
		map[string]map[string]*prop.Prop{charIface: props},
	)
	if err != nil {
		return err
	}
	char := &gattChar{p, writeChan}
	if err = conn.Export(char, path, charIface); err != nil {
		return err
	}
	m.addObject(path, charIface, props)
	return nil
}

func (m *objectManager) export() error {
	var err error
	if err = m.addService(map[string]*prop.Prop{
		"UUID":    {Value: serviceUUID},
		"Primary": {Value: true},
	}); err != nil {
		return err
	}
	if err = m.addChar(map[string]*prop.Prop{
		"UUID":    {Value: ssidCharUUID},
		"Service": {Value: servicePath},
		"Flags":   {Value: []string{"write"}},
		"Value": {
			Value:    []byte{},
			Writable: true,
			Emit:     prop.EmitTrue,
		},
	}, ssidCharPath, m.peripheral.ssidWriteChan); err != nil {
		return err
	}
	if err = m.addChar(map[string]*prop.Prop{
		"UUID":    {Value: securityCharUUID},
		"Service": {Value: servicePath},
		"Flags":   {Value: []string{"notify"}},
		"Value": {
			Value:    []byte{0, 0, 0, 0},
			Writable: true,
			Emit:     prop.EmitTrue,
		},
	}, securityCharPath, nil); err != nil {
		return err
	}
	return m.peripheral.blueZ.conn.Export(m, managerPath, managerIface)
}

func (m *objectManager) GetManagedObjects() (managedObjects, *dbus.Error) {
	return m.objects, nil
}

func (p *peripheral) registerApplication() error {
	manager := objectManager{p, make(managedObjects)}
	var err error
	if err = manager.export(); err != nil {
		return err
	}
	err = p.blueZ.adapter.inner.Call(
		"org.bluez.GattManager1.RegisterApplication",
		0,
		managerPath,
		map[string]dbus.Variant(nil),
	).Err
	var dbusErr *dbus.Error
	if errors.As(err, &dbusErr) && dbusErr.Name == "org.bluez.Error.AlreadyExists" {
		return nil
	}
	return err
}

func (p *peripheral) registerAdvertisement() error {
	advProps := map[string]*prop.Prop{
		"Type":         {Value: "broadcast"},
		"ServiceUUIDs": {Value: []string{serviceUUID}},
		"LocalName":    {Value: deviceName},
	}
	var err error
	if _, err = prop.Export(p.blueZ.conn, advPath, map[string]map[string]*prop.Prop{advIface: advProps}); err != nil {
		return err
	}
	return p.blueZ.adapter.inner.Call(
		fmt.Sprintf("%s.RegisterAdvertisement", advIface),
		0,
		advPath,
		map[string]interface{}{},
	).Err
}

func (p *peripheral) unregisterAdvertisement() error {
	return p.blueZ.adapter.inner.Call(
		fmt.Sprintf("%s.UnregisterAdvertisement", advIface),
		0,
		advPath,
	).Err
}

func (p *peripheral) setDiscoverable(discoverable bool) error {
	return p.blueZ.adapter.inner.SetProperty(
		"org.bluez.Adapter1.Discoverable",
		dbus.MakeVariant(discoverable),
	)
}

func (p *peripheral) Connect() error {
	var err error
	if err = p.registerApplication(); err != nil {
		return err
	}
	if err = p.registerAdvertisement(); err != nil {
		return err
	}
	defer p.unregisterAdvertisement()
	objects, done, err := p.blueZ.signalSubscribe()
	if err != nil {
		return err
	}
	defer close(done)
	if err = p.setDiscoverable(true); err != nil {
		return err
	}
	defer p.setDiscoverable(false)
	honeypots := make(map[dbus.ObjectPath]map[string]dbus.Variant)
	for {
		o := <-objects
		if o.iface != deviceIface {
			continue
		}
		d := o.props
		if d.data == nil {
			if d.path != "" {
				delete(honeypots, d.path)
				continue
			} else {
				return ErrAdapterStopped
			}
		}
		if _, ok := honeypots[d.path]; ok {
			maps.Copy(honeypots[d.path], d.data)
		} else {
			honeypots[d.path] = d.data
		}
		obj := p.blueZ.newObject(deviceIface, d.path)
		h := honeypots[d.path]
		if !h["Connected"].Value().(bool) {
			continue
		}
		var props map[string]dbus.Variant
		if err := obj.inner.Call(
			"org.freedesktop.DBus.Properties.GetAll",
			0,
			deviceIface,
		).Store(&props); err != nil {
			obj.call("Disconnect")
			return err
		}
		maps.Copy(h, props)
		p.conn = &peripheralConn{properties{d.path, h}}
		return nil
	}
}

func (p *peripheral) Disconnect() error {
	return p.blueZ.disconnect(p.conn.device.path)
}

func (p *peripheral) WriteSecurity(security Security) error {
	return nil
}

func (p *peripheral) NotifySSID() (chan string, chan struct{}, error) {
	return nil, nil, nil
}
