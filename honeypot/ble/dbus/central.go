package dbus

import (
	"errors"
	"maps"
	"strings"
	"time"

	"github.com/godbus/dbus/v5"
)

var (
	ErrServiceNotFound        = errors.New("dbus: service not found on the connected device")
	ErrCharacteristicNotFound = errors.New("dbus: characteristic not found on the connected device")
)

type centralConn struct {
	device       properties
	service      properties
	ssidChar     properties
	securityChar properties
}

type central struct {
	blueZ              *blueZ
	conn               *centralConn
	notifySecurityDone chan struct{}
}

type Central interface {
	Connect() error
	WriteSSID(ssid string) error
	StartNotifySecurity() (chan Security, error)
	StopNotifySecurity()
	Disconnect() error
	Close() error
}

func NewCentral() (Central, error) {
	blueZ, err := newBlueZ()
	if err != nil {
		return nil, err
	}
	return &central{blueZ, nil, nil}, err
}

func (c *central) Close() error {
	return c.blueZ.close()
}

func (c *central) findService(objs managedObjects, prefix string, id string) (properties, bool) {
	for path, v := range objs {
		if !strings.HasPrefix(string(path), prefix) {
			continue
		}
		data, ok := v[serviceIface]
		if !ok {
			continue
		}
		if unquote(data["UUID"].String()) != id {
			continue
		}
		return properties{path, data}, true
	}
	return properties{}, false
}

func (c *central) findCharacteristic(objs managedObjects, prefix string, id string, flag string) (properties, bool) {
	for path, v := range objs {
		if !strings.HasPrefix(string(path), prefix) {
			continue
		}
		data, ok := v[charIface]
		if !ok {
			continue
		}
		if unquote(data["UUID"].String()) != id {
			continue
		}
		flags := data["Flags"].Value().([]string)
		for _, f := range flags {
			if unquote(f) == flag {
				return properties{path, data}, true
			}
		}
		break
	}
	return properties{}, false
}

func (c *central) newConnection(device properties) error {
	var objs managedObjects
	if err := c.blueZ.root.callIface(objectManagerIface, "GetManagedObjects").Store(&objs); err != nil {
		return err
	}
	servicePrefix := string(device.path) + "/service"
	service, ok := c.findService(objs, servicePrefix, serviceUUID)
	if !ok {
		return ErrServiceNotFound
	}
	charPrefix := string(service.path) + "/char"
	ssidChar, ok := c.findCharacteristic(objs, charPrefix, ssidCharUUID, "write")
	if !ok {
		return ErrCharacteristicNotFound
	}
	securityChar, ok := c.findCharacteristic(objs, charPrefix, securityCharUUID, "notify")
	if !ok {
		return ErrCharacteristicNotFound
	}
	c.conn = &centralConn{device, service, ssidChar, securityChar}
	return nil
}

func (c *central) Connect() error {
	dev, ok, err := c.blueZ.findPairedDevice()
	if err != nil {
		return err
	}
	objects, done, err := c.blueZ.signalSubscribe()
	if err != nil {
		return err
	}
	defer close(done)
	devs := make(map[dbus.ObjectPath]map[string]dbus.Variant)
	var paired, connected bool
	var pairing, connecting dbus.ObjectPath
	if ok {
		devs[dev.path] = dev.data
		paired = true
		connecting = dev.path
		obj := c.blueZ.newObject(deviceIface, dev.path)
		if err = obj.connect(); err != nil {
			return err
		}
	} else {
		if err = c.blueZ.adapter.call(
			"SetDiscoveryFilter",
			map[string]any{"Transport": "le"},
		).Err; err != nil {
			return err
		}
		defer c.blueZ.adapter.call("SetDiscoveryFilter", map[string]any{})
		if err = c.blueZ.adapter.call("StartDiscovery").Err; err != nil {
			return err
		}
		defer c.blueZ.adapter.call("StopDiscovery")
	}
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
			dev = o.props
			if dev.data == nil {
				delete(devs, dev.path)
				continue
			}
			if _, ok := devs[dev.path]; ok {
				maps.Copy(devs[dev.path], dev.data)
			} else {
				if isDeviceName(dev.data) {
					devs[dev.path] = dev.data
				} else {
					continue
				}
			}
			obj := c.blueZ.newObject(deviceIface, dev.path)
			props := devs[dev.path]
			if !paired {
				switch pairing {
				case "":
					pairing = dev.path
					if err = obj.pair(); err != nil {
						return err
					}
				case dev.path:
					if isPropFlag(props, "Paired") {
						paired = true
					}
				}
			}
			if !paired {
				continue
			}
			if !connected {
				switch connecting {
				case "":
					connecting = dev.path
					if err = obj.connect(); err != nil {
						return err
					}
				case dev.path:
					if isPropFlag(props, "Connected") {
						connected = true
					}
				}
			}
			if !connected || !isPropFlag(props, "ServicesResolved") {
				continue
			}
			time.Sleep(safetyInterval)
			if err = c.newConnection(properties{dev.path, props}); err != nil {
				obj.call("Disconnect")
				return err
			}
			return nil
		}
	}
}

func (c *central) Disconnect() error {
	return c.blueZ.disconnect(c.conn.device.path)
}

func (c *central) WriteSSID(ssid string) error {
	if c.blueZ.isDisconnected() {
		return ErrDisconnected
	}
	return c.blueZ.newObject(charIface, c.conn.ssidChar.path).call(
		"WriteValue",
		[]byte(ssid),
		map[string]any{"type": "command"},
	).Err
}

func (c *central) StartNotifySecurity() (chan Security, error) {
	path := c.conn.securityChar.path
	objects, done, err := c.blueZ.signalSubscribe()
	if err != nil {
		return nil, err
	}
	obj := c.blueZ.newObject(charIface, path)
	if err = obj.call("StartNotify").Err; err != nil {
		close(done)
		return nil, err
	}
	security := make(chan Security)
	go func() {
		for {
			select {
			case <-done:
				close(security)
				obj.call("StopNotify")
				return
			case o := <-objects:
				if o.iface == deviceIface && o.props.path == c.conn.device.path {
					if !isPropFlag(o.props.data, "Connected") {
						done <- struct{}{}
						c.blueZ.setDisconnected(true)
					}
				} else if o.iface == charIface && o.props.path == path {
					if buf, ok := o.props.data["Value"].Value().([]byte); ok {
						security <- parseSecurity(buf)
					}
				}
			}
		}
	}()
	time.Sleep(safetyInterval)
	c.notifySecurityDone = done
	return security, nil
}

func (c *central) StopNotifySecurity() {
	time.Sleep(safetyInterval)
	close(c.notifySecurityDone)
}
