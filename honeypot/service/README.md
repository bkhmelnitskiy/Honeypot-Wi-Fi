# WiFi Honeypot Scanner REST API Server

A Flask-based REST API server that exposes WiFi honeypot scanner functionality via HTTP endpoints. Allows remote clients to discover networks, trigger scans, and retrieve threat detection alerts.

## Quick Start

### Prerequisites
- Python 3.8+
- WiFi Go API service running on `localhost:3000`
- Required Python packages (see `scanner/requirements.txt`)

### Installation

1. Install dependencies:
```bash
cd /path/to/honeypot
pip install -r scanner/requirements.txt
```

2. Start the API server:
```bash
python3 dummy_app/server.py
```

Server will be available at `http://localhost:5000`

### Usage

#### 1. Check System Health

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "healthy",
  "components": {
    "api_available": true,
    "managed_interface": true,
    "scan_capability": true,
    "monitor_interface": true
  },
  "ready_to_scan": true,
  "message": "System ready to scan target networks"
}
```

Status levels:
- `healthy`: All critical components working
- `degraded`: Core system OK, monitor mode unavailable (Evil Twin detection limited)
- `unhealthy`: Critical components missing (cannot scan)

---

#### 2. List Available Networks

```bash
curl http://localhost:5000/networks
```

Response:
```json
{
  "status": "success",
  "networks": [
    {
      "id": "network_123",
      "bssid": "AA:BB:CC:DD:EE:FF",
      "ssid": "MyNetwork",
      "frequency": 2437,
      "security": ["WPA2-PSK"]
    },
    {
      "id": "network_456",
      "bssid": "11:22:33:44:55:66",
      "ssid": "OpenNetwork",
      "frequency": 2412,
      "security": ["OPEN"]
    }
  ]
}
```

---

#### 3. Start a Scan

```bash
curl -X POST http://localhost:5000/scan \
  -H "Content-Type: application/json" \
  -d '{
    "ssid": "MyNetwork",
    "psk": "password123",
    "duration": 30
  }'
```

Parameters:
- `ssid` (string): Target network SSID (**required** if `bssid` not provided)
- `bssid` (string): Target network BSSID/MAC address (**required** if `ssid` not provided)
- `psk` (string): Network password (required if network uses WPA/WPA2)
- `duration` (integer, optional): Scan duration in seconds (1-300, default: 30)

Response:
```json
{
  "status": "success",
  "scan_id": "scan_a1b2c3d4e5f6",
  "message": "Scan started",
  "target": {
    "ssid": "MyNetwork",
    "bssid": "AA:BB:CC:DD:EE:FF"
  }
}
```

HTTP Status: `202 Accepted`

---

#### 4. Check Scan Status

```bash
curl "http://localhost:5000/scan/status?scan_id=scan_a1b2c3d4e5f6"
```

Response:
```json
{
  "status": "success",
  "scan": {
    "scan_id": "scan_a1b2c3d4e5f6",
    "status": "running",
    "target_ssid": "MyNetwork",
    "target_bssid": "AA:BB:CC:DD:EE:FF",
    "start_time": 1716000000.0,
    "elapsed_time": 15.3,
    "alert_count": 2,
    "summary": {
      "ARP_Spoof:ARP_SPOOF": 1,
      "DNS_Spoof:DNS_SPOOF": 1
    },
    "message": "Scan running"
  }
}
```

Status values:
- `pending`: Scan queued, not started yet
- `running`: Scan in progress
- `completed`: Scan finished successfully
- `failed`: Scan encountered an error

---

#### 5. Get Alerts from Completed Scan

```bash
curl "http://localhost:5000/alerts?scan_id=scan_a1b2c3d4e5f6"
```

Response:
```json
{
  "status": "success",
  "scan_id": "scan_a1b2c3d4e5f6",
  "alerts": [
    {
      "timestamp": 1716000000.123,
      "detector": "ARP_Spoof",
      "type": "ARP_SPOOF",
      "message": "ARP spoofing detected for 192.168.1.1",
      "details": {
        "ip": "192.168.1.1",
        "old_mac": "AA:BB:CC:DD:EE:FF",
        "new_mac": "11:22:33:44:55:66"
      }
    },
    {
      "timestamp": 1716000005.456,
      "detector": "DNS_Spoof",
      "type": "DNS_SPOOF",
      "message": "DNS spoofing detected for example.com",
      "details": {
        "domain": "example.com",
        "original_ips": ["93.184.216.34"],
        "spoofed_ips": ["192.168.1.1"]
      }
    }
  ],
  "summary": {
    "ARP_Spoof:ARP_SPOOF": 1,
    "DNS_Spoof:DNS_SPOOF": 1
  }
}
```

**Note:** Alerts are only available after scan completes. Attempting to retrieve alerts while scan is running will return a 400 error.

---

#### 6. Get Scan History

```bash
curl http://localhost:5000/scan/history
```

Response:
```json
{
  "status": "success",
  "scans": [
    {
      "scan_id": "scan_a1b2c3d4e5f6",
      "status": "completed",
      "target_ssid": "MyNetwork",
      "target_bssid": "AA:BB:CC:DD:EE:FF",
      "start_time": 1716000000.0,
      "elapsed_time": 45.2,
      "alert_count": 5
    },
    {
      "scan_id": "scan_x7y8z9a0b1c2",
      "status": "running",
      "target_ssid": "GuestNetwork",
      "target_bssid": "11:22:33:44:55:66",
      "start_time": 1716000100.0,
      "elapsed_time": 12.5,
      "alert_count": 1
    }
  ]
}
```

---

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Check system health and component status |
| `/networks` | GET | Discover available WiFi networks |
| `/scan` | POST | Start a threat detection scan |
| `/scan/status` | GET | Check progress of an active scan |
| `/alerts` | GET | Retrieve threats detected by a completed scan |
| `/scan/history` | GET | List all scans (pending, running, completed) |

---

## Error Handling

### Common Error Responses

**Missing Required Parameter**
```json
{
  "status": "error",
  "error": "Missing target",
  "details": "Either \"ssid\" or \"bssid\" is required"
}
```
HTTP Status: `400 Bad Request`

**Scan Not Found**
```json
{
  "status": "error",
  "error": "Scan \"invalid_id\" not found"
}
```
HTTP Status: `404 Not Found`

**WiFi API Unreachable**
```json
{
  "status": "error",
  "error": "WiFi API error",
  "details": "Connection refused"
}
```
HTTP Status: `503 Service Unavailable`

**Scan Still Running**
```json
{
  "status": "error",
  "error": "Scan is still running, alerts not yet available"
}
```
HTTP Status: `400 Bad Request`

---

## Example Client

A Python example client is provided in `example_client.py`:

```bash
python3 dummy_app/example_client.py
```

This demonstrates all API endpoints with example requests and responses.

---

## Architecture

```
Client (HTTP Request)
    ↓
