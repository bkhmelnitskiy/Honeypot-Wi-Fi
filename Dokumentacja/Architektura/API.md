# Projekt API

System posiada dwa interfejsy komunikacyjne:
1. **REST API** - komunikacja Mobile App <-> Web Server (przez internet)
2. **BLE GATT Protocol** - komunikacja Mobile App <-> Honeypot (lokalnie)

---

## 1. REST API (Mobile App <-> Web Server)

```
Base URL: https://honey-phoney.com/api/v1
Content-Type: application/json
Uwierzytelnianie: Bearer JWT w nagłówku Authorization
CORS: Access-Control-Allow-Origin ograniczony do domen frontendowych (https://honey-phoney.com)
```

### Standardowy format błędów

Wszystkie odpowiedzi błędów mają jednolity format:

```json
{
  "error": "ERROR_CODE",
  "message": "Czytelny opis błędu",
  "details": []
}
```

Przykład błędu walidacji (422):
```json
{
  "error": "VALIDATION_FAILED",
  "message": "Input data didn't pass validation process",
  "details": [
    { "field": "email", "reason": "Wrong email format" },
    { "field": "password", "reason": "Password should have at least 8 characters" }
  ]
}
```

### Rate limiting

Wszystkie endpointy są objęte rate limitingiem. Limity są zwracane w nagłówkach odpowiedzi:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1710600000
```

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 5 req/min per IP |
| `POST /auth/register` | 3 req/min per IP |
| `POST /sync`, `POST /sync/batch` | 30 req/min per user |
| Pozostałe endpointy | 100 req/min per user |

Przekroczenie limitu zwraca:
```
429 Too Many Requests
Retry-After: 30
```

---

### 1.1 Uwierzytelnianie

**Wymagania dotyczące hasła:**
- Minimum 8 znaków
- Przynajmniej jedna wielka litera, jedna mała litera, jedna cyfra i jeden znak specjalny
- Maksymalnie 128 znaków

**Polityka tokenów:**
- Access token: ważność 3600s (1h)
- Refresh token: ważność 2592000s (30 dni), jednorazowy (rotacja po użyciu)

#### POST /auth/register
Rejestracja nowego konta użytkownika. Rejestracja nie zwraca tokenów - użytkownik musi się zalogować po rejestracji.

```
Request:
{
  "email": "user@example.com",
  "password": "P@ssw0rd",
  "display_name": "Jan Kowalski"
}

Response 201:
{
  "user_id": "uuid",
  "email": "user@example.com",
  "display_name": "Seb Sov",
  "created_at": "2026-03-19T10:00:00Z"
}

Błędy:
  409 - email już istnieje
  422 - błędna walidacja danych (np. hasło za krótkie)
  429 - zbyt wiele prób rejestracji
```

#### POST /auth/login
Logowanie istniejącego użytkownika.

```
Request:
{
  "email": "user@example.com",
  "password": "P@ssw0rd"
}

Response 200:
{
  "user_id": "uuid",
  "access_token": "jwt...",
  "refresh_token": "rt...",
  "expires_in": 3600,
  "refresh_expires_in": 2592000,
  "display_name": "Seb Sov"
}

Błędy:
  401 - błędne dane logowania
  429 - zbyt wiele prób logowania (konto tymczasowo zablokowane po 5 nieudanych próbach)
```

#### POST /auth/refresh
Odświeżenie wygasłego access tokena.

```
Request:
{
  "refresh_token": "rt..."
}

Response 200:
{
  "access_token": "jwt...",
  "refresh_token": "new_rt...",
  "expires_in": 3600,
  "refresh_expires_in": 2592000
}

Błędy: 401 (nieprawidłowy/wygasły/unieważniony token)
Uwaga: Stary refresh token jest unieważniony po użyciu (rotacja tokenów)
```

#### POST /auth/logout
Wylogowanie - unieważnij refresh token po stronie serwera.

```
Request:
{
  "refresh_token": "rt..."
}

