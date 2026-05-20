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
	fmt.Println("connecting to central...")
	if err = p.Connect(); err != nil {
		return err
	}
	fmt.Println("successfully connected to central")
	defer func() {
		fmt.Println("before p.Disconnect()")
		if err := p.Disconnect(); err != nil {
			fmt.Println("disconnected from central")
		}
		fmt.Println("after p.Disconnect()")
	}()
	ssid, done, err := p.NotifySSID()
	if err != nil {
		return err
	}
	fmt.Println("waiting for ssid notify...")
	defer func() {
		fmt.Println("before close(done)")
		close(done)
		fmt.Println("after close(done)")
	}()
	go func() {
		for {
			s := <-ssid
			if s == "" {
				fmt.Println("stopped receiving ssid")
				return
			}
			fmt.Printf("received ssid: %s\n", s)
		}
	}()
	fmt.Println("starting writing security...")
	start := time.Now()
	for {
		time.Sleep(1 * time.Second)
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
		if time.Since(start) >= 10*time.Second {
			fmt.Println("stopped writing security")
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
