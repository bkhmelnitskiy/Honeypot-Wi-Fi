import threading
import logging
import time
from typing import Callable, List, Dict, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)


class AlertCollector:
    """Collects and aggregates threat detection alerts from all detectors."""
    
    def __init__(self):
        self.alerts: List[Dict] = []
        self.lock = threading.Lock()
    
    def add_alert(self, detector_name: str, alert_type: str, severity: str, message: str, details: Optional[Dict] = None):
        """Add an alert to the collection."""
        with self.lock:
            alert = {
                'timestamp': time.time(),
                'detector': detector_name,
                'type': alert_type,
                'severity': severity,
                'message': message,
                'details': details or {}
            }
            self.alerts.append(alert)
            logger.warning(f"[{detector_name}] {alert_type}: {message}")
    
    def get_alerts(self) -> List[Dict]:
        """Get all collected alerts."""
        with self.lock:
            return self.alerts.copy()
    
    def get_summary(self) -> Dict:
        """Get a summary of alerts by type."""
        summary = defaultdict(int)
        for alert in self.alerts:
            key = f"{alert['detector']}:{alert['type']}"
            summary[key] += 1
        return dict(summary)


class ScannerLauncher:
    """Orchestrates execution of all threat detection scanners."""
    
    def __init__(self, alert_collector: Optional[AlertCollector] = None):
        self.alert_collector = alert_collector or AlertCollector()
        self.managed_interface = None
        self.monitor_interface = None
    
    def set_interfaces(self, managed_interface: str, monitor_interface: Optional[str] = None):
        """Set the network interfaces to use for scanning."""
        self.managed_interface = managed_interface
        self.monitor_interface = monitor_interface
    
    def run_all_scanners(self, duration: int = 30) -> Dict:
        if not self.managed_interface:
            raise ValueError("Managed interface not set. Call set_interfaces() first.")
        
        logger.info(f"Starting scanners for {duration}s...")
        logger.info(f"  Managed interface: {self.managed_interface}")
        if self.monitor_interface:
            logger.info(f"  Monitor interface: {self.monitor_interface}")
        
        start_time = time.time()
        
        # Thread for managed-mode detectors (ARP, DNS, Scan)
        managed_thread = threading.Thread(
            target=self._run_managed_mode_detectors,
            args=(duration,),
            daemon=True
        )
        
        # Thread for monitor-mode detector (Evil Twin) - only if available
        monitor_thread = None
        if self.monitor_interface:
            monitor_thread = threading.Thread(
                target=self._run_monitor_mode_detectors,
                args=(duration,),
                daemon=True
            )
        
        # Start both threads
        managed_thread.start()
        if monitor_thread:
            monitor_thread.start()
        
        # Wait for completion with timeout
        managed_thread.join(timeout=duration + 5)
        if monitor_thread:
            monitor_thread.join(timeout=duration + 5)
        
        elapsed = time.time() - start_time
        logger.info(f"Scanners completed in {elapsed:.2f}s")
        
        return {
            'success': True,
            'duration': elapsed,
            'alerts': self.alert_collector.get_alerts(),
            'summary': self.alert_collector.get_summary()
        }
    
    def _run_managed_mode_detectors(self, duration: int):
        """Run detectors that work on managed mode interface."""
        try:
            # Import detectors here to avoid circular imports
            from scanner import arp_spoofing, dns_spoofing, scan
            
            # Initialize detectors
            logger.info("Initializing managed-mode detectors...")
            arp_spoofing.arp_spoofing_init(self.managed_interface, self.alert_collector)
            dns_spoofing.dns_spoofing_init(self.managed_interface, self.alert_collector)
            scan.scan_init(self.managed_interface, self.alert_collector)
            
            # Create callback to redirect prints to structured logging
            detector_callbacks = {
                'arp': arp_spoofing.detect_arp_spoof,
                'dns': dns_spoofing.detect_dns_spoof,
                'scan': scan.detect_scan
            }
            
            logger.info(f"Starting managed-mode packet capture for {duration}s...")
            
            # Run combined sniff with all managed-mode filters
            try:
                from scapy.all import sniff
                sniff(
                    filter="arp or (udp port 53) or ip or icmp",
                    iface=self.managed_interface,
                    prn=self._create_managed_handler(detector_callbacks),
                    timeout=duration,
                    store=0
                )
            except Exception as e:
                logger.error(f"Error during managed-mode sniffing: {e}")
        
        except Exception as e:
            logger.error(f"Error in managed-mode detectors: {e}", exc_info=True)
    
    def _run_monitor_mode_detectors(self, duration: int):
        """Run detectors that require monitor mode interface."""
        try:
            from scanner import evil_twin
            from scapy.all import sniff, Dot11
            
            logger.info("Starting monitor-mode packet capture for Evil Twin detection...")
            
            # Set the alert collector for evil_twin module
            evil_twin.set_alert_collector(self.alert_collector)
            
            sniff(
                filter="wlan type mgt subtype assoc-req or wlan type mgt subtype assoc-resp or wlan type mgt subtype deauth",
                iface=self.monitor_interface,
                prn=evil_twin.detect_evil_twin,
                timeout=duration,
                store=0
            )
        
        except Exception as e:
            logger.error(f"Error in monitor-mode detectors: {e}", exc_info=True)
    
    def _create_managed_handler(self, callbacks_dict: Dict[str, Callable]) -> Callable:
        """Create a packet handler that routes packets to appropriate detectors."""
        def handler(packet):
            # Route to appropriate detector(s)
            arp_callback = callbacks_dict.get('arp')
            dns_callback = callbacks_dict.get('dns')
            scan_callback = callbacks_dict.get('scan')
            
            try:
                # Try ARP detection
                if arp_callback:
                    try:
                        arp_callback(packet)
                    except Exception as e:
                        logger.debug(f"ARP callback error: {e}")
                
                # Try DNS detection
                if dns_callback:
                    try:
                        dns_callback(packet)
                    except Exception as e:
                        logger.debug(f"DNS callback error: {e}")
                
                # Try Scan detection
                if scan_callback:
                    try:
                        scan_callback(packet)
                    except Exception as e:
                        logger.debug(f"Scan callback error: {e}")
            
            except Exception as e:
                logger.debug(f"Packet handler error: {e}")
        
        return handler
