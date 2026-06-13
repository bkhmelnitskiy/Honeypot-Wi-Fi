#!/usr/bin/env python3
"""
Example usage of the WiFi Honeypot Scanner REST API

This script demonstrates how to interact with the API endpoints.
"""

import requests
import json
import time
import sys

BASE_URL = 'http://localhost:5000'

def print_response(response):
    """Pretty print API response."""
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
    print(f"Status: {response.status_code}\n")


def health_check():
    """Check system health."""
    print("=" * 60)
    print("GET /health - Check system health")
    print("=" * 60)
    response = requests.get(f'{BASE_URL}/health')
    print_response(response)


def list_networks():
    """List available networks."""
    print("=" * 60)
    print("GET /networks - List available WiFi networks")
    print("=" * 60)
    response = requests.get(f'{BASE_URL}/networks')
    print_response(response)


def start_scan(ssid, psk=None):
    """Start a scan on target network."""
    print("=" * 60)
    print(f"POST /scan - Start scan on {ssid}")
    print("=" * 60)
    payload = {
        'ssid': ssid,
        'psk': psk,
        'duration': 30
    }
    response = requests.post(f'{BASE_URL}/scan', json=payload)
    print_response(response)
    
    if response.status_code == 202:
        data = response.json()
        return data.get('scan_id')
    return None


def get_scan_status(scan_id):
    """Check scan status."""
    print("=" * 60)
    print(f"GET /scan/status - Check status of {scan_id}")
    print("=" * 60)
    response = requests.get(f'{BASE_URL}/scan/status', params={'scan_id': scan_id})
    print_response(response)


def get_alerts(scan_id):
    """Get alerts from completed scan."""
    print("=" * 60)
    print(f"GET /alerts - Get alerts from {scan_id}")
    print("=" * 60)
    response = requests.get(f'{BASE_URL}/alerts', params={'scan_id': scan_id})
    print_response(response)


def get_history():
    """Get scan history."""
    print("=" * 60)
    print("GET /scan/history - Get all scan history")
    print("=" * 60)
    response = requests.get(f'{BASE_URL}/scan/history')
    print_response(response)


def main():
    """Run example API calls."""
    
    # Check if server is running
    try:
        requests.get(f'{BASE_URL}/health', timeout=2)
    except requests.exceptions.ConnectionError:
        print(f"ERROR: Cannot connect to API server at {BASE_URL}")
        print("Make sure the server is running: python3 dummy_app/server.py")
        sys.exit(1)
    
    # Run examples
    print("\n🔍 WiFi Honeypot Scanner API - Example Usage\n")
    
    # 1. Health check
    health_check()
    input("Press Enter to continue...")
    
    # 2. List networks
    list_networks()
    input("Press Enter to continue...")
    
    # 3. Start scan (modify SSID and PSK as needed)
    # scan_id = start_scan('YourSSID', 'YourPassword')
    # if scan_id:
    #     input("Press Enter to continue...")
    #     
    #     # 4. Check status
    #     for i in range(5):
    #         get_scan_status(scan_id)
    #         if i < 4:
    #             print("Waiting 5 seconds before next status check...\n")
    #             time.sleep(5)
    #         input("Press Enter to continue...")
    #     
    #     # 5. Get alerts (only if scan completed)
    #     get_alerts(scan_id)
    #     input("Press Enter to continue...")
    # 
    # # 6. Get history
    # get_history()


if __name__ == '__main__':
    main()
