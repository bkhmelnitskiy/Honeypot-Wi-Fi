from scapy.all import sniff, Dot11
from arp_spoofing import detect_arp_spoof, arp_spoofing_init
from dns_spoofing import detect_dns_spoof
from evil_twin import detect_evil_twin
import threading

DEV = "wlp1s0"
DEV_MON = "wlx503dd136ac3f"

def sniff_managed_thread(dev):
    print(f"Managed interface {dev} sniff thread")
    arp_spoofing_init(dev)
    sniff(filter="arp or udp port 53", prn=detect_managed_handler, iface=dev, store=False)

def detect_managed_handler(packet):
    detect_arp_spoof(packet)
    detect_dns_spoof(packet)

def sniff_monitor_thread(dev):
    print(f"Monitor interface {dev} sniff thread")
    sniff(prn=detect_monitor_handler, iface=dev, store=False)

def detect_monitor_handler(packet):
    detect_evil_twin(packet)

threads = []

# sniff_managed_thread(DEV)

# DEV sniff
t = threading.Thread(target=sniff_managed_thread, args=(DEV, ))
t.start()
threads.append(t)

# DEV_MON sniff
t = threading.Thread(target=sniff_monitor_thread, args=(DEV_MON, ))
t.start()
threads.append(t)

for t in threads:
    t.join()
