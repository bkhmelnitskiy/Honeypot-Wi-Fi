#!/usr/bin/env python3
"""
REST API Server for WiFi Honeypot Scanner

Provides HTTP endpoints to:
- Check system health (GET /health)
- Discover available networks (GET /networks)
- Start scans (POST /scan)
- Check scan status (GET /scan/status)
- Retrieve alerts (GET /alerts)
"""

import os
import sys
import uuid
import logging
import threading
import time
from datetime import datetime
from typing import Optional, Dict, List
from collections import defaultdict
import math

from flask import Flask, request, jsonify

# Add parent directory to path for scanner imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from scanner.wifi_api_client import WiFiAPIClient, WiFiAPIError, Interface
from scanner.interface_manager import InterfaceManager
from scanner.launcher import ScannerLauncher, AlertCollector

DEVICE_ID = "RPI Honeypot"
FIRMWARE_VERSION = "1.0.0"
BATTERY_PCT = 41

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)


class ScanManager:
    """Manages active and completed scans with thread-safe operations."""
    
    def __init__(self):
        self.scans: Dict[str, Dict] = {}
        self.lock = threading.Lock()
    
    def create_scan(self, target_ssid: Optional[str] = None, target_bssid: Optional[str] = None) -> str:
        """Create a new scan entry and return scan_id."""
        with self.lock:
            scan_id = f"{uuid.uuid4()}"
            self.scans[scan_id] = {
                'scan_id': scan_id,
                'status': 'INITIALIZING',  # pending, running, completed, failed
                'target_ssid': target_ssid,
                'target_bssid': target_bssid,
                'start_time': time.time(),
                'end_time': None,
                'elapsed_time': 0,
                'alert_count': 0,
                'alerts': [],
                'summary': {},
                'error': None
            }
            return scan_id
    
    def get_scan(self, scan_id: str) -> Optional[Dict]:
        """Get a scan by ID."""
        with self.lock:
            return self.scans.get(scan_id)
    
    def update_scan_status(self, scan_id: str, status: str):
        """Update scan status."""
        with self.lock:
            if scan_id in self.scans:
                self.scans[scan_id]['status'] = status
    
    def complete_scan(self, scan_id: str, alerts: List[Dict], summary: Dict, error: Optional[str] = None):
        """Mark scan as completed and store results."""
        with self.lock:
            if scan_id in self.scans:
                self.scans[scan_id]['status'] = 'ERROR' if error else 'COMPLETED'
                self.scans[scan_id]['end_time'] = time.time()
                self.scans[scan_id]['elapsed_time'] = self.scans[scan_id]['end_time'] - self.scans[scan_id]['start_time']
                self.scans[scan_id]['alerts'] = alerts
                self.scans[scan_id]['alert_count'] = len(alerts)
                self.scans[scan_id]['summary'] = summary
                self.scans[scan_id]['error'] = error
    
    def get_all_scans(self) -> List[Dict]:
        """Get all scans."""
        with self.lock:
            return list(self.scans.values())


