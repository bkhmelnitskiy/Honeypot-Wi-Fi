import requests
import logging
from typing import List, Dict, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Interface:
    """Represents a WiFi interface."""
    id: str
    name: str
    state: str  # "completed", "disconnected", "inactive"
    mac: str
    
    def __repr__(self):
        return f"Interface(name={self.name}, state={self.state}, mac={self.mac})"


@dataclass
class BSS:
    """Represents a WiFi network (Basic Service Set)."""
    id: int
    bssid: str
    ssid: str
    frequency: int  # MHz
    security: str  # "wpa-none", "wpa-psk", "sae"
    
    def __repr__(self):
        return f"BSS(id={self.id}, ssid={self.ssid}, bssid={self.bssid}, security={self.security})"


@dataclass
class Network:
    """Represents a connected or configured network."""
    id: str
    ssid: str
    
    def __repr__(self):
        return f"Network(ssid={self.ssid}, state={self.state})"


class WiFiAPIError(Exception):
    """Base exception for WiFi API errors."""
    pass


class WiFiAPIConnectionError(WiFiAPIError):
    """Raised when unable to connect to API service."""
    pass


class WiFiAPITimeoutError(WiFiAPIError):
    """Raised when API request times out."""
    pass


class WiFiAPINotFoundError(WiFiAPIError):
    """Raised when requested interface/network not found."""
    pass


class WiFiAPIAlreadyConnected(WiFiAPIError):
    """Raised when interface is already scanning."""
    pass


class WiFiAPIScanError(WiFiAPIError):
    """Raised when scan throws error."""
    pass


class WiFiAPIClient:
    def __init__(self, host: str = "localhost", port: int = 3000, timeout: float = 10.0):
        self.base_url = f"http://{host}:{port}"
        self.timeout = timeout
        self._session = requests.Session()
        
    def _check_connection(self) -> bool:
        try:
            response = self._session.get(f"{self.base_url}/interface/", timeout=self.timeout)
            return response.status_code in [200, 404]
        except requests.RequestException:
            return False
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"

        try:
            if method == "GET":
                response = self._session.get(url, timeout=self.timeout, **kwargs)
            elif method == "POST":
                response = self._session.post(url, timeout=self.timeout, **kwargs)
            elif method == "DELETE":
                response = self._session.delete(url, timeout=self.timeout, **kwargs)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                

        except requests.Timeout:
            raise WiFiAPITimeoutError(f"Request to {endpoint} timed out after {self.timeout}s")
        except requests.ConnectionError as e:
            raise WiFiAPIConnectionError(f"Cannot connect to API service at {self.base_url}: {e}")
        except requests.RequestException as e:
            raise WiFiAPIError(f"Request failed: {e}")
        
        print(url, response.status_code)

        if response.status_code == 404:
            raise WiFiAPINotFoundError(f"Resource not found: {endpoint}")
        elif response.status_code >= 400:
            raise WiFiAPIError(f"API error {response.status_code}: {response.text}")
        

        if response.status_code == 204:
            return {}

        try:
            return response.json()
        except ValueError:
            raise WiFiAPIError(f"Invalid JSON response: {response.text}")
    
    def list_interfaces(self) -> List[Interface]:
        logger.debug("Listing WiFi interfaces")
        try:
            data = self._make_request("GET", "/interface/")
        except WiFiAPINotFoundError:
            # No interfaces found
            return []
        
        interfaces = []
        for iface_data in data:
            interfaces.append(Interface(
                id=iface_data.get("id", ""),
                name=iface_data.get("name", ""),
                state=iface_data.get("state", ""),
                mac=self.get_mac(iface_data.get("name", ""))
            ))
        
        logger.info(f"Found {len(interfaces)} interface(s): {[i.name for i in interfaces]}")
        return interfaces
    
    def get_interface(self, interface_id: str) -> Interface:
        logger.debug(f"Getting interface details for {interface_id}")
        data = self._make_request("GET", f"/interface/{interface_id}")
        
        return Interface(
            id=data.get("id", interface_id),
            name=data.get("name", interface_id),
            state=data.get("state", ""),
            mac=self.get_mac(data.get("name", interface_id))
        )
    
    def scan_networks(self, interface_id: str) -> bool:
        logger.info(f"Scanning networks on interface {interface_id}")
        
        data = self._make_request("GET", f"/interface/{interface_id}/scan")
        if data.get("ok", "false") == "false":
            raise WiFiAPIScanError(f"Failed to scan on {interface_id}")
        return True
    
    def get_bss_list(self, interface_id: str) -> List[BSS]:
        logger.debug(f"Getting BSS list for interface {interface_id}")
        
        try:
            data = self._make_request("GET", f"/interface/{interface_id}/bss")
        except WiFiAPINotFoundError:
            logger.warning(f"No BSS list found for {interface_id}")
            return []
        
        bss_list = []
        bss_data = data
        
        for entry in bss_data:
            bss = BSS(
                id=entry.get("id", -1),
                bssid=entry.get("bssid", ""),
                ssid=entry.get("ssid", ""),
                frequency=entry.get("frequency", 0),
                security=entry.get("rsn", {}).get("key_mgmt", {})
            )
            bss_list.append(bss)

        logger.info(f"Found {len(bss_list)} network(s)")
        return bss_list
    
    def get_bss(self, interface_id: str, bss_id: str) -> Optional[BSS]:
        logger.debug(f"Getting BSS details for {bss_id}")
        
        try:
            data = self._make_request("GET", f"/interface/{interface_id}/bss/{bss_id}")
        except WiFiAPINotFoundError:
            return None
        
        return BSS(
            id=data.get("id", ""),
            bssid=data.get("bssid", bss_id),
            frequency=data.get("frequency", 0),
            security=data.get("rsn", {}).get("key_mgmt", "wpa-none")
        )
    
    def get_mac(self, if_name: str):
        try:
            with open(f"/sys/class/net/{if_name}/address") as f:
                return f.read().strip()
        except FileNotFoundError:
            return "00:00:00:00:00:00"
    
    def get_current_network(self, interface_id: str) -> Optional[Network]:
        logger.debug(f"Getting current network for interface {interface_id}")
        
        try:
            data = self._make_request("GET", f"/interface/{interface_id}/network")
        except WiFiAPINotFoundError:
            return None
        
        id = data.get("bss", -1)
        data = data.get("properties", {})
        
        return Network(
            id=data.get("id", ""),
            ssid=id
        )
    
    def connect(
        self,
        interface_id: str,
        ssid: str,
        scan_ssid: str,
        key_mgmt: str,
        psk: Optional[str] = None,
    ) -> bool:      
        logger.info(f"Connecting interface {interface_id} to {ssid}")
        
        body = {"config": {}}
        config = body["config"]

        config["ssid"] = ssid
        config["scan_ssid"] = scan_ssid
        config["key_mgmt"] = key_mgmt.upper()
        config["psk"] = psk

        try:
            self._make_request("POST", f"/interface/{interface_id}/network", json=body)
        except WiFiAPIAlreadyConnected:
            logger.warning(f"Interface {interface_id} already connected")
            raise
        
        return True
    
    def disconnect(self, interface_id: str) -> bool:
        logger.info(f"Disconnecting interface {interface_id}")
        
        try:
            self._make_request("DELETE", f"/interface/{interface_id}/network")
            return True
        except WiFiAPIError as e:
            logger.error(f"Failed to disconnect: {e}")
            raise
