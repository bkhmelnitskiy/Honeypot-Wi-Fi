package main

import (
	"fmt"
	"os"

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
	// TODO
	return nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
}
