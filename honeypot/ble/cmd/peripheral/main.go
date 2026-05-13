package main

import (
	"fmt"
	"math/rand"
	"os"
	"time"

	"github.com/bkhmelnitskiy/Honeypot-Wi-Fi/honeypot/ble/dbus"
)

func run() error {
	p, err := dbus.NewPeripheral()
	if err != nil {
		return err
	}
	defer p.Close()
	if err = p.Connect(); err != nil {
		return err
	}
	defer p.Disconnect()
	ssid, done, err := p.NotifySSID()
	if err != nil {
		return err
	}
	defer close(done)
	go func() {
		for {
			s := <-ssid
			if s == "" {
				return
			}
			fmt.Printf("received ssid: %s\n", s)
		}
	}()
	start := time.Now()
	for {
		s := dbus.Security{
			Level:   dbus.SecurityLevel(rand.Int() % 5),
			Event:   dbus.SecurityEvent(rand.Int() % 4),
			Seconds: rand.Int() % 600,
		}
		fmt.Printf("writing security: %d, %d, %d\n", s.Event, s.Level, s.Seconds)
		if err = p.WriteSecurity(s); err != nil {
			if err == dbus.ErrDisconnected {
				return nil
			} else {
				return err
			}
		}
		time.Sleep(1 * time.Second)
		if time.Since(start) >= 10*time.Second {
			return nil
		}
	}
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
}