Flask API Server (server.py)
    ├─ Route Handler (validates request)
    ├─ ScanManager (tracks scan state)
    └─ ScanRunner (executes scan in background thread)
        ├─ WiFiAPIClient (connects to Go WiFi API)
        ├─ InterfaceManager (manages WiFi interfaces)
        └─ ScannerLauncher (coordinates threat detectors)
            ├─ Thread 1: ARP/DNS/Scan detectors (managed mode)
            ├─ Thread 2: Evil Twin detector (monitor mode)
            └─ AlertCollector (thread-safe alert aggregation)
```

---

## Key Components

### ScanManager
Thread-safe in-memory database tracking all active/completed scans. Stores:
- Scan ID, status, target network
- Start/end times, elapsed time
- Collected alerts and threat summary

### ScanRunner
Orchestrates the full scan workflow:
1. Validates target network exists
2. Connects to target WiFi network
3. Runs ScannerLauncher for threat detection
4. Collects alerts into ScanManager
5. Disconnects and reports results

### Thread Safety
- ScanManager uses `threading.Lock` for concurrent access
- AlertCollector uses `threading.Lock` for thread-safe alert collection
- Multiple scans can run concurrently without data corruption

---

## Troubleshooting

### "WiFi API is not reachable"
- Ensure Go WiFi API service is running on `localhost:3000`
- Check: `curl http://localhost:3000/interface/`

### "No managed mode interface found"
- Ensure WiFi interface is properly configured
- Check: `curl http://localhost:3000/interface/`

### Scan never completes
- Check logs for errors
- Verify network credentials (PSK) if WPA network
- Ensure managed interface has stable connection

### Alerts not appearing
- Wait for scan to complete (check status endpoint)
- For full detection capability, monitor mode interface is recommended

---

## Performance Notes

- **Scan Duration**: Default 30 seconds, adjustable 1-300 seconds per scan
- **Concurrent Scans**: Multiple scans can run simultaneously
- **Memory**: In-memory scan storage; clear history manually if needed
- **Network**: Packet capture requires root/admin privileges

---

## Security Considerations

- API server listens on all interfaces (`0.0.0.0:5000`)
- No authentication/authorization implemented
- Designed for trusted network environments only
- For production use, add authentication and restrict access

---

## Development

To modify the API server:

1. Edit `dummy_app/server.py`
2. Restart the server: `python3 dummy_app/server.py`
3. Test with example client: `python3 dummy_app/example_client.py`

The server uses Flask's debug features for development. For production, configure a proper WSGI server (e.g., Gunicorn).