class ScanRunner:
    """Executes a full scan workflow on a target network."""
    
    def __init__(self, api_client: WiFiAPIClient, managed_interface, 
                 monitor_interface, target_ssid: Optional[str], 
                 target_bssid: Optional[str], psk: Optional[str]):
        self.api_client = api_client
        self.managed_interface = managed_interface
        self.monitor_interface = monitor_interface
        self.target_ssid = target_ssid
        self.target_bssid = target_bssid
        self.psk = psk
        self.alert_collector = AlertCollector()
    
    def execute(self, scan_id: str, scan_manager: ScanManager, scan_duration: int = 30) -> bool:
        """Execute the full scan workflow."""
        try:
            logger.info(f"[{scan_id}] Starting scan workflow...")
            scan_manager.update_scan_status(scan_id, 'CONNECTING')
            
            # Step 0: Run scan
            self.api_client.scan_networks(self.managed_interface.id)

            # Step 1: Find target network in BSS list
            logger.info(f"[{scan_id}] Finding target network...")
            bss_list = self.api_client.get_bss_list(self.managed_interface.id)
            
            if not bss_list:
                raise ValueError("No networks found in scan results")
            
            target_network = None
            if self.target_bssid:
                target_bssid_upper = self.target_bssid.upper()
                for network in bss_list:
                    if network.bssid.upper() == target_bssid_upper:
                        target_network = network
                        break
                if not target_network:
                    raise ValueError(f"Network with BSSID {self.target_bssid} not found")
            
            elif self.target_ssid:
                for network in bss_list:
                    if network.ssid == self.target_ssid:
                        target_network = network
                        break
                if not target_network:
                    raise ValueError(f"Network '{self.target_ssid}' not found")
            
            else:
                raise ValueError("No target network specified")
            
            logger.info(f"[{scan_id}] Found target: {target_network.ssid or target_network.bssid}")
            
            # Step 2: Connect to target network
            logger.info(f"[{scan_id}] Connecting to {target_network.ssid}...")
            requires_password = bool(target_network.security) and "wpa-none" not in target_network.security
            print(requires_password, target_network.security)
            
            if requires_password and not self.psk:
                raise ValueError(f"Network requires password ({target_network.security})")
            
            try:
                self.api_client.disconnect(self.managed_interface.id)
            except:
                pass  # Ignore disconnect errors
            security = target_network.security[0] if target_network.security else "wpa-none"
            self.api_client.connect(
                self.managed_interface.id,
                ssid=target_network.ssid,
                scan_ssid="0",
                key_mgmt=security,
                psk=self.psk if requires_password else ""
            )
            
            logger.info(f"[{scan_id}] Connected successfully")
            time.sleep(15)
            scan_manager.update_scan_status(scan_id, 'CONNECTED')
            
            # Step 3: Run threat detection scanners
            logger.info(f"[{scan_id}] Starting threat detection (duration: {scan_duration}s)...")
            scan_manager.update_scan_status(scan_id, 'SCANNING')

            
            scanner_launcher = ScannerLauncher(self.alert_collector)
            scanner_launcher.set_interfaces(
                managed_interface=self.managed_interface.name,
                monitor_interface=self.monitor_interface.name if isinstance(self.monitor_interface, Interface) else self.monitor_interface
            )
            
            results = scanner_launcher.run_all_scanners(duration=scan_duration)
            
            alerts = results.get('alerts', [])
            summary = results.get('summary', {})
            
            logger.info(f"[{scan_id}] Scan completed: {len(alerts)} alert(s)")
            
            # Step 4: Disconnect and store results
            try:
                self.api_client.disconnect(self.managed_interface.id)
            except:
                pass  # Ignore disconnect errors
            
            scan_manager.complete_scan(scan_id, alerts, summary)
            return True
        
        except Exception as e:
            logger.error(f"[{scan_id}] Scan failed: {e}", exc_info=True)
            scan_manager.complete_scan(scan_id, [], {}, error=str(e))
            return False


def create_app():
    """Create and configure Flask app."""
    return app

def freq_to_channel(freq_mhz):
    if 2412 <= freq_mhz <= 2472:
        return (freq_mhz - 2412) // 5 + 1

    if 5170 <= freq_mhz <= 5825:
        return (freq_mhz - 5000) // 5

    return 0

def get_uptime():
    with open("/proc/uptime") as f:
        uptime_seconds = float(f.readline().split()[0])

    return uptime_seconds

# ============================================================================
# ROUTES
# ============================================================================

# Global scan manager
scan_manager = ScanManager()

