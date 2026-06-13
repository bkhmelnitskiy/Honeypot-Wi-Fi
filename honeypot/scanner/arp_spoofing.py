from scapy.all import ARP, sniff
from sys import float_info
import os
import random
import time
import socket
import fcntl
import struct
import logging

logger = logging.getLogger(__name__)

dev = "wlan0"
ip_mac_table = {}
MY_IP = None
MY_MAC = None
ARP_CONSTS = {}
_alert_collector = None

def get_own_ip():
    global dev
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    return socket.inet_ntoa(fcntl.ioctl(
        s.fileno(),
        0x8915,  # SIOCGIFADDR
        struct.pack('256s', dev[:15].encode('utf-8'))
    )[20:24])

def get_own_mac():
    global dev
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    info = fcntl.ioctl(
        s.fileno(),
        0x8927,  # SIOCGIFHWADDR
        struct.pack('256s', dev[:15].encode('utf-8'))
    )
    mac = info[18:24]
    return ':'.join('%02x' % b for b in mac)


def get_arp_consts():
    global dev
    base_path = f"/proc/sys/net/ipv4/neigh/{dev}/" #TODO error handling on not existing dev
    for filename in os.listdir(base_path):
        file_path = os.path.join(base_path, filename)

        if os.path.isfile(file_path):
            try:
                with open(file_path, "r") as f:
                    value = f.read().strip()
                    ARP_CONSTS[filename] = int(value)
            except Exception as e:
                ARP_CONSTS[filename] = f"Error: {e}"

def cleanup_arp_table():
    now = time.time()
    to_delete = []

    for ip, (mac, ts) in ip_mac_table.items():
        if now - ts >= 0:
            to_delete.append(ip)

    for ip in to_delete:
        del ip_mac_table[ip]
        print(f"[ARP] Entry expired and removed: {ip}")


def detect_arp_spoof(packet):
    global _alert_collector
    cleanup_arp_table()
    if ARP in packet and packet[ARP].op == 2:
        print(packet.summary())
        ip = packet[ARP].psrc
        mac = packet[ARP].hwsrc

        if ip == MY_IP and mac != MY_MAC:
            message = f"ARP spoofing detected for this device (Old MAC: {MY_MAC}, New MAC: {mac})"
            if _alert_collector:
                _alert_collector.add_alert("ARP_Spoof", "ARP_SPOOF_LOCAL", "CRITICAL", message, {"old_mac": MY_MAC, "new_mac": mac})
            logger.warning(f"[!] {message}")
        elif ip in ip_mac_table:
            if ip_mac_table[ip][0] != mac:
                message = f"ARP spoofing detected for {ip} (Old MAC: {ip_mac_table[ip][0]}, New MAC: {mac})"
                if _alert_collector:
                    _alert_collector.add_alert("ARP_Spoof", "ARP_SPOOF", "CRITICAL", message, {"ip": ip, "old_mac": ip_mac_table[ip][0], "new_mac": mac})
                logger.warning(f"[!] {message}")
        else:
            base = ARP_CONSTS["base_reachable_time"]
            del_ts = random.randint(int(base*0.5), int(base*1.5))
            ip_mac_table[ip] = (mac, time.time()+del_ts)


def arp_spoofing_init(_dev, alert_collector=None):
    global MY_IP, MY_MAC, dev, _alert_collector
    dev = _dev
    _alert_collector = alert_collector
    MY_IP = get_own_ip()
    MY_MAC = get_own_mac()
    get_arp_consts()
