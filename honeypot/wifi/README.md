# Wi-Fi HTTP API

### Introduction

Wi-Fi HTTP API is designed for simplified control over wpa_supplicant system service. It uses D-Bus under the hood and exposes endpoints for basic operations: retrieving capabilities and parameters, scanning for available networks and basic wireless connection management.

### Assumptions

Although standard HTTP server is being used, this API is designed to be called by only one client (controller) locally. NetworkManager must be disabled on the system, because it assumes full control over wpa_supplicant, which may lead to undefined behaviour when some other process is also actively interacting with it. The compiled binary must be executed with root privileges.

### Routes

HTTP bodies are being transmitted in JSON. Status codes indicate whether or not there was an error during request handling. When unexpected error happens on the server, status code `500 Internal Server Error` is returned.

#### `GET /interface`

- Returns all available interfaces managed by wpa_supplicant.
- Response body is an array of objects containing interface ID and fields extracted from properties described [here](https://w1.fi/wpa_supplicant/devel/dbus.html#dbus_interface_properties), but with field names changed from PascalCase to snake_case.

##### Example

###### Request Route

```
GET /interface
```

###### Response Body

```json
[
  {
    "id": 1,
    "name": "wlan0",
    "state": "completed",
    "capabilities": {
      "pairwise": ["gcmp-256", "ccmp", "gcmp"],
      "group": ["gcmp-256", "ccmp", "gcmp"],
      "key_mgmt": ["wpa-eap", "wpa-eap-sha256", "wpa-psk-sha256", "sae", "owe"],
      "protocol": ["rsn", "wpa"],
      "auth_alg": ["shared", "leap"],
      "scan": ["active", "passive", "ssid"],
      "modes": ["infrastructure", "ap"]
    }
  }
]
```

#### `GET /interface/{interface-id}`

- Returns the interface that matches ID specified in the path `{interface-id}`.
- Response body is an object with the schema described above.
- When an interface with the particular ID does not exist, status `404 Not Found` is returned.

#### `GET /interface/{interface-id}/scan`

- Performs active scanning on the interface that matched ID specified in the path `{interface-id}`.
- Response body is an object indicating whether or not the scan was successful and a new list of BSSs is ready to be retrieved.
- When an interface with the particular ID does not exist, status `404 Not Found` is returned.
- When scanning is already being performed on this interface, status `409 Conflict` is returned.
- When scanning takes longer than 5 seconds, status `504 Gateway Timeout` is returned.

##### Example

###### Request Route

```
GET /interface/0/scan
```

###### Response Body

```json
{
  "ok": true
}
```

#### `GET /interface/{interface-id}/network`

- Returns the network that the interface specified in the path `{interface-id}` is currently connected to.
- Response body is an object containing BSS ID and properties from `network` block of wpa_supplicant configuration file, with values for all keys having a string type.
- When an interface with the particular ID is not currently connected to any network, status `404 Not Found` is returned.

##### Example

###### Request Route

```
GET /interface/1/network
```

###### Response Body

```json
{
  "bss": 0,
  "properties": {
    "acs": "0",
    "ampdu_density": "-1",
    "ampdu_factor": "-1",
    "ap_max_inactivity": "0",
    "auth_alg": "OPEN",
    "beacon_int": "0",
    "beacon_prot": "0",
    "bg_scan_period": "-1",
    "bgscan": "\"simple:30:-70:86400\"",
    "disable_ht": "0",
    "disable_ht40": "0",
    "disable_ldpc": "0",
    "disable_max_amsdu": "-1"
    // and more...
  }
}
```

#### `POST /interface/{interface-id}/network`

- Connects to the configured network on the interface specified in the path `{interface-id}`.
- Request body must be an object containing network configuration from `network` block of wpa_supplicant configuration file, with values for all keys having a string type.
- Response body is empty.
- When an interface with the particular ID does not exist, status `404 Not Found` is returned.
- When the connection is already established or is currently being established on this interface, status `409 Conflict` is returned.
- When invalid network configuration has been provided, status `400 Bad Request` is returned.

##### Example

###### Request Route

```
POST /interface/0/network
```

###### Request Body

```json
{
  "config": {
    "ssid": "home",
    "scan_ssid": "1",
    "key_mgmt": "WPA-PSK",
    "psk": "very secret passphrase"
  }
}
```

#### `DELETE /interface/{interface-id}/network`

- Disconnects from the current network on the interface specified in the path `{interface-id}`.
- Response body is empty.
- When an interface with the particular ID is not currently connected to any network, status `404 Not Found` is returned.

#### `GET /interface/{interface-id}/bss`

- Returns the list of available BSSs that were found during scanning on the interface with ID specified in the path `{interface-id}`.
- Response body is an array of objects containing BSS ID and fields extracted from properties described [here](https://w1.fi/wpa_supplicant/devel/dbus.html#dbus_bss_properties), but with field names changed from PascalCase to snake_case.
- When an interface with the particular ID does not exist, status `404 Not Found` is returned.

##### Example

###### Request Route

```
GET /interface/1/bss
```

###### Response Body

```json
[
  {
    "id": 0,
    "bssid": "90:94:97:14:49:c8",
    "ssid": "DIAMOND-D5636U1",
    "wpa": {},
    "rsn": {
      "key_mgmt": ["wpa-psk"],
      "pairwise": ["wpa-psk"],
      "group": "ccmp",
      "mgmt_group": "aes128cmac"
    },
    "wps": {},
    "privacy": true,
    "mode": "infrastructure",
    "frequency": 5500
  },
  {
    "id": 6,
    "bssid": "19:b6:e8:32:29:81",
    "ssid": "CoolWiFi",
    "wpa": {},
    "rsn": {
      "key_mgmt": ["wpa-psk"],
      "pairwise": ["wpa-psk"],
      "group": "ccmp",
      "mgmt_group": "aes128cmac"
    },
    "wps": {},
    "privacy": true,
    "mode": "infrastructure",
    "frequency": 2442
  }
]
```

#### `GET /interface/{interface-id}/bss/{bss-id}`

- Returns the BSS that matches ID specified in the path `{bss-id}` belonging to the interface that matches ID specified in the path `{interface-id}`.
- Response body is an object with the schema described above.
- When a BSS with the particular ID does not exist for the particular interface, status `404 Not Found` is returned.