@app.route('/health', methods=['GET'])
def health():
    """
    Check orchestrator health status.
    
    Returns comprehensive status of:
    - WiFi API connectivity
    - Managed mode interface availability
    - Scan capability
    - Monitor mode interface availability
    
    Status levels:
    - healthy: All critical components working
    - degraded: Critical components OK, optional components missing
    - unhealthy: Critical components missing
    """
    try:
        api_client = WiFiAPIClient(host='localhost', port=3000, timeout=5.0)
        
        # Check API availability
        api_available = api_client._check_connection()
        if not api_available:
            return jsonify({
                'status': 'unhealthy',
                'components': {
                    'api_available': False,
                    'managed_interface': False,
                    'scan_capability': False,
                    'monitor_interface': False
                },
                'ready_to_scan': False,
                'message': 'WiFi API is not reachable'
            }), 503
        
        # Check interfaces
        interface_mgr = InterfaceManager(api_client)
        interfaces = interface_mgr.discover_interfaces()
        
        managed_iface = interface_mgr.get_managed_interface()
        monitor_iface = "wlan_mon" #interface_mgr.get_monitor_interface()
        
        managed_interface_available = managed_iface is not None
        monitor_interface_available = monitor_iface is not None
        
        # Check scan capability (managed interface in completed state)
        scan_capability = managed_interface_available and (managed_iface.state == 'completed')
        
        # Determine overall status
        if api_available and managed_interface_available and scan_capability:
            status = 'healthy'
            message = 'System ready to scan target networks'
        elif api_available and managed_interface_available:
            status = 'degraded'
            message = 'System ready to scan (monitor mode unavailable for Evil Twin detection)'
        else:
            status = 'unhealthy'
            message = 'Critical components missing - cannot perform scans'
        
        return jsonify({
            'status': status,
            'components': {
                'api_available': api_available,
                'managed_interface': managed_interface_available,
                'scan_capability': scan_capability,
                'monitor_interface': monitor_interface_available
            },
            'ready_to_scan': (status in ['healthy', 'degraded']),
            'message': message
        }), 200
    
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return jsonify({
            'status': 'unhealthy',
            'components': {
                'api_available': False,
                'managed_interface': False,
                'scan_capability': False,
                'monitor_interface': False
            },
            'ready_to_scan': False,
            'message': f'Health check error: {str(e)}'
        }), 503

@app.route('/device_info', methods=['GET'])
def device_info():
    try:
        api_client = WiFiAPIClient(host='localhost', port=3000, timeout=10.0)
        interface_mgr = InterfaceManager(api_client)
        
        interfaces = interface_mgr.discover_interfaces()
        if not interfaces:
            return jsonify({
                'status': 'error',
                'error': 'No WiFi interfaces found'
            }), 503
        
        managed_iface = interface_mgr.get_managed_interface()
        monitor_iface = "wlan_mon"

        managed_iface_mac = managed_iface.mac if managed_iface else '00:00:00:00:00:00'
        monitor_iface_mac = monitor_iface.mac if isinstance(monitor_iface, Interface) else '00:00:00:00:00:00'

        return jsonify({
            'device_id': DEVICE_ID,
            'firmware_version': FIRMWARE_VERSION,
            'hardware_model': 'RPi 4',
            'wlan0_mac': managed_iface_mac,
            'wlan1_mac': monitor_iface_mac,
            'battery_pct': BATTERY_PCT,
            'storage_free_mb': 2137,
            'total_scans_performed': len(scan_manager.get_all_scans()),
        }), 200
    except Exception as e:
        logger.error(f"Device info fetch failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'Device info fetch failed',
            'details': str(e)
        }), 500

@app.route('/device_status', methods=['GET'])
def device_status():
    try:
        # api_client = WiFiAPIClient(host='localhost', port=3000, timeout=10.0)
        # interface_mgr = InterfaceManager(api_client)
        
        # interfaces = interface_mgr.discover_interfaces()
        # if not interfaces:
        #     return jsonify({
        #         'status': 'error',
        #         'error': 'No WiFi interfaces found'
        #     }), 503
        
        # managed_iface = interface_mgr.get_managed_interface()
        # monitor_iface = interface_mgr.get_monitor_interface()

        # managed_iface_mac = managed_iface.mac if managed_iface else '00:00:00:00:00:00'
        # monitor_iface_mac = monitor_iface.mac if monitor_iface else '00:00:00:00:00:00'

        return jsonify({
            'status': 'OK',
            'battery_pct': BATTERY_PCT,
            'firmware': FIRMWARE_VERSION,
            'uptime_sec': get_uptime(),
            'wlan0_state': 'IDLE',
            'wlan1_state': 'IDLE',
            'active_scan': None,
            'pending_results': 1,
        }), 200
    except Exception as e:
        logger.error(f"Device info fetch failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'Device info fetch failed',
            'details': str(e)
        }), 500