Response: 204 No Content
```

---

### 1.2 Użytkownik

#### GET /users/me
Pobranie profilu zalogowanego użytkownika. Wymaga uwierzytelnienia.

```
Response 200:
{
  "user_id": "uuid",
  "email": "user@example.com",
  "display_name": "Seb Sov",
  "created_at": "2026-03-19T10:00:00Z",
  "total_scans": 46,
  "total_networks_scanned": 12
}
```

#### PATCH /users/me
Aktualizacja profilu użytkownika. Wymaga uwierzytelnienia.

```
Request (wszystkie pola opcjonalne, new_password wymaga current_password):
{
  "display_name": "Ovas420",
  "current_password": "StareHaslo1!",
  "new_password": "NoweHaslo2!"
}

Response 200:
{
  "user_id": "uuid",
  "email": "user@example.com",
  "display_name": "Ovas420",
  "updated_at": "2026-03-19T10:00:00Z"
}

Błędy:
  401 - current_password niepoprawne (wymagane przy zmianie hasła)
  422 - nowe hasło nie spełnia wymagań
```

#### DELETE /users/me
Usunięcie konta użytkownika i wszystkich powiązanych danych. Wymaga uwierzytelnienia.

```
Request:
{
  "password": "P@ssw0rd"
}

Response: 204 No Content

Błędy:
  401 - niepoprawne hasło
```

---

### 1.3 Skany

#### Schemat obiektu ataku

```json
{
  "attack_type": "ARP_SPOOFING | DNS_SPOOFING | EVIL_TWIN | DEAUTHENTICATION | NETWORK_SCAN | MALWARE_PROPAGATION",
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "confidence": 0.87,
  "detected_at": "2026-03-19T10:29:15Z",
  "details": {}
}
```

| Pole | Typ | Opis |
|---|---|---|
| `attack_type` | string (enum) | Typ wykrytego ataku |
| `severity` | string (enum) | Powaga ataku: LOW / MEDIUM / HIGH / CRITICAL |
| `confidence` | float (0.0-1.0) | Pewność detekcji |
| `detected_at` | timestamp | Moment wykrycia ataku |
| `details` | object | Szczegóły specyficzne dla typu ataku (np. attacker_mac, spoofed_domain) |


#### GET /scans
Lista skanów użytkownika. Wymaga uwierzytelnienia.

```
Query params:
  ?cursor=eyJpZCI6MTIzfQ    -- kursor do paginacji (base64 encoded)
  &per_page=20               -- liczba wyników na stronę (max 100)
  &network_id=uuid           -- filtrowanie po sieci
  &since=2026-01-01T00:00:00Z -- od kiedy

Response 200:
{
  "scans": [...],
  "total": 150,
  "next_cursor": "eyJpZCI6MTQzfQ",
  "prev_cursor": "eyJpZCI6MTAzfQ",
  "per_page": 20
}

next_cursor = null oznacza brak kolejnych stron.
```

#### GET /scans/:id
Szczegóły konkretnego skanu. Wymaga uwierzytelnienia.

```
Response 200:
{
  "server_scan_id": "uuid",
  "client_scan_id": "uuid",
  "network": { ... },
  "safety_score": 67.9,
  "scan_duration_sec": 120,
  "attacks": [ ...pełne obiekty ataków... ],
  "device_hardware_id": "rpi-serial-xxxx",
  "firmware_version": "1.2.0",
  "started_at": "2026-03-19T10:28:00Z",
  "completed_at": "2026-03-19T10:30:00Z"
}

Błędy:
  404 - skan nie znaleziony
  403 - skan należy do innego użytkownika
```

---

### 1.4 Sieci WiFi

#### GET /networks
Przeglądanie i wyszukiwanie sieci. Wymagane uwierzytelnienie.

```
Query params:
  ?search=FreeWiFi          -- wyszukiwanie po SSID
  &sort=safety_score        -- sortowanie
  &order=asc                -- rosnąco/malejąco
  &cursor=eyJpZCI6MTIzfQ    -- kursor do paginacji (base64 encoded)
  &per_page=20              -- wyników na stronę (max 100)
  &min_scans=3              -- min. liczba skanów
  &lat=50.0647              -- szerokość geograficzna (wymaga lng i radius)
  &lng=19.9450              -- długość geograficzna (wymaga lat i radius)
  &radius_km=5              -- promień wyszukiwania w km (max 50)

