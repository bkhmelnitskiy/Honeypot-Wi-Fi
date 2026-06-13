from scapy.all import *
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

db = {}
_alert_collector = None

def extract_seq_retry(pkt):
    if pkt.haslayer(Dot11):
        sc = pkt[Dot11].SC
        seq = sc >> 4
        retry = (pkt[Dot11].FCfield & 0x08) >> 3
        return seq, retry
    return None, None

def extract_aid(pkt):
    if pkt.haslayer(Dot11AssoResp):
        return pkt[Dot11AssoResp].AID
    return None

def set_alert_collector(alert_collector):
    """Set the alert collector instance for this module."""
    global _alert_collector
    _alert_collector = alert_collector

# based on https://www.researchgate.net/publication/324215846_An_Efficient_Scheme_to_Detect_Evil_Twin_Rogue_Access_Point_Attack_in_80211_Wi-Fi_Networks
def detect_evil_twin(pkt):
    global db, _alert_collector

    # Deauthentication frame
    if pkt.type == 0 and pkt.subtype == 12:
        client = pkt.addr1
        if client in db:
            del db[client]
        return

    # Association Response
    if pkt.haslayer(Dot11AssoResp):
        client = pkt.addr1
        seq, retry = extract_seq_retry(pkt)
        aid = extract_aid(pkt)

        if client not in db:
            db[client] = {
                "R1": retry,
                "Seq1": seq,
                "AID1": aid
            }
            return

        entry = db[client]
        R1 = entry["R1"]
        Seq1 = entry["Seq1"]
        AID1 = entry["AID1"]

        R2 = retry
        Seq2 = seq
        AID2 = aid


        if R1 == 0:
            if R2 == 0:
                if Seq1 == Seq2:
                    message = f"Evil Twin Detected for {client}: Second Response Cannot have Retry Bit = 0 (R2 = 0) if it has the same sequence number as the first response."
                    if _alert_collector:
                        _alert_collector.add_alert("Evil_Twin", "EVIL_TWIN_CASE_1", "HIGH", message, {"client": client, "case": 1, "R1": R1, "R2": R2, "Seq1": Seq1, "Seq2": Seq2})
                    logger.warning(f"[!] Evil Twin Detected for {client}")
                    logger.warning("Reason: Second Response Cannot have Retry Bit = 0 (R2 = 0) if it has the same sequence number as the first response. (It has to be 1)")
                else:
                    message = f"Evil Twin Detected (Case 2) for {client}: No deauthentication frame is present between two responses, second response cannot have retry bit = 0"
                    if _alert_collector:
                        _alert_collector.add_alert("Evil_Twin", "EVIL_TWIN_CASE_2", "HIGH", message, {"client": client, "case": 2, "R1": R1, "R2": R2, "Seq1": Seq1, "Seq2": Seq2})
                    logger.warning(f"[!] Evil Twin Detected (Case 2) for {client}")
                    logger.warning("Reason: If, no deauthentication frame is present between two respones, second response cannot have retry bit = 0 (It has to be 1)")

            elif R2 == 1:
                if Seq1 == Seq2:
                    if AID1 == AID2:
                        message = f"Evil Twin Detected (Case 3) for {client}: Different AID for the same client by the same AP is not possible."
                        if _alert_collector:
                            _alert_collector.add_alert("Evil_Twin", "EVIL_TWIN_CASE_3", "HIGH", message, {"client": client, "case": 3, "R1": R1, "R2": R2, "Seq1": Seq1, "Seq2": Seq2, "AID1": AID1, "AID2": AID2})
                        logger.warning(f"[!] Evil Twin Detected (Case 3) for {client}")
                        logger.warning("Reason: Different AID for the same client by the same AP is not possible.")
                    else:
                        message = f"Evil Twin Detected (Case 4) for {client}: Retransmitted Frame cannot have different sequence number than original frame."
                        if _alert_collector:
                            _alert_collector.add_alert("Evil_Twin", "EVIL_TWIN_CASE_4", "HIGH", message, {"client": client, "case": 4, "R1": R1, "R2": R2, "Seq1": Seq1, "Seq2": Seq2, "AID1": AID1, "AID2": AID2})
                        logger.warning(f"[!] Evil Twin Detected (Case 4) for {client}")
                        logger.warning("Reason: Retransmitted Frame (Frames with retry bit set to 1) cannot have different sequence number than original frame.")
        elif R1 == 1:
            if R2 == 0:
                if Seq1 == Seq2:
                    message = f"Evil Twin Detected (Case 5) for {client}: Second Response Cannot have Retry Bit = 0 (R2 = 0) if it has the same sequence number as the first response."
                    if _alert_collector:
                        _alert_collector.add_alert("Evil_Twin", "EVIL_TWIN_CASE_5", "HIGH", message, {"client": client, "case": 5, "R1": R1, "R2": R2, "Seq1": Seq1, "Seq2": Seq2})
                    logger.warning(f"[!] Evil Twin Detected (Case 5) for {client}")
                    logger.warning("Reason: Second Response Cannot have Retry Bit = 0 (R2 = 0) if it has the same sequence number as the first response. (It has to be 1)")
                else:
                    message = f"Evil Twin Detected (Case 6) for {client}: No deauthentication frame is present between two responses, second response cannot have retry bit = 0"
                    if _alert_collector:
                        _alert_collector.add_alert("Evil_Twin", "EVIL_TWIN_CASE_6", "HIGH", message, {"client": client, "case": 6, "R1": R1, "R2": R2, "Seq1": Seq1, "Seq2": Seq2})
                    logger.warning(f"[!] Evil Twin Detected (Case 6) for {client}")
                    logger.warning("Reason: If, no deauthentication frame is present between two respones, second response cannot have retry bit = 0 (It has to be 1)")


            elif R2 == 1:
                if Seq1 == Seq2:
                    if AID1 == AID2:
                        message = f"Evil Twin Detected (Case 7) for {client}: Different AID for the same client by the same AP is not possible."
                        if _alert_collector:
                            _alert_collector.add_alert("Evil_Twin", "EVIL_TWIN_CASE_7", "HIGH", message, {"client": client, "case": 7, "R1": R1, "R2": R2, "Seq1": Seq1, "Seq2": Seq2, "AID1": AID1, "AID2": AID2})
                        logger.warning(f"[!] Evil Twin Detected (Case 7) for {client}")
                        logger.warning("Reason: Different AID for the same client by the same AP is not possible.")

                    else:
                        message = f"Evil Twin Detected (Case 8) for {client}: Retransmitted Frame cannot have different sequence number than original frame."
                        if _alert_collector:
                            _alert_collector.add_alert("Evil_Twin", "EVIL_TWIN_CASE_8", "HIGH", message, {"client": client, "case": 8, "R1": R1, "R2": R2, "Seq1": Seq1, "Seq2": Seq2, "AID1": AID1, "AID2": AID2})
                        logger.warning(f"[!] Evil Twin Detected (Case 8) for {client}")
                        logger.warning("Reason: Retransmitted Frame (Frames with retry bit set to 1) cannot have different sequence number than original frame.")


        db[client] = {
            "R1": R2,
            "Seq1": Seq2,
            "AID1": AID2
        }

def start_sniff(interface):
    print(f"[INFO] Starting sniff on {interface}...")
    sniff(filter="wlan type mgt subtype assoc-req or type mgt subtype assoc-resp or type mgt subtype deauth", iface=interface, prn=handle_packet, store=0)

if __name__ == "__main__":
    iface = "wlx503dd136ac3f"
    start_sniff(iface)
