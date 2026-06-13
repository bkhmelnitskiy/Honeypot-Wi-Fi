#!/usr/bin/env python3
import argparse
import logging
import sys
import signal
from typing import Optional

from scanner.wifi_api_client import WiFiAPIClient, WiFiAPIError
from scanner.interface_manager import InterfaceManager
from scanner.launcher import ScannerLauncher, AlertCollector

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Orchestrator:    
    def __init__(self, args):
        self.args = args
        self.api_client: Optional[WiFiAPIClient] = None
        self.interface_mgr: Optional[InterfaceManager] = None
        
        self.managed_interface = None
        self.monitor_interface = None
        self.target_network = None
        
        self.alert_collector = AlertCollector()
        self.scanner_launcher = ScannerLauncher(self.alert_collector)
        
        self._setup_signal_handlers()
    
    def _setup_signal_handlers(self):
        def signal_handler(signum, frame):
            logger.info("\nReceived interrupt signal, cleaning up...")
            self.cleanup()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def run(self) -> int:
        try:
            logger.info("="*80)
            logger.info("Wifi Honeypot - Starting")
            logger.info("="*80)
            
            # Step 1
            if not self._init_api_client():
                return 1
            
            # Step 2
            if not self._discover_interfaces():
                return 1
            
            # Step 3
            if not self._scan_networks():
                return 1
            
            # Step 4
            if not self._find_target_network():
                return 1
            
            # Step 5
            if not self._connect_to_network():
                return 1

            # Step 6: Run scanners (if enabled)
            if self.args.run_scans:
                if not self._run_scanners():
                    logger.warning("Scanners completed with errors or no threats detected")

            return 0
            
        except Exception as e:
            logger.error(f"Fatal error: {e}", exc_info=True)
            return 1
        finally:
            self.cleanup()
    
    def _init_api_client(self) -> bool:
        logger.info("[1/6] Initializing WiFi API client...")
        
        try:
            self.api_client = WiFiAPIClient(
                host=self.args.api_host,
                port=self.args.api_port,
                timeout=self.args.api_timeout
            )
            
            if self.api_client._check_connection():
                logger.info(f"[+] Connected to WiFi API at {self.api_client.base_url}")
                return True
            else:
                logger.error(f"[-] Cannot connect to WiFi API at {self.api_client.base_url}")
                logger.error(f"  Wifi API is not running")
                return False
        
        except Exception as e:
            logger.error(f"[-] Failed to initialize API client: {e}")
            return False
    
    def _discover_interfaces(self) -> bool:
        logger.info("[2/6] Discovering WiFi interfaces...")
        
        try:
            self.interface_mgr = InterfaceManager(self.api_client)
            interfaces = self.interface_mgr.discover_interfaces()
            
            if not interfaces:
                logger.error("[-] No WiFi interfaces found")
                return False
            
            logger.info(f"[+] Found {len(interfaces)} interface(s):")
            for iface in interfaces:
                logger.info(f"    - {iface.name} ({iface.state})")
            
            if self.args.interface:
                self.managed_interface = self.interface_mgr.get_interface_by_name(self.args.interface)
                if not self.managed_interface:
                    logger.error(f"[-] No managed mode interface found: {self.args.interface}")
                    return False
                logger.info(f"[+] Using managed mode interface: {self.managed_interface.name}")
            else:
                self.managed_interface = self.interface_mgr.get_managed_interface()
                if not self.managed_interface:
                    logger.error("[-] No managed mode interface found")
                    return False
                logger.info(f"[+] Using managed mode interface: {self.managed_interface.name}")
            
            if not self.args.no_monitor:
                self.monitor_interface = self.interface_mgr.get_monitor_interface()
                if self.monitor_interface:
                    logger.info(f"[+] Monitor interface available: {self.monitor_interface.name}")
                else:
                    logger.warning("[-] No monitor interface found (scanner won't run Evil Twin detection)")
            
            return True
        
        except WiFiAPIError as e:
            logger.error(f"[-] Failed to discover interfaces: {e}")
            return False
    
    def _scan_networks(self) -> bool:
        logger.info(f"[3/6] Scanning for networks on {self.managed_interface.name}...")
        
        try:
            self.api_client.scan_networks(
                self.managed_interface.id,
            )
            
            # if not success:
            #     logger.error(f"[-] Network scan did not complete")
            #     return False
            
            logger.info("[+] Network scan completed")
            return True
        
        except WiFiAPIError as e:
            logger.error(f"[-] Network scan failed: {e}")
            return False
    
    def _find_target_network(self) -> bool:
        logger.info("[4/6] Finding target network...")
        
        try:
            bss_list = self.api_client.get_bss_list(self.managed_interface.id)
            
            if not bss_list:
                logger.error("[-] No networks found in scan results")
                return False
            
            logger.info(f"[+] Found {len(bss_list)} networks in scan results:")
            
            target_found = None
            if self.args.bssid:
                target_bssid = self.args.bssid.upper()
                for network in bss_list:
                    if network.bssid.upper() == target_bssid:
                        target_found = network
                        break
                
                if not target_found:
                    logger.error(f"[-] Network with BSSID {self.args.bssid} not found")
                    return False
            
            elif self.args.ssid:
                for network in bss_list:
                    if network.ssid == self.args.ssid:
                        target_found = network
                        break
                
                if not target_found:
                    logger.error(f"[-] Network '{self.args.ssid}' not found")
                    return False
            
            else:
                logger.error("[-] No target network specified (--ssid or --bssid required)")
                return False
            
            self.target_network = target_found
            logger.info(f"[+] Found target network: {target_found.ssid or target_found.bssid}")
            logger.info(f" ID: {target_found.id}, BSSID: {target_found.bssid}, Security: {target_found.security}, Frequency: {target_found.frequency}MHz")
            return True
        
        except WiFiAPIError as e:
            logger.error(f"[-] Failed to find target network: {e}")
            return False
    
    def _connect_to_network(self) -> bool:
        logger.info(f"[5/6] Connecting to {self.target_network.ssid}...")
        
        try:
            requires_password = "wpa-none" not in self.target_network.security
            
            if requires_password and not self.args.psk:
                logger.error(f"[-] Network requires password ({self.target_network.security})")
                logger.error("  Provide password with --psk <password>")
                return False
            
            self.api_client.disconnect(self.managed_interface.id)
            self.api_client.connect(
                self.managed_interface.id,
                ssid=self.target_network.ssid,
                scan_ssid="0",
                key_mgmt=self.target_network.security[0],
                psk=self.args.psk if requires_password else None
            )
            
            logger.info(f"[+] Connected to {self.target_network.ssid}")
            return True
        
        except WiFiAPIError as e:
            logger.error(f"[-] Connection failed: {e}")
            return False
    
    def _run_scanners(self) -> bool:
        logger.info("[6/6] Running threat detection scanners...")
        
        try:
            # Set interfaces for scanner
            self.scanner_launcher.set_interfaces(
                managed_interface=self.managed_interface.name,
                monitor_interface=self.monitor_interface.name if self.monitor_interface else None
            )
            
            # Run all scanners
            results = self.scanner_launcher.run_all_scanners(duration=self.args.scan_duration)
            
            # Log results
            alerts = results.get('alerts', [])
            summary = results.get('summary', {})
            
            if alerts:
                logger.info(f"[+] Threat detection completed: Found {len(alerts)} alert(s)")
                for alert in alerts:
                    logger.info(f"    - [{alert['detector']}] {alert['type']}: {alert['message']}")
                
                if self.args.verbose:
                    logger.info("\nDetailed alerts:")
                    for alert in alerts:
                        logger.info(f"  {alert}")
            else:
                logger.info("[+] Threat detection completed: No threats detected")
            
            if summary:
                logger.info(f"[+] Alert summary: {summary}")
            
            return True
        
        except Exception as e:
            logger.error(f"[-] Error running scanners: {e}", exc_info=True)
            return False
    
    def cleanup(self):
        """Cleanup resources and disconnect."""
        logger.info("Cleaning up...")
        
        if self.api_client and self.managed_interface:
            try:
                logger.info(f"Disconnecting from {self.target_network.ssid if self.target_network else 'network'}...")
                self.api_client.disconnect(self.managed_interface.id)
                logger.info("✓ Disconnected")
            except Exception as e:
                logger.warning(f"Error disconnecting: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="WiFi Security Scanner - Detect threats on target network",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    # Target network selection (required, one of ssid/bssid)
    net_group = parser.add_argument_group('Target Network', 'Specify target network by SSID or BSSID')
    net_group.add_argument('--ssid', type=str, help='Target network SSID')
    net_group.add_argument('--bssid', type=str, help='Target network BSSID (MAC address)')
    net_group.add_argument('--psk', type=str, help='Network password (required for WPA networks)')
    
    # Interface configuration
    iface_group = parser.add_argument_group('WiFi Interface Configuration')
    iface_group.add_argument(
        '--interface', type=str, default=None,
        help='Specific WiFi interface to use (auto-detected if not specified)'
    )
    iface_group.add_argument(
        '--no-monitor', action='store_true',
        help='Disable monitor mode interface search (Evil Twin detection may be limited)'
    )
    
    # Scanner configuration
    scan_group = parser.add_argument_group('Threat Detection Scanners')
    scan_group.add_argument(
        '--run-scans', action='store_true', default=True,
        help='Run threat detection scanners after connecting (default: enabled)'
    )
    scan_group.add_argument(
        '--no-scans', action='store_false', dest='run_scans',
        help='Disable threat detection scanners'
    )
    scan_group.add_argument(
        '--scan-duration', type=int, default=30,
        help='How long to run scanners in seconds (default: 30)'
    )
    scan_group.add_argument(
        '--monitor-interface', type=str, default=None,
        help='Explicitly specify monitor mode interface for Evil Twin detection'
    )
    
    # API configuration
    api_group = parser.add_argument_group('Go REST API Service')
    api_group.add_argument(
        '--api-host', type=str, default='localhost',
        help='Wifi API service host (default: localhost)'
    )
    api_group.add_argument(
        '--api-port', type=int, default=3000,
        help='Go API service port (default: 3000)'
    )
    api_group.add_argument(
        '--api-timeout', type=float, default=10.0,
        help='API request timeout in seconds (default: 10.0)'
    )
      
    # Output options
    output_group = parser.add_argument_group('Output Options')
    output_group.add_argument(
        '-v', '--verbose', action='store_true',
        help='Print detailed alert information'
    )
    output_group.add_argument(
        '--log-level', type=str, default='INFO',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        help='Logging level (default: INFO)'
    )
    
    args = parser.parse_args()
    

    if not args.ssid and not args.bssid:
        parser.print_help()
        print("\n[-] Error: Either --ssid or --bssid is required")
        return 1
    
    logging.getLogger().setLevel(args.log_level)
    
    orchestrator = Orchestrator(args)
    return orchestrator.run()


if __name__ == "__main__":
    sys.exit(main())