Response 200:
{
  "networks": [
    {
      "id": "uuid",
      "ssid": "FreeWiFi",
      "bssid": "AA:BB:CC:DD:EE:FF",
      "avg_safety_score": 35.2,
      "total_scans": 14,
      "last_scanned_at": "2026-03-19T...",
      "last_safety_score": 42.0,
      "top_attacks": ["ARP_SPOOFING", "EVIL_TWIN"],
      "gps_latitude": 50.0647,
      "gps_longitude": 19.9450
    }
  ],
  "total": 1247,
  "next_cursor": "eyJpZCI6MTQzfQ",
  "prev_cursor": null
}
```

#### GET /networks/:id
Szczegóły konkretnej sieci ze statystykami.

```
Response 200:
{
  "id": "uuid",
  "ssid": "FreeWiFi",
  "bssid": "AA:BB:CC:DD:EE:FF",
  "channel": 6,
  "encryption_type": "OPEN",
  "avg_safety_score": 35.2,
  "min_safety_score": 12.0,
  "max_safety_score": 68.0,
  "total_scans": 14,
  "total_users_scanned": 8,
  "attack_summary": {
    "ARP_SPOOFING": { "count": 12, "avg_confidence": 0.82 },
    "EVIL_TWIN": { "count": 8, "avg_confidence": 0.71 }
  },
  "scan_history": [
    { "date": "2026-03-15", "safety_score": 32, "attacks": [] },
    { "date": "2026-03-10", "safety_score": 41, "attacks": [] }
  ]
}

Błędy:
  404 - sieć nie znaleziona
```

---

### 1.5 Statystyki

#### GET /stats/global
Globalne statystyki społeczności. Uwierzytelnianie opcjonalne.

```
Response 200:
{
  "total_scans": 8392,
  "total_networks": 1247,
  "total_users": 156,
  "avg_safety_score": 62.3,
  "attack_distribution": {
    "ARP_SPOOFING": 2854,
    "DNS_SPOOFING": 1510,
    "EVIL_TWIN": 2352,
    "NETWORK_SCAN": 504,
    "DEAUTHENTICATION": 1009,
    "MALWARE_PROPAGATION": 168
  },
  "scans_per_day": [
    { "date": "2026-03-15", "count": 42 },
    { "date": "2026-03-14", "count": 38 }
  ],
  "top_dangerous_networks": [
    {
      "id": "uuid",
      "ssid": "FreeWiFi",
      "bssid": "AA:BB:CC:DD:EE:FF",
      "avg_safety_score": 12.3,
      "total_scans": 28,
      "top_attacks": ["EVIL_TWIN", "ARP_SPOOFING"]
    }
  ],
  "top_contributors": [
    {
      "display_name": "Jan Kowalski",
      "total_scans": 142,
      "total_networks": 38
    }
  ]
}
```

#### GET /stats/attacks
Statystyki poszczególnych typów ataków. Potrzebne uwierzytelnienie.

```
Query params:
 ?type=ARP_SPOOFING             -- wyszukiwanie po podatności
 &since=2026-01-01T00:00:00Z    -- od kiedy
 &network_id=uuid               -- filtr po sieci

Response 200:
{
  "attack_type": "ARP_SPOOFING",
  "total_detections": 2854,
  "avg_confidence": 0.79,
  "severity_distribution": {
    "LOW": 412,
    "MEDIUM": 1203,
    "HIGH": 987,
    "CRITICAL": 252
  },
  "trend": [
    { "week": "2026-W10", "count": 312 },
    { "week": "2026-W09", "count": 289 }
  ]
}
```

---

### 1.6 Synchronizacja

#### GET /sync/status
Pobieranie aktualizacji od ostatniej synchronizacji. Wymaga uwierzytelnienia.
**PYTANIE: jakie dane synchronizujemy opcja 1. synchronizacja wszystkich informacji o sieciach które są najbliżej; 2. synchronizacja okrojonych dany np. tylko score z wszystkich sieci 3. opcja wszystko (nie polecam xD)** 

```
Query params:
  ?since=2026-03-10T00:00:00Z  -- timestamp ostatniej sync
  &limit=100                   -- max liczba zaktualizowanych sieci (domyślnie 100, max 500)