@app.route('/networks', methods=['GET'])
def get_networks():
    """
    List available WiFi networks discovered on the managed interface.
    
    Returns:
    {
        "status": "success",
        "networks": [
            {
                "id": "network_id",
                "bssid": "AA:BB:CC:DD:EE:FF",
                "ssid": "MyNetwork",
                "channel": 5,
                "frequency": 2437,
                "security": "WPA2-PSK, ..."
            },
            ...
        ]
    }
    """
    try:
        api_client = WiFiAPIClient(host='localhost', port=3000, timeout=10.0)
        interface_mgr = InterfaceManager(api_client)
        
        managed_iface = interface_mgr.get_managed_interface()
        if not managed_iface:
            return jsonify({
                'status': 'error',
                'error': 'No managed mode interface found',
                'networks': []
            }), 400
        
        # Trigger scan
        logger.info("Scanning for networks...")
        api_client.scan_networks(managed_iface.id)
        
        # Get BSS list
        bss_list = api_client.get_bss_list(managed_iface.id)
        
        networks = []
        for bss in bss_list:
            networks.append({
                'id': bss.id,
                'bssid': bss.bssid,
                'ssid': bss.ssid,
                'channel': freq_to_channel(bss.frequency),
                'frequency': bss.frequency,
                'security': ", ".join(bss.security)
            })
        
        return jsonify({
            'status': 'success',
            'networks': networks
        }), 200
    
    except WiFiAPIError as e:
        logger.error(f"Network discovery failed: {e}")
        return jsonify({
            'status': 'error',
            'error': 'WiFi API error',
            'details': str(e),
            'networks': []
        }), 503
    
    except Exception as e:
        logger.error(f"Network listing failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'Network listing failed',
            'details': str(e),
            'networks': []
        }), 500


@app.route('/scan', methods=['POST'])
def start_scan():
    """
    Start a scan on a target network.
    
    Request body:
    {
        "ssid": "MyNetwork",  // OR "bssid": "AA:BB:CC:DD:EE:FF"
        "psk": "password",     // Required if network uses WPA
        "duration": 60
    }
    
    Returns:
    {
        "status": "success",
        "scan_id": "scan_abc123...",
        "message": "Scan started",
        "target": {"ssid": "MyNetwork", "bssid": "..."}
    }
    """
    try:
        data = request.get_json() or {}
        
        target_ssid = data.get('ssid')
        target_bssid = data.get('bssid')
        psk = data.get('psk')
        scan_duration = data.get('duration', 30)
        
        # Validate input
        if not target_ssid and not target_bssid:
            return jsonify({
                'status': 'error',
                'error': 'Missing target',
                'details': 'Either "ssid" or "bssid" is required'
            }), 400
        
        if not isinstance(scan_duration, int) or scan_duration < 1 or scan_duration > 300:
            scan_duration = 30
        
        # Initialize API client and interfaces
        api_client = WiFiAPIClient(host='localhost', port=3000, timeout=10.0)
        interface_mgr = InterfaceManager(api_client)
        
        interfaces = interface_mgr.discover_interfaces()
        if not interfaces:
            return jsonify({
                'status': 'error',
                'error': 'No WiFi interfaces found'
            }), 503
        
        managed_iface = interface_mgr.get_managed_interface()
        monitor_iface = "wlan_mon" #interface_mgr.get_monitor_interface()
        
        if not managed_iface:
            return jsonify({
                'status': 'error',
                'error': 'No managed mode interface available'
            }), 503
        
        # Create scan entry
        scan_id = scan_manager.create_scan(target_ssid, target_bssid)
        
        # Create ScanRunner
        runner = ScanRunner(
            api_client=api_client,
            managed_interface=managed_iface,
            monitor_interface=monitor_iface,
            target_ssid=target_ssid,
            target_bssid=target_bssid,
            psk=psk
        )
        
        # Start scan in background thread
        scan_thread = threading.Thread(
            target=runner.execute,
            args=(scan_id, scan_manager, scan_duration),
            daemon=True
        )
        scan_thread.start()
        
        return jsonify({
            'status': 'success',
            'scan_id': scan_id,
            'message': 'Scan started',
            'target': {
                'ssid': target_ssid,
                'bssid': target_bssid
            }
        }), 202
    
    except Exception as e:
        logger.error(f"Scan initiation failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'Scan initiation failed',
            'details': str(e)
        }), 500


