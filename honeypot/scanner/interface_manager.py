import logging
from typing import List, Optional, Tuple
from .wifi_api_client import WiFiAPIClient, Interface, WiFiAPIError

logger = logging.getLogger(__name__)


class InterfaceManager:  
    def __init__(self, api_client: Optional[WiFiAPIClient] = None):
        self.api_client = api_client or WiFiAPIClient()
        self._interfaces_cache: Optional[List[Interface]] = None
    
    def discover_interfaces(self, force_refresh: bool = False) -> List[Interface]:
        if self._interfaces_cache is not None and not force_refresh:
            return self._interfaces_cache
        
        try:
            interfaces = self.api_client.list_interfaces()
            self._interfaces_cache = interfaces
            logger.info(f"Discovered {len(interfaces)} WiFi interface(s): {[i.name for i in interfaces]}")
            return interfaces
        except WiFiAPIError as e:
            logger.error(f"Failed to discover interfaces: {e}")
            raise
    
    def get_interface_by_name(self, name: str) -> Optional[Interface]:
        try:
            interfaces = self.discover_interfaces()
            for iface in interfaces:
                if iface.name == name:
                    return iface
        except WiFiAPIError:
            pass
        return None
    
    def get_managed_interface(self) -> Optional[Interface]:
        try:
            interfaces = self.discover_interfaces()

            managed_interfaces = [
                i for i in interfaces
                if "mon" not in i.name.lower()
            ]
            
            if managed_interfaces:
                logger.info(f"Selected managed interface: {managed_interfaces[0].name}")
                return managed_interfaces[0]
            
        except WiFiAPIError as e:
            logger.error(f"Failed to get managed interface: {e}")
        
        return None
    
    def get_monitor_interface(self) -> Optional[Interface]:
        try:
            interfaces = self.discover_interfaces()

            potential_monitor = [
                i for i in interfaces
                if "mon" in i.name.lower()
            ]
            
            if potential_monitor:
                logger.info(f"Selected monitor interface: {potential_monitor[0].name}")
                return potential_monitor[0]

        except WiFiAPIError as e:
            logger.error(f"Failed to get monitor interface: {e}")
        
        return None