Response 200:
{
  "updated_networks": [
    { Obiekty sieci }
  ],
  "global_stats":{

  },
  "has_more": true,
  "next_since": "2026-03-19T10:00:00Z",
  "server_time": "2026-03-19T10:00:00Z"
}

Jeśli has_more == true, klient powinien wykonać kolejne zapytanie
z since=next_since aby pobrać pozostałe aktualizacje.

Używane przez Sync Engine do odświeżenia lokalnego cache community.
```

#### POST /sync
Wysłanie pojedynczego skanu na serwer. Wymaga uwierzytelnienia.

```
Request:
{
  "client_scan_id": "uuid",
  "network": {
    "ssid": "FreeWiFi",
    "bssid": "AA:BB:CC:DD:EE:FF",
    "channel": 6,
    "encryption_type": "OPEN",
    "frequency_mhz": 2437,
    "gps_latitude": 50.0647,
    "gps_longitude": 19.9450
  },
  "safety_score": 67.9,
  "scan_duration_sec": 120,
  "scan_config": {
    "modules": ["ALL"],
    "duration": 120
  },
  "attacks": [
    {
      "attack_type": "ARP_SPOOFING",
      "severity": "HIGH",
      "confidence": 0.87,
      "detected_at": "2026-03-19T10:29:15Z",
      "details": {
        "attacker_mac": "XX:XX:XX:XX:XX:XX",
        "target_ip": "192.168.1.1",
        "spoofed_packets_count": 142
      }
    }
  ],
  "device_hardware_id": "rpi-serial",
  "firmware_version": "1.2.0",
  "started_at": "2026-03-19T10:28:00Z",
  "completed_at": "2026-03-19T10:30:00Z",
  "payload_hash": "a1b2c3d4e5f6..."
}

payload_hash: hex-encoded SHA-256 obliczony z JSON-serializacji pól w kolejności jak powyżej:
(client_scan_id +
network +
safety_score +
scan_duration_sec + scan_config +
attacks + device_hardware_id +
firmware_version +
started_at +
completed_at),
kodowanie UTF-8, bez białych znaków.

Response 201:
{
  "server_scan_id": "uuid",
  "network_id": "uuid",
  "accepted": true
}

Błędy:
  409 - duplikat (client_scan_id już istnieje na serwerze)
  422 - walidacja lub integralność danych (hash nie pasuje)
  401 - brak autoryzacji
```

#### POST /sync/batch
Batch upload wielu skanów naraz. Używane przez Sync Engine. Maksymalnie 50 skanów w jednym zapytaniu.

```
Request:
{
  "scans": [ ...tablica obiektów skanu jak wyżej (max 50)... ]
}

Response 207 Multi-Status:
{
  "results": [
    {
      "client_scan_id": "uuid",
      "status": "CREATED",
      "server_scan_id": "uuid",
      "error": null
    },
    {
      "client_scan_id": "uuid",
      "status": "REJECTED",
      "server_scan_id": null,
      "error": {
        "error": "DUPLICATE",
        "message": "Skan o tym client_scan_id już istnieje"
      }
    }
  ]
}

Każdy skan jest walidowany niezależnie. Odrzucenie jednego
nie blokuje pozostałych.

Błędy:
  413 - przekroczono limit 50 skanów w batch
  401 - brak autoryzacji
```
---

## 2. Protokół komend BLE (Mobile App <-> Honeypot)

Komunikacja odbywa się przez Bluetooth Low Energy z użyciem profilu GATT (Generic Attribute Profile).

### 2.1 Parowanie i bezpieczeństwo BLE

Przed pierwszą komunikacją wymagane jest sparowanie urządzeń:

```
1. Użytkownik uruchamia tryb parowania na honeypocie (przycisk fizyczny)
2. Honeypot generuje 6-cyfrowy kod parowania wyświetlany na LED/ekranie
3. Użytkownik wpisuje kod w aplikacji mobilnej
4. Urządzenia wymieniają klucze szyfrujące (BLE Secure Connections, LE Secure Pairing)
5. Wszystkie dalsze komunikaty są szyfrowane (AES-CCM)

