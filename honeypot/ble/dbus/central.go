package dbus

import (
	"errors"
	"maps"
	"slices"
	"strings"

	"github.com/godbus/dbus/v5"
	"github.com/google/uuid"
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
	blueZ *blueZ
	conn  *centralConn
}

type Central interface {
	Connect() error
	WriteSSID(ssid string) error
	NotifySecurity() (chan Security, chan struct{}, error)
	Disconnect() error
	Close() error
}

func NewCentral() (Central, error) {
	blueZ, err := newBlueZ()
	if err != nil {
		return nil, err
	}
	return &central{blueZ, nil}, err
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
		u, _ := uuid.FromBytes([]byte(data["UUID"].Value().(string)))
		if u.String() != id {
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
		u, _ := uuid.FromBytes([]byte(data["UUID"].Value().(string)))
		if u.String() != id {
			continue
		}
		flags := data["Flags"].Value().([]string)
		if slices.Contains(flags, flag) {
			return properties{path, data}, true
		} else {
			break
		}
	}
	return properties{}, false
}

func (c *central) newConnection(device properties) (*centralConn, error) {
	var objs managedObjects
	objs, err := c.blueZ.root.getManagedObjects()
	if err != nil {
		return nil, err
	}
	servicePrefix := string(device.path) + "/service"
	service, ok := c.findService(objs, servicePrefix, serviceUUID)
	if !ok {
		return nil, ErrServiceNotFound
	}
	charPrefix := string(service.path) + "/char"
	ssidChar, ok := c.findCharacteristic(objs, charPrefix, ssidCharUUID, "write")
	if !ok {
		return nil, ErrCharacteristicNotFound
	}
	securityChar, ok := c.findCharacteristic(objs, charPrefix, securityCharUUID, "notify")
	if !ok {
		return nil, ErrCharacteristicNotFound
	}
	return &centralConn{device, service, ssidChar, securityChar}, nil
}

func (c *central) Connect() error {
	honeypots := make(map[dbus.ObjectPath]map[string]dbus.Variant)
	var pairing, connecting dbus.ObjectPath
	var paired, connected bool
	d, ok, err := c.blueZ.findPairedDevice()
	if err != nil {
		return err
	}
	if ok {
		honeypots[d.path] = d.data
		paired = true
		connecting = d.path
		obj := c.blueZ.newObject(deviceIface, d.path)
		if err = obj.call("Connect").Err; err != nil {
			return err
		}
	}
	objects, done, err := c.blueZ.signalSubscribe()
	if err != nil {
		return err
	}
	defer close(done)
	if err = c.blueZ.adapter.call("StartDiscovery").Err; err != nil {
		return err
	}
	defer c.blueZ.adapter.call("StopDiscovery")
	for {
		o := <-objects
		if o.iface != deviceIface {
			continue
		}
		d = o.props
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
		obj := c.blueZ.newObject(deviceIface, d.path)
		honeypot := honeypots[d.path]
		if !paired && pairing == "" {
			pairing = d.path
			if err = obj.call("Pair").Err; err != nil {
				return err
			}
		} else if pairing == d.path {
			if honeypot["Paired"].Value().(bool) {
				paired = true
				pairing = ""
			}
		} else if paired && !connected && connecting == "" {
			connecting = d.path
			if err = obj.call("Connect").Err; err != nil {
				return err
			}
		} else {
			if connecting == d.path {
				if honeypot["Connected"].Value().(bool) {
					connected = true
					connecting = ""
				}
			}
			if connected {
				if honeypot["ServicesResolved"].Value().(bool) {
					connection, err := c.newConnection(properties{d.path, honeypot})
					if err != nil {
						obj.call("Disconnect")
						return err
					}
					c.conn = connection
					return nil
				}
			}
		}
	}
}

func (c *central) Disconnect() error {
	return c.blueZ.disconnect(c.conn.device.path)
}

func (c *central) WriteSSID(ssid string) error {
	obj := c.blueZ.newObject(charIface, c.conn.ssidChar.path)
	return obj.call("WriteValue", []byte(ssid), map[string]any{"type": "command"}).Err
}

func (c *central) NotifySecurity() (chan Security, chan struct{}, error) {
	path := c.conn.securityChar.path
	objects, done, err := c.blueZ.signalSubscribe()
	if err != nil {
		return nil, nil, err
	}
	obj := c.blueZ.newObject(charIface, path)
	if err := obj.call("StartNotify").Err; err != nil {
		close(done)
		return nil, nil, err
	}
	security := make(chan Security)
	go func() {
		for {
			select {
			case <-done:
				obj.call("StopNotify")
				return
			case o := <-objects:
				if o.iface != charIface || o.props.path != path {
					continue
				}
				if buf, ok := o.props.data["Value"].Value().([]byte); ok {
					security <- parseSecurity(buf)
				}
			}
		}
	}()
	return security, done, nil
}