@app.route('/scan/status', methods=['GET'])
def get_scan_status():
    """
    Get the status of a scan.
    
    Query parameters:
    - scan_id (required): The scan ID returned from POST /scan
    
    Returns:
    {
        "status": "success",
        "scan": {
            "scan_id": "scan_abc123...",
            "status": "pending|running|completed|failed",
            "target_ssid": "MyNetwork",
            "target_bssid": "...",
            "start_time": 1716000000.0,
            "elapsed_time": 45.2,
            "alert_count": 3,
            "summary": {"ARP_Spoof:ARP_SPOOF": 1, ...},
            "message": "..."
        }
    }
    """
    try:
        scan_id = request.args.get('scan_id')
        
        if not scan_id:
            return jsonify({
                'status': 'error',
                'error': 'Missing scan_id parameter'
            }), 400
        
        scan = scan_manager.get_scan(scan_id)
        if not scan:
            return jsonify({
                'status': 'error',
                'error': f'Scan "{scan_id}" not found'
            }), 404
        
        # Add elapsed time for running scans
        if scan['status'] in ['pending', 'running']:
            scan['elapsed_time'] = time.time() - scan['start_time']
        
        return jsonify({
            'status': 'success',
            'scan': {
                'scan_id': scan['scan_id'],
                'status': scan['status'],
                'target_ssid': scan['target_ssid'],
                'target_bssid': scan['target_bssid'],
                'start_time': scan['start_time'],
                'elapsed_time': scan['elapsed_time'],
                'alert_count': scan['alert_count'],
                'summary': scan['summary'],
                'message': scan['error'] if scan['error'] else f"Scan {scan['status']}"
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Status check failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'Status check failed',
            'details': str(e)
        }), 500


@app.route('/alerts', methods=['GET'])
def get_alerts():
    """
    Get alerts from a completed scan.
    
    Query parameters:
    - scan_id (required): The scan ID
    
    Returns:
    {
        "status": "success",
        "scan_id": "scan_abc123...",
        "alerts": [
            {
                "timestamp": 1716000000.123,
                "detector": "ARP_Spoof",
                "type": "ARP_SPOOF",
                "message": "ARP spoofing detected for 192.168.1.1",
                "details": {"ip": "192.168.1.1", "old_mac": "...", "new_mac": "..."}
            },
            ...
        ],
        "summary": {
            "ARP_Spoof:ARP_SPOOF": 2,
            "DNS_Spoof:DNS_SPOOF": 1,
            ...
        }
    }
    """
    try:
        scan_id = request.args.get('scan_id')
        
        if not scan_id:
            return jsonify({
                'status': 'error',
                'error': 'Missing scan_id parameter'
            }), 400
        
        scan = scan_manager.get_scan(scan_id)
        if not scan:
            return jsonify({
                'status': 'error',
                'error': f'Scan "{scan_id}" not found'
            }), 404
        
        if scan['status'] == 'pending':
            return jsonify({
                'status': 'error',
                'error': f'Scan has not started yet'
            }), 400
        
        if scan['status'] == 'running':
            return jsonify({
                'status': 'error',
                'error': f'Scan is still running, alerts not yet available'
            }), 400
        
        DETECTOR_BASE_CONFIDENCE = {
            "DNS_SPOOFING": 0.60,
            "ARP_SPOOFING": 0.70,
            "EVIL_TWIN": 0.40,
            "NETWORK_SCAN": 0.20,
        }

        K_CONFIDENCE = {
            "DNS_SPOOFING": 1,
            "ARP_SPOOFING": 0.70,
            "EVIL_TWIN": 0.40,
            "NETWORK_SCAN": 0.15,
        }

        SEVERITY_SCORE = {
            "INFO": 1,
            "LOW": 2,
            "MEDIUM": 3,
            "HIGH": 4,
            "CRITICAL": 5,
        }

        SCORE_TO_SEVERITY = {v: k for k, v in SEVERITY_SCORE.items()}

        attacks = {}

        for alert in scan["alerts"]:
            detector = alert["detector"]

            if detector not in attacks:
                attacks[detector] = {
                    "attack_type": detector,
                    "severity_score": 0,
                    "detected_at": alert["timestamp"],
                    "details": defaultdict(list),
                    "count": 0,
                }

            attacks[detector]["count"] += 1

            attacks[detector]["severity_score"] = max(
                attacks[detector]["severity_score"],
                SEVERITY_SCORE[alert["severity"]]
            )

            attacks[detector]["detected_at"] = min(
                attacks[detector]["detected_at"],
                alert["timestamp"]
            )

            attacks[detector]["details"][alert["type"]].append({
                "severity": alert["severity"],
                "message": alert["message"],
                "details": alert["details"],
                "timestamp": alert["timestamp"],
            })

        results = []

        for attack in attacks.values():
            # confidence = round(
            #     1 - math.exp(-0.35 * attack["count"]),
            #     2
            # )
            confidence = DETECTOR_BASE_CONFIDENCE[attack["attack_type"]] + (1 - DETECTOR_BASE_CONFIDENCE[attack["attack_type"]]) * (1 - math.exp(-K_CONFIDENCE[attack["attack_type"]] * attack["count"]))
            iso_date = datetime.fromtimestamp(attack["detected_at"]).isoformat()

            results.append({
                "attack_type": attack["attack_type"],
                "severity": SCORE_TO_SEVERITY[attack["severity_score"]],
                "confidence": confidence,
                "detected_at": iso_date,
                "details": dict(attack["details"]),
            })

        from pprint import pp
        pp(results)

        return jsonify({
            'status': 'success',
            'scan_id': scan['scan_id'],
            'alerts': results,
            'summary': scan['summary']
        }), 200
    
    except Exception as e:
        logger.error(f"Alert retrieval failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'Alert retrieval failed',
            'details': str(e)
        }), 500