Tylko sparowane urządzenia mogą wysyłać komendy.
Nieautoryzowane połączenia są odrzucane na poziomie GATT.
```

### 2.2 Konfiguracja BLE GATT

```
Characteristics:
uuid format (SIG):
0000xxxx-0000-1000-8000-00805F9B34FB
COMMAND (Write):          FFF1 -- Telefon wysyła komendy do honeypota
RESPONSE (Notify):        FFF2 -- Honeypot wysyła odpowiedzi/status
DATA (Write w/ Response): FFF3 -- Honeypot wysyła chunki, telefon potwierdza każdy

Format wiadomości: JSON-encoded UTF-8
MTU: negocjowany przy połączeniu (domyślnie 20B, max 512B)
```

### 2.3 Zachowanie przy rozłączeniu BLE

Honeypot kontynuuje skan niezależnie od stanu połączenia BLE. Wyniki są przechowywane lokalnie na urządzeniu do momentu odebrania przez telefon.

```
Telefon rozłącza się w trakcie skanu:
  1. Honeypot kontynuuje skan do końca
  2. Wyniki zapisywane lokalnie na RPi
  3. STATUS_UPDATE nie są wysyłane (brak odbiorcy)
  4. Po ponownym połączeniu telefon wysyła CMD_PING → widzi stan COMPLETED
  5. Telefon pobiera wyniki przez CMD_GET_RESULT

Honeypot przechowuje wyniki ostatnich 100 skanów.
```

### 2.4 Współbieżność komend

Honeypot przetwarza jedną komendę na raz. Jeśli urządzenie jest zajęte (trwający skan, transfer danych, skanowanie sieci), kolejne komendy są odrzucane z błędem BUSY.

```json
Response błąd:
{
  "status": "ERROR",
  "error_code": "BUSY",
  "message": "Trwa skan sieci FreeWiFi (postęp: 47%)",
  "busy_with": "CMD_START_SCAN",
  "scan_id": "uuid"
}
```

Wyjątki - komendy dozwolone zawsze, niezależnie od stanu:

| Komenda | Powód |
|---|---|
| `CMD_PING` | Lekki health-check, nie koliduje z niczym |
| `CMD_STOP_SCAN` | Musi być możliwe przerwanie trwającego skanu |

### 2.5 Format koperty wiadomości

```json
{
  "msg_id": "uuid",
  "type": "COMMAND|RESPONSE|STATUS|DATA",
  "cmd": "command_name",
  "ts": "2026-03-19T10:00:00Z",
  "payload": { ... }
}
```

### 2.6 Komendy (Telefon -> Honeypot)

#### CMD_PING
Sprawdzenie czy honeypot jest aktywny i pobranie podstawowego statusu. Dozwolone zawsze.

```json
Payload: {}

Response:
{
  "status": "OK",
  "battery_pct": 78,
  "firmware": "1.2.0",
  "uptime_sec": 3600,
  "wlan0_state": "MONITOR",
  "wlan1_state": "IDLE",
  "active_scan": {
    "scan_id": "uuid",
    "state": "SCANNING",
    "progress_pct": 47
  },
  "pending_results": ["uuid-1", "uuid-2"]
}

active_scan: null jeśli nie trwa żaden skan.
pending_results: lista scan_id z wynikami gotowymi do odebrania.
```

#### CMD_LIST_NETWORKS
Skanowanie dostępnych sieci WiFi w zasięgu. Wyniki zwracane przez chunked transfer (patrz 2.7).

```json
Payload: { "scan_duration_sec": 10 }

Response (jeśli dane mieszczą się w jednym pakiecie):
{
  "networks": [
    {
      "ssid": "FreeWiFi",
      "bssid": "AA:BB:CC:DD:EE:FF",
      "channel": 6,
      "signal_dbm": -45,
      "encryption": "OPEN",
      "frequency_mhz": 2437
    }
  ]
}

Jeśli lista sieci przekracza MTU → automatyczny chunked transfer (patrz 2.7).

