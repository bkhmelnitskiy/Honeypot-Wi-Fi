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
	fmt.Println("connecting to peripheral...")
	if err = c.Connect(); err != nil {
		return err
	}
	fmt.Println("successfully connected to peripheral")
	defer func() {
		if err := c.Disconnect(); err != nil {
			fmt.Println("disconnected from peripheral")
		}
	}()
	security, done, err := c.NotifySecurity()
	if err != nil {
		return err
	}
	fmt.Println("waiting for security notify...")
	defer close(done)
	go func() {
		for {
			s := <-security
			if reflect.ValueOf(s).IsZero() {
				fmt.Println("stopped receiving security")
				return
			}
			fmt.Printf("received security: %d, %d, %d\n", s.Event, s.Level, s.Seconds)
		}
	}()
	fmt.Println("starting writing ssid...")
	start := time.Now()
	for {
		time.Sleep(1 * time.Second)
		i := rand.Int() % 50
		s := fmt.Sprintf("mysuperwifi%d", i)
		fmt.Printf("writing ssid: %s\n", s)
		if err = c.WriteSSID(s); err != nil {
			if err == dbus.ErrDisconnected {
				return nil
			} else {
				return err
			}
		}
		if time.Since(start) >= 10*time.Second {
			fmt.Println("stopped writing ssid")
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
