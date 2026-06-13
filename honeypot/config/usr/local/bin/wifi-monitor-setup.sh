#!/bin/bash

IFACE="wlan_mon"

# unblock wifi
/usr/sbin/rfkill unblock wifi

# bring interface down
ip link set "$IFACE" down

# enable monitor mode
iw dev "$IFACE" set type monitor

# bring interface up
ip link set "$IFACE" up