Błędy: BUSY (trwa skan lub inny transfer)
```

#### CMD_START_SCAN
Rozpoczęcie analizy bezpieczeństwa docelowej sieci.

```json
Payload:
{
  "ssid": "FreeWiFi",
  "bssid": "AA:BB:CC:DD:EE:FF",
  "password": null,
  "duration_sec": 120,
  "modules": ["ALL"]
}

Response:
{
  "scan_id": "uuid",
  "status": "ACCEPTED",
  "estimated_duration_sec": 120
}

Po zaakceptowaniu honeypot wysyła periodyczne STATUS notifications (patrz 2.8).

Błędy: BUSY (trwa inny skan)
```

#### CMD_STOP_SCAN
Anulowanie trwającego skanu. Dozwolone zawsze.

```json
Payload: { "scan_id": "uuid" }

Response:
{
  "status": "STOPPED",
  "partial_results_available": true
}

Błędy: SCAN_NOT_FOUND (podany scan_id nie istnieje lub nie jest aktywny)
```

#### CMD_GET_RESULT
Pobranie pełnych wyników zakończonego skanu. Inicjuje chunked transfer (patrz 2.7).

```json
Payload: { "scan_id": "uuid" }

Błędy:
  SCAN_NOT_FOUND - skan o podanym ID nie istnieje
  SCAN_IN_PROGRESS - skan jeszcze trwa, wyniki niedostępne
  BUSY - trwa inny transfer danych
```

#### CMD_GET_DEVICE_INFO
Pobranie szczegółów urządzenia.

```json
Payload: {}

Response:
{
  "device_id": "rpi-serial-xxxx",
  "firmware_version": "1.2.0",
  "hardware_model": "RPi 4",
  "wlan0_mac": "XX:XX:XX:XX:XX:XX",
  "wlan1_mac": "YY:YY:YY:YY:YY:YY",
  "battery_pct": 78,
  "storage_free_mb": 2137,
  "total_scans_performed": 46
}

Błędy: BUSY
```

#### CMD_UPDATE_CONFIG
Aktualizacja konfiguracji honeypota. Akceptowane są wyłącznie znane klucze konfiguracyjne.

```json
Payload:
{
  "default_scan_duration": 120,
  "auto_power_off_min": 30,
  "dns_reference_servers": ["8.8.8.8", "1.1.1.1"]
}

Dozwolone klucze:
  - default_scan_duration (int, 30-600 sekund)
  - auto_power_off_min (int, 0=wyłączone, 5-120 minut)
  - dns_reference_servers (string[], max 5 adresów IP)
  - monitor_channel_hop_interval_ms (int, 100-5000 ms)
  - status_update_interval_sec (int, 1-30 sekund)

Response sukces: { "status": "CONFIG_UPDATED" }
Response błąd:  { "status": "ERROR", "error_code": "INVALID_KEY", "message": "Nieznany klucz: xyz" }
Response błąd:  { "status": "ERROR", "error_code": "INVALID_VALUE", "message": "Wartość poza zakresem" }
Response błąd:  { "status": "ERROR", "error_code": "BUSY" }
```

---

### 2.7 Chunked transfer (Write with Response)

Używany do przesyłania dużych danych: wyniki skanów (CMD_GET_RESULT) i listy sieci (CMD_LIST_NETWORKS) gdy przekraczają MTU.

W odróżnieniu od Notify, **Write with Response** zapewnia flow control - honeypot wysyła następny chunk dopiero po otrzymaniu potwierdzenia (ACK) z warstwy BLE dla poprzedniego.

**Przebieg transferu:**

```
Telefon                                      Honeypot
  |                                             |
  |-- CMD_GET_RESULT {scan_id} ---------------> |  (COMMAND)
  |                                             |
  |<-- RESPONSE: TRANSFER_READY --------------- |  (RESPONSE)
  |    {total_chunks, total_bytes, checksum}    |
  |                                             |
  |<-- DATA: chunk 0 --- Write w/ Response ---->|  telefon ACK (BLE layer)
  |<-- DATA: chunk 1 --- Write w/ Response ---->|  honeypot czeka na ACK
  |<-- DATA: chunk 2 --- Write w/ Response ---->|  przed wysłaniem kolejnego
  |              ...                            |
  |<-- DATA: chunk N (last) --------------------|
  |                                             |
  |  Telefon składa chunki i weryfikuje CRC32   |
  |                                             |
  |-- CMD_TRANSFER_ACK ------------------------>|  (COMMAND)
  |   {scan_id, chunks_received, status}        |
  |                                             |
