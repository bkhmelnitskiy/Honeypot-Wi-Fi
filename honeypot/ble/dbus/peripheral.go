package dbus

import (
	"errors"
	"maps"
	"time"

	"github.com/godbus/dbus/v5"
	"github.com/godbus/dbus/v5/prop"
)

const (
	advManagerIface  = "org.bluez.LEAdvertisingManager1"
	gattManagerIface = "org.bluez.GattManager1"
	managerPath      = dbus.ObjectPath("/honeypot/ble")
	servicePath      = dbus.ObjectPath("/honeypot/ble/service0")
	ssidCharPath     = dbus.ObjectPath("/honeypot/ble/service0/char0")
	securityCharPath = dbus.ObjectPath("/honeypot/ble/service0/char1")
	advPath          = dbus.ObjectPath("/honeypot/bluez/advertisement")
)

type peripheralConn struct {
	device properties
}

type peripheralProfile struct {
	service      *prop.Properties
	ssidChar     *prop.Properties
	securityChar *prop.Properties
}

type peripheral struct {
	blueZ         *blueZ
	conn          *peripheralConn
	profile       *peripheralProfile
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
	return &peripheral{blueZ, nil, nil, make(chan []byte)}, err
}

func (c *peripheral) Close() error {
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
		variants[k] = dbus.MakeVariant(v.Value)
	}
	m.objects[path] = map[string]map[string]dbus.Variant{iface: variants}
}

func (m *objectManager) addService(props map[string]*prop.Prop) (*prop.Properties, error) {
	conn := m.peripheral.blueZ.conn
	p, err := prop.Export(
		conn,
		servicePath,
		map[string]map[string]*prop.Prop{charIface: props},
	)
	if err != nil {
		return nil, err
	}
	service := &gattService{p}
	if err = conn.Export(service, servicePath, serviceIface); err != nil {
		return nil, err
	}
	m.addObject(servicePath, serviceIface, props)
	return p, nil
}

func (m *objectManager) addChar(
	props map[string]*prop.Prop,
	path dbus.ObjectPath,
	writeChan chan []byte) (*prop.Properties, error) {
	conn := m.peripheral.blueZ.conn
	p, err := prop.Export(
		conn,
		path,
		map[string]map[string]*prop.Prop{charIface: props},
	)
	if err != nil {
		return nil, err
	}
	char := &gattChar{p, writeChan}
	if err = conn.Export(char, path, charIface); err != nil {
		return nil, err
	}
	m.addObject(path, charIface, props)
	return p, nil
}

func (m *objectManager) export() error {
	serviceProps, err := m.addService(map[string]*prop.Prop{
		"UUID":    {Value: serviceUUID},
		"Primary": {Value: true},
	})
	if err != nil {
		return err
	}
	ssidCharProps, err := m.addChar(map[string]*prop.Prop{
		"UUID":    {Value: ssidCharUUID},
		"Service": {Value: servicePath},
		"Flags":   {Value: []string{"write"}},
		"Value": {
			Value:    []byte{},
			Writable: true,
			Emit:     prop.EmitTrue,
		},
	}, ssidCharPath, m.peripheral.ssidWriteChan)
	if err != nil {
		return err
	}
	securityCharProps, err := m.addChar(map[string]*prop.Prop{
		"UUID":    {Value: securityCharUUID},
		"Service": {Value: servicePath},
		"Flags":   {Value: []string{"notify"}},
		"Value": {
			Value:    []byte{0, 0, 0, 0},
			Writable: true,
			Emit:     prop.EmitTrue,
		},
	}, securityCharPath, nil)
	if err != nil {
		return err
	}
	if err = m.peripheral.blueZ.conn.Export(m, managerPath, objectManagerIface); err != nil {
		return err
	}
	m.peripheral.profile = &peripheralProfile{serviceProps, ssidCharProps, securityCharProps}
	return nil
}

func (m *objectManager) GetManagedObjects() (managedObjects, *dbus.Error) {
	return m.objects, nil
}

func isDBusErr(err error, name string) bool {
	var dbusErr dbus.Error
	return errors.As(err, &dbusErr) && dbusErr.Name == name
}

