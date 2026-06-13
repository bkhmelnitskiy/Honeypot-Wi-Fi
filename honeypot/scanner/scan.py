from scapy.all import sniff, TCP, UDP, IP, ICMP
from collections import defaultdict
import time
import socket
import fcntl
import struct
import logging

logger = logging.getLogger(__name__)

dev = "wlan0"
_alert_collector = None
MY_IP = None

tcp_syn_count = defaultdict(int)
udp_count = defaultdict(int)
fin_count = defaultdict(int)
xmas_count = defaultdict(int)
icmp_count = defaultdict(int)

THRESHOLD = 10
ICMP_THRESHOLD = 2
TIME_WINDOW = 10

last_seen = defaultdict(lambda: time.time())


def get_own_ip():
    global dev
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    return socket.inet_ntoa(
        fcntl.ioctl(
            s.fileno(),
            0x8915,  # SIOCGIFADDR
            struct.pack("256s", dev[:15].encode("utf-8")),
        )[20:24]
    )


def detect_scan(packet):
    global _alert_collector
    src = packet[IP].src
    dst = packet[IP].dst

    if dst != MY_IP:
        return

    now = time.time()

    if now - last_seen[src] > TIME_WINDOW:
        tcp_syn_count[src] = 0
        udp_count[src] = 0
        fin_count[src] = 0
        xmas_count[src] = 0
        icmp_count[src] = 0

    last_seen[src] = now

    if TCP in packet:
        flags = packet[TCP].flags
        if flags == "S":
            tcp_syn_count[src] += 1
            if tcp_syn_count[src] > THRESHOLD:
                message = f"Possible TCP SYN scan from {src}"
                if _alert_collector:
                    _alert_collector.add_alert("NETWORK_SCAN", "TCP_SYN_SCAN", "HIGH", message, {"source_ip": src})
                logger.warning(f"[!] {message}")
        elif flags == "F":
            fin_count[src] += 1
            if fin_count[src] > THRESHOLD:
                message = f"Possible FIN scan from {src}"
                if _alert_collector:
                    _alert_collector.add_alert("NETWORK_SCAN", "FIN_SCAN", "HIGH", message, {"source_ip": src})
                logger.warning(f"[!] {message}")
        elif flags == "FPU":
            xmas_count[src] += 1
            if xmas_count[src] > THRESHOLD:
                message = f"Possible Xmas scan from {src}"
                if _alert_collector:
                    _alert_collector.add_alert("NETWORK_SCAN", "XMAS_SCAN", "CRITICAL", message, {"source_ip": src})
                logger.warning(f"[!] {message}")
    elif UDP in packet:
        udp_count[src] += 1
        if udp_count[src] > THRESHOLD:
            message = f"Possible UDP scan from {src}"
            if _alert_collector:
                _alert_collector.add_alert("NETWORK_SCAN", "UDP_SCAN", "LOW", message, {"source_ip": src})
            logger.warning(f"[!] {message}")
    elif ICMP in packet:
        if packet[ICMP].type == 8:
            icmp_count[src] += 1
            if icmp_count[src] > ICMP_THRESHOLD:
                message = f"Possible ICMP scan from {src}"
                if _alert_collector:
                    _alert_collector.add_alert("NETWORK_SCAN", "ICMP_SCAN", "LOW", message, {"source_ip": src})
                logger.warning(f"[!] {message}")


def scan_init(_dev, alert_collector=None):
    global MY_IP, _alert_collector
    MY_IP = get_own_ip()
    _alert_collector = alert_collector


if __name__ == "__main__":
    scan_init(dev)
    print("Starting packet capture...")
    sniff(filter="ip or icmp", iface=dev, prn=detect_scan, store=0)