```

**Krok 1 - Metadane transferu (RESPONSE characteristic):**

```json
{
  "status": "TRANSFER_READY",
  "total_chunks": 15,
  "checksum": "a1b2c3d4"
}
```

| Pole | Opis |
|---|---|
| `total_chunks` | Liczba chunków do odebrania |
| `checksum` | CRC32 (hex) pełnego JSON - do weryfikacji integralności po złożeniu |

**Krok 2 - Transfer chunków (DATA characteristic, Write with Response):**

Honeypot wysyła chunki sekwencyjnie. Każdy chunk jest wysyłany jako Write with Response na DATA characteristic - warstwa BLE wymaga potwierdzenia odbioru zanim honeypot wyśle następny.

```json
{
  "chunk": 0,
  "total_chunks": 15,
  "data": "eyJjbGllbnRfc2Nhbl9pZCI6InV1aWQiLCJuZXR3b3..."
}
```

| Pole | Typ | Opis |
|---|---|---|
| `chunk` | int | Indeks chunka (zero-based) |
| `total_chunks` | int | Łączna liczba chunków |
| `data` | string | Fragment payloadu zakodowany w base64 |

**Krok 3 - Składanie po stronie telefonu:**

```
1. Buforuj chunki indeksowane po polu "chunk"
2. Po odebraniu wszystkich (chunk 0 .. total_chunks-1):
   a. Posortuj po indeksie
   b. Złącz pola data: chunk0.data + chunk1.data + ... + chunkN.data
   c. Base64-decode złączonego stringa
   d. Zweryfikuj CRC32 zdekodowanych bajtów vs checksum z TRANSFER_READY
   e. Parsuj UTF-8 string jako JSON
```

**Krok 4 - Potwierdzenie odbioru (CMD_TRANSFER_ACK):**

```json
Payload:
{
  "scan_id": "uuid",
  "chunks_received": 15,
  "status": "OK"
}
```

**Obsługa błędów transferu:**

| Scenariusz | Rozwiązanie |
|---|---|
| BLE disconnect w trakcie | Telefon po reconnect wysyła `CMD_GET_RESULT_RESUME { "scan_id": "uuid", "from_chunk": 7 }` - honeypot wznawia od podanego chunka |
| Checksum nie pasuje | Telefon wysyła `CMD_TRANSFER_ACK { status: "CHECKSUM_MISMATCH" }` - honeypot retransmituje cały transfer |
| Write with Response timeout | BLE stack automatycznie retransmituje na poziomie L2CAP (do 3 prób). Jeśli nadal brak ACK → disconnect → obsługa jak wyżej |

---

### 2.8 Powiadomienia statusu (Honeypot -> Telefon)

Podczas skanu honeypot wysyła periodyczne aktualizacje statusu przez RESPONSE characteristic (Notify). Jeśli telefon nie jest połączony, powiadomienia są pomijane - skan kontynuuje się niezależnie.

#### STATUS_UPDATE

```json
{
  "scan_id": "uuid",
  "state": "INITIALIZING|CONNECTING|CONNECTED|SCANNING|ANALYZING|COMPLETED|ERROR",
  "progress_pct": 27,
  "current_module": "ARP_SPOOFING",
  "modules_completed": ["EVIL_TWIN", "DEAUTHENTICATION"],
  "message": "Uruchomiona detekcja ARP spoofing...",
  "elapsed_sec": 60
}
```

#### ERROR

```json
{
  "scan_id": "uuid",
  "error_code": "CONNECTION_FAILED|TIMEOUT|HARDWARE_ERROR|MONITOR_MODE_FAILED",
  "message": "Nie można połączyć z docelową siecią"
}
```