func (p *peripheral) registerApplication() error {
	manager := objectManager{p, make(managedObjects)}
	var err error
	if err = manager.export(); err != nil {
		return err
	}
	err = p.blueZ.adapter.callIface(gattManagerIface, "UnregisterApplication", managerPath).Err
	if err != nil && !isDBusErr(err, "org.bluez.Error.DoesNotExist") {
		return err
	}
	err = p.blueZ.adapter.callIface(
		gattManagerIface,
		"RegisterApplication",
		managerPath,
		map[string]dbus.Variant(nil),
	).Err
	if err != nil && !isDBusErr(err, "org.bluez.Error.AlreadyExists") {
		return err
	}
	return nil
}

func (p *peripheral) registerAdvertisement() error {
	advProps := map[string]*prop.Prop{
		"Type":         {Value: "peripheral"},
		"ServiceUUIDs": {Value: []string{serviceUUID}},
		"LocalName":    {Value: deviceName},
		"Timeout":      {Value: uint16(0)},
	}
	var err error
	if _, err = prop.Export(
		p.blueZ.conn,
		advPath,
		map[string]map[string]*prop.Prop{"org.bluez.LEAdvertisement1": advProps},
	); err != nil {
		return err
	}
	if err = p.blueZ.adapter.setProperty("Alias", dbus.MakeVariant(deviceName)); err != nil {
		return err
	}
	return p.blueZ.adapter.callIface(
		advManagerIface,
		"RegisterAdvertisement",
		advPath,
		map[string]any{},
	).Err
}

func (p *peripheral) Connect() error {
	var err error
	if err = p.registerAdvertisement(); err != nil {
		return err
	}
	objects, done, err := p.blueZ.signalSubscribe()
	if err != nil {
		return err
	}
	defer close(done)
	if err = p.blueZ.adapter.setProperty(
		"DiscoverableTimeout",
		dbus.MakeVariant(uint32(30)),
	); err != nil {
		return err
	}
	if err = p.blueZ.adapter.setProperty(
		"Discoverable",
		dbus.MakeVariant(true),
	); err != nil {
		return err
	}
	if err = p.registerApplication(); err != nil {
		return err
	}
	devs := make(map[dbus.ObjectPath]map[string]dbus.Variant)
	start := time.Now()
	for {
		if time.Since(start) >= connectTimeout {
			return ErrConnectTimeout
		}
		select {
		case <-time.After(connectTimeoutCheckInterval):
			continue
		case o := <-objects:
			if o.iface != deviceIface {
				continue
			}
			dev := o.props
			if dev.data == nil {
				delete(devs, dev.path)
				continue
			}
			if _, ok := devs[dev.path]; ok {
				maps.Copy(devs[dev.path], dev.data)
			} else {
				devs[dev.path] = dev.data
			}
			obj := p.blueZ.newObject(deviceIface, dev.path)
			if !isPropFlag(devs[dev.path], "Connected") {
				continue
			}
			var props map[string]dbus.Variant
			if err := obj.callIface(
				propertiesIface,
				"GetAll",
				deviceIface,
			).Store(&props); err != nil {
				obj.call("Disconnect")
				return err
			}
			if !isPropFlag(props, "Paired") && !isPropFlag(props, "ServicesResolved") {
				continue
			}
			time.Sleep(1 * time.Second)
			p.conn = &peripheralConn{properties{dev.path, props}}
			return nil
		}
	}
}

func (p *peripheral) Disconnect() error {
	return p.blueZ.disconnect(p.conn.device.path)
}

func (p *peripheral) WriteSecurity(security Security) error {
	if p.blueZ.isDisconnected() {
		return ErrDisconnected
	}
	err := p.profile.securityChar.Set(
		charIface,
		"Value",
		dbus.MakeVariant(security.bytes()),
	)
	if err == nil {
		return nil
	} else {
		return err
	}
}

func (p *peripheral) NotifySSID() (chan string, chan struct{}, error) {
	objects, done, err := p.blueZ.signalSubscribe()
	if err != nil {
		return nil, nil, err
	}
	ssid := make(chan string)
	go func() {
		for {
			select {
			case <-done:
				close(ssid)
				return
			case o := <-objects:
				if o.iface == deviceIface && o.props.path == p.conn.device.path {
					if !isPropFlag(o.props.data, "Connected") {
						done <- struct{}{}
						p.blueZ.setDisconnected(true)
					}
				}
			case s := <-p.ssidWriteChan:
				ssid <- string(s)
			}
		}
	}()
	return ssid, done, nil
}
