from email import message

from scapy.all import DNS, DNSQR, sniff
import socket
import time
import logging

logger = logging.getLogger(__name__)

dev = "wlan0"
_alert_collector = None

dns_table = {}  # (txn_id, domain) -> ip_answers
dns_query_times = {}  # (txn_id, domain) -> timestamp
dns_responses = {}  # (txn_id, domain) -> list(ip_answers, timestamp)


def detect_dns_spoof(packet):
    global _alert_collector
    if packet.haslayer(DNS):
        dns = packet[DNS]

        key = (dns.id, dns.qd.qname.decode() if dns.qd else "unknown")

        # DNS request
        if dns.qr == 0 and dns.qd:
            dns_query_times[key] = time.time()
            # print(f"[REQ] {key[1]} (ID: {dns.id})")

        # DNS response
        elif dns.qr == 1 and dns.ancount > 0 and dns.qd:
            domain = dns.qd.qname.decode()
            txn_id = dns.id
            key = (txn_id, domain)

            ip_answers = []
            for i in range(dns.ancount):
                rr = dns.an[i]
                if rr.type == 1:  # A record
                    ip_answers.append(rr.rdata)

            if key in dns_table:
                if dns_table[key] != ip_answers:
                    message = f"DNS spoofing detected for {domain}: original={dns_table[key]}, spoofed={ip_answers}"
                    if _alert_collector:
                        _alert_collector.add_alert("DNS_SPOOFING", "DNS_SPOOF", "HIGH", message, {"domain": domain, "original_ips": dns_table[key], "spoofed_ips": ip_answers})
                    logger.warning("[!] DNS SPOOFING DETECTED!")
                    logger.warning(f"Domain : {domain}")
                    logger.warning(f"Original: {dns_table[key]}")
                    logger.warning(f"Spoofed : {ip_answers}")
            else:
                dns_table[key] = ip_answers

            now = time.time()
            if key not in dns_responses:
                dns_responses[key] = []
            dns_responses[key].append((ip_answers, now))

            if len(dns_responses[key]) > 1:
                message = f"Multiple DNS responses detected for {domain} - possible race attack"
                if _alert_collector:
                    _alert_collector.add_alert("DNS_SPOOFING", "DNS_RACE_ATTACK", "MEDIUM", message, {"domain": domain, "response_count": len(dns_responses[key])})
                logger.warning("[!] Multiple responses detected - possible race attack")
                
                for ans_list, t in dns_responses[key]:
                    print(f"{domain}: {ans_list} @ {t}")

            # print(f"[RES] {domain} -> {ip_answers} (ID: {dns.id})\n")


def dnssec_test():
    global _alert_collector
    import unbound

    ctx = unbound.ub_ctx()

    ctx.add_ta_file("/var/lib/unbound/root.key")
    ctx.resolvconf("/etc/resolv.conf")
    ctx.set_fwd("9.9.9.9")

    domains = ["ing.pl", "bankmillennium.pl", "pekao.com.pl", "proton.me", "paypal.com"]

    for domain in domains:
        ip = socket.gethostbyname(domain)
        status, result = ctx.resolve(domain, unbound.RR_TYPE_A, unbound.RR_CLASS_IN)
        if status == 0:
            print(f"{domain} answer:", result.data.address_list)

            if result.secure:
                print(f"[DNSSEC] {domain} is VALID")
                message = f"Detected dns spoofing for {domain}, ip:{ip}, result.data.address_list:{result.data.address_list}"
                if ip not in result.data.address_list:
                    if _alert_collector:
                        _alert_collector.add_alert("DNS_SPOOFING", "DNS_DNSSEC_SPOOF", "CRITICAL", message, {"domain": domain, "IPs": result.data.address_list})
                    print(message)
            elif result.bogus:
                print(f"[DNSSEC] {domain} is BOGUS")
            else:
                print(f"[DNSSEC] {domain} is INSECURE")
        else:
            print("Lookup failed:", status)


def dns_spoofing_init(_dev, alert_collector=None):
    global dev, _alert_collector
    dev = _dev
    _alert_collector = alert_collector

    dnssec_test()


if __name__ == "__main__":
    dnssec_test()
