package main

import (
	"fmt"
	"math/rand"
	"os"
	"reflect"
	"time"

	"github.com/bkhmelnitskiy/Honeypot-Wi-Fi/honeypot/ble/dbus"
)

func run() error {
	c, err := dbus.NewCentral()
	if err != nil {
		return err
	}
	defer c.Close()
	if err = c.Connect(); err != nil {
		return err
	}
	defer c.Disconnect()
	security, done, err := c.NotifySecurity()
	if err != nil {
		return err
	}
	defer close(done)
	go func() {
		for {
			s := <-security
			if reflect.ValueOf(s).IsZero() {
				return
			}
			fmt.Printf("received security: %d, %d, %d\n", s.Event, s.Level, s.Seconds)
		}
	}()
	start := time.Now()
	for {
		i := rand.Int() % 50
		ssid := fmt.Sprintf("mysuperwifi%d", i)
		fmt.Printf("writing ssid: %s\n", ssid)
		if err = c.WriteSSID(ssid); err != nil {
			return err
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