@app.route('/scan/history', methods=['GET'])
def get_scan_history():
    """
    Get history of all scans.
    
    Returns:
    {
        "status": "success",
        "scans": [
            {
                "scan_id": "...",
                "status": "completed|running|failed",
                "target_ssid": "...",
                "target_bssid": "...",
                "start_time": 1716000000.0,
                "elapsed_time": 45.2,
                "alert_count": 3
            },
            ...
        ]
    }
    """
    try:
        scans = scan_manager.get_all_scans()
        
        # Update elapsed time for running scans
        for scan in scans:
            if scan['status'] in ['pending', 'running']:
                scan['elapsed_time'] = time.time() - scan['start_time']
        
        return jsonify({
            'status': 'success',
            'scans': scans
        }), 200
    
    except Exception as e:
        logger.error(f"History retrieval failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': 'History retrieval failed',
            'details': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({
        'status': 'error',
        'error': 'Endpoint not found',
        'path': request.path
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors."""
    return jsonify({
        'status': 'error',
        'error': 'Method not allowed',
        'method': request.method,
        'path': request.path
    }), 405


if __name__ == '__main__':
    logger.info("Starting WiFi Honeypot Scanner API Server...")
    logger.info("Server running on http://localhost:5000")
    app.run(host='192.168.200.1', port=5000, debug=False, threaded=True)
