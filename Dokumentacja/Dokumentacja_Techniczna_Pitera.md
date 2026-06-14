# Dokumentacja techniczna — Backend, wdrożenie i komunikacja

**Autor części:** Michał Pitera
**Zakres dokumentu:** projekt architektury całego systemu, backend aplikacji (webserver), zarządzanie serwerem i automatyczny deployment, komunikacja web-frontendu z API oraz próba komunikacji Bluetooth w aplikacji mobilnej.

Dokument opisuje wyłącznie te fragmenty systemu, które zostały wykonane przeze mnie. Pozostałe komponenty (urządzenie honeypot — analiza pakietów, część warstwy UI mobilnej i webowej, badania wstępne) są opisane w osobnych dokumentach w katalogu [Dokumentacja/](.). Celem tej dokumentacji jest umożliwienie odtworzenia opisanych części przez osobę spoza zespołu, dlatego każda sekcja zawiera odwołania do konkretnych plików i fragmentów kodu, instrukcję uruchomienia, rozważane (ale odrzucone) alternatywy oraz wykorzystane źródła.

---

## Spis treści

- [Projekt architektury systemu (wkład przekrojowy)](#projekt-architektury-systemu-wkład-przekrojowy)
1. [Backend aplikacji (webserver)](#1-backend-aplikacji-webserver)
2. [Zarządzanie serwerem i automatyczny deployment](#2-zarządzanie-serwerem-i-automatyczny-deployment)
3. [Web-frontend — komunikacja z API (Axios)](#3-web-frontend--komunikacja-z-api-axios)
4. [Aplikacja mobilna — próba komunikacji Bluetooth](#4-aplikacja-mobilna--próba-komunikacji-bluetooth)
5. [Podsumowanie wkładu](#5-podsumowanie-wkładu)

---

## Projekt architektury systemu (wkład przekrojowy)

Przed rozpoczęciem implementacji byłem odpowiedzialny za **zaprojektowanie architektury całej aplikacji** — całościowej koncepcji systemu spinającej trzy komponenty (urządzenie honeypot, aplikacja mobilna, web serwer) oraz dwa kanały komunikacji (BLE lokalnie, HTTPS/REST przez internet). Projekt ten stanowił wspólną podstawę pracy całego zespołu i wyznaczył kontrakty (API, model danych, przepływy), które następnie były implementowane w poszczególnych częściach. Jest to wkład przekrojowy — wykracza poza pojedynczy komponent, dlatego opisuję go osobno, przed sekcjami implementacyjnymi.

Dokumentacja architektury znajduje się w katalogu [Dokumentacja/Architektura/](Architektura/), wraz z diagramami w [Dokumentacja/Diagramy/](Diagramy/):

| Dokument | Zakres |
|---|---|
| [Architektura/Architektura_Systemu.md](Architektura/Architektura_Systemu.md) | Przegląd systemu i jego komponentów, role i platformy, uzasadnienie wyboru kanałów komunikacji (m.in. dlaczego BLE jako komunikacja lokalna — obie karty Wi-Fi zajęte podczas skanu), wewnętrzna architektura każdego z trzech komponentów, koncepcja Safety Score |
| [Architektura/API.md](Architektura/API.md) | Pełny projekt kontraktu komunikacyjnego: REST API (Mobile/Web ↔ Serwer) — wszystkie zasoby, formaty żądań/odpowiedzi, jednolity format błędów, rate limiting, uwierzytelnianie; oraz protokół komend BLE GATT (Mobile ↔ Honeypot) — parowanie, koperty wiadomości, komendy, chunked transfer, powiadomienia statusu |
| [Architektura/DataFlow.md](Architektura/DataFlow.md) | Diagramy przepływu danych (DFD): główny przepływ systemu, szczegółowy przebieg pojedynczego skanu oraz synchronizacja kolejki offline z serwerem |

Diagramy (SVG) obrazujące architekturę: [architektura_wysokopoziomowa.svg](Diagramy/architektura_wysokopoziomowa.svg), [architektura_honeypot.svg](Diagramy/architektura_honeypot.svg), [architektura_mobile.svg](Diagramy/architektura_mobile.svg), [architektura_server.svg](Diagramy/architektura_server.svg) oraz przepływów danych: [dataflow_glowny.svg](Diagramy/dataflow_glowny.svg), [dataflow_skan.svg](Diagramy/dataflow_skan.svg), [dataflow_sync.svg](Diagramy/dataflow_sync.svg).

Spójność między projektem a implementacją jest widoczna w dalszych sekcjach: zaprojektowany kontrakt REST API i model danych odpowiadają zaimplementowanym kontrolerom i encjom (sekcje 1.2 i 1.4), zaprojektowany przepływ synchronizacji offline-first — modułowi `sync` (sekcja 1.5), a zaprojektowany protokół BLE GATT — próbie komunikacji Bluetooth (sekcja 4).

---

## 1. Backend aplikacji (webserver)

### 1.1. Stos technologiczny i struktura

Backend jest napisany w **TypeScript** na bazie frameworka **NestJS** (architektura modułowa z wstrzykiwaniem zależności). Bazą danych jest **PostgreSQL 16**, dostęp realizuje ORM **TypeORM**. Całość uruchamiana jest w kontenerach Docker.

Punkt wejścia aplikacji to [webserver/src/main.ts](../webserver/src/main.ts), a główny moduł spinający wszystkie pozostałe to [webserver/src/app.module.ts](../webserver/src/app.module.ts).

W [main.ts](../webserver/src/main.ts) skonfigurowane są globalne mechanizmy aplikacji:

- **Globalny prefiks** `api/v1` dla wszystkich tras (z wyłączeniem endpointu `/metrics`) — [main.ts:19](../webserver/src/main.ts#L19).
- **Globalna walidacja** wejścia (`ValidationPipe` z `whitelist`, `transform` i kodem błędu `422 Unprocessable Entity`) — [main.ts:21-27](../webserver/src/main.ts#L21-L27).
- **Serializacja odpowiedzi** (`ClassSerializerInterceptor`) — pozwala ukrywać pola wrażliwe poprzez dekoratory w klasach DTO.
- **CORS** z obsługą ciasteczek (`credentials: true`), z origin pobieranym ze zmiennej środowiskowej `CORS_ORIGIN` — [main.ts:29-32](../webserver/src/main.ts#L29-L32).
- **`cookieParser`** do odczytu tokenów z ciasteczek httpOnly.
- **Graceful shutdown** (`enableShutdownHooks`).

Struktura katalogu [webserver/src/](../webserver/src/) jest podzielona na moduły domenowe (`auth`, `users`, `scans`, `networks`, `stats`, `sync`) oraz katalog `common/` z elementami współdzielonymi (konfiguracja bazy, logowanie, metryki, filtry, guardy, dekoratory, DTO).

Moduły globalne zarejestrowane w [app.module.ts](../webserver/src/app.module.ts):

- `ConfigModule` (globalny, czyta `.env`),
- `ClsModule` (Continuation-Local Storage) — generuje/propaguje `requestId` dla każdego żądania, używany przez logger i metryki — [app.module.ts:24-39](../webserver/src/app.module.ts#L24-L39),
- `ThrottlerModule` — globalne ograniczanie liczby żądań (rate limiting), konfigurowalne przez `THROTTLE_TTL` i `THROTTLE_LIMIT` — [app.module.ts:43-53](../webserver/src/app.module.ts#L43-L53),
- globalny `ThrottlerGuard` i globalny filtr wyjątków `HttpExceptionFilter` — [app.module.ts:62-71](../webserver/src/app.module.ts#L62-L71).

### 1.2. REST API

API jest wersjonowane (`/api/v1`) i podzielone na kontrolery odpowiadające modułom domenowym. Każdy kontroler jest opisany dekoratorami Swaggera (`@ApiTags`, `@ApiOperation`, `@ApiResponse`).

| Moduł | Kontroler | Najważniejsze endpointy | Dostęp |
|---|---|---|---|
| Auth | [auth.controller.ts](../webserver/src/auth/auth.controller.ts) | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | publiczny (z rate-limitingiem) |
| Users | [users.controller.ts](../webserver/src/users/users.controller.ts) | `GET /users/me`, `PATCH /users/me`, `DELETE /users/me` | JWT |
| Scans | [scans.controller.ts](../webserver/src/scans/scans.controller.ts) | `GET /scans`, `GET /scans/:id` | JWT |
| Networks | [networks.controller.ts](../webserver/src/networks/networks.controller.ts) | `GET /networks`, `GET /networks/:id` | JWT |
| Stats | [stats.controller.ts](../webserver/src/stats/stats.controller.ts) | `GET /stats/global` (publiczny), `GET /stats/attacks` (JWT) | mieszany |
| Sync | [sync.controller.ts](../webserver/src/sync/sync.controller.ts) | `POST /sync`, `POST /sync/batch`, `GET /sync/status`, `GET /sync/:since` | JWT |

Standardowy, jednolity format błędów (`{ error, message, details }`) jest zgodny z projektem API ([Architektura/API.md](Architektura/API.md)) i jest produkowany centralnie przez filtr wyjątków (sekcja 1.6).

Listowanie kolekcji (`/scans`, `/networks`) wykorzystuje **paginację kursorową** (cursor-based) zamiast offsetowej — implementacja pomocnicza w [webserver/src/common/utils/cursor.ts](../webserver/src/common/utils/cursor.ts) i [webserver/src/common/dto/pagination-query.dto.ts](../webserver/src/common/dto/pagination-query.dto.ts). Kursor jest stabilny przy dopisywaniu nowych rekordów i wydajniejszy na dużych zbiorach niż `OFFSET`.

### 1.3. Uwierzytelnianie (JWT + odświeżanie tokenów)

Logika znajduje się w module `auth` ([auth.service.ts](../webserver/src/auth/auth.service.ts), [auth.controller.ts](../webserver/src/auth/auth.controller.ts), [auth-cookie.service.ts](../webserver/src/auth/auth-cookie.service.ts), [strategies/jwt.strategy.ts](../webserver/src/auth/strategies/jwt.strategy.ts)).

Założenia:

- **Hasła** hashowane biblioteką `bcrypt` (10 rund) — [auth.service.ts:27](../webserver/src/auth/auth.service.ts#L27). Kolumna `password_hash` jest oznaczona `{ select: false }` w encji, więc nigdy nie trafia do odpowiedzi domyślnie — [user.entity.ts:20-21](../webserver/src/users/entities/user.entity.ts#L20-L21). Przy logowaniu jest jawnie dociągana przez `addSelect` — [auth.service.ts:54-58](../webserver/src/auth/auth.service.ts#L54-L58).
- **Model dwóch tokenów:** krótko żyjący *access token* (domyślnie 1 h) i długo żyjący *refresh token* (domyślnie 30 dni) — generowane w [auth.service.ts:106-136](../webserver/src/auth/auth.service.ts#L106-L136).
- **Refresh token rotation:** refresh token jest przechowywany w bazie wyłącznie jako **skrót SHA-256** (encja [refresh-token.entity.ts](../webserver/src/auth/entities/refresh-token.entity.ts)); przy użyciu jest unieważniany (`revoked = true`) i wydawana jest nowa para tokenów — [auth.service.ts:75-91](../webserver/src/auth/auth.service.ts#L75-L91). Dzięki temu skradziony, raz użyty refresh token jest bezużyteczny.
- **Podwójny kanał tokenu:** dla klientów przeglądarkowych tokeny są dodatkowo ustawiane jako ciasteczka **httpOnly** ([auth.controller.ts:105-115](../webserver/src/auth/auth.controller.ts#L105-L115)), a strategia JWT odczytuje token najpierw z ciasteczka, a w razie jego braku z nagłówka `Authorization: Bearer` — [jwt.strategy.ts:22-28](../webserver/src/auth/strategies/jwt.strategy.ts#L22-L28). Klient mobilny korzysta z nagłówka, klient webowy z ciasteczek (zob. sekcja 3).
- **Rate limiting** na endpointach wrażliwych: `register` 3/min, `login` 5/min — [auth.controller.ts:34,44](../webserver/src/auth/auth.controller.ts#L34).
- Dostęp do tras chronionych zapewnia `JwtAuthGuard` ([common/guards/jwt-auth.guard.ts](../webserver/src/common/guards/jwt-auth.guard.ts)) razem z dekoratorem `@CurrentUser()` ([common/decorators/current-user.decorator.ts](../webserver/src/common/decorators/current-user.decorator.ts)).

### 1.4. Baza danych

Konfiguracja połączenia: [webserver/src/common/config/database.config.ts](../webserver/src/common/config/database.config.ts). Połączenie jest budowane asynchronicznie (`forRootAsync`), aby wstrzyknąć logger i serwis metryk. Encje są ładowane automatycznie (`autoLoadEntities: true`).

Model danych (encje TypeORM):

| Encja | Plik | Kluczowe pola / relacje |
|---|---|---|
| `User` | [user.entity.ts](../webserver/src/users/entities/user.entity.ts) | UUID, unikalny `email`, `password_hash` (ukryte), `display_name`; 1—N do `Scan` i `RefreshToken` |
| `RefreshToken` | [refresh-token.entity.ts](../webserver/src/auth/entities/refresh-token.entity.ts) | `token_hash`, `expires_at`, `revoked`; N—1 do `User` (kaskadowe usuwanie) |
| `Network` | [network.entity.ts](../webserver/src/networks/entities/network.entity.ts) | UUID, `ssid`, unikalny `bssid`, kanał, typ szyfrowania, częstotliwość, współrzędne GPS |
| `Scan` | [scan.entity.ts](../webserver/src/scans/entities/scan.entity.ts) | UUID `server_scan_id`, unikalny `client_scan_id`, `safety_score`, `scan_config` (jsonb), `payload_hash`; N—1 do `User` i `Network`, 1—N do `Attack` |
| `Attack` | [attack.entity.ts](../webserver/src/scans/entities/attack.entity.ts) | typ ataku (enum), waga (enum `Severity`), `confidence`, `details` (jsonb); N—1 do `Scan` |

Typy wykrywanych ataków (`AttackType`) i ich wagi (`Severity`) są zdefiniowane jako enumy PostgreSQL w [attack.entity.ts:10-24](../webserver/src/scans/entities/attack.entity.ts#L10-L24): m.in. `ARP_SPOOFING`, `DNS_SPOOFING`, `EVIL_TWIN`, `DEAUTHENTICATION`, `NETWORK_SCAN`, `MALWARE_PROPAGATION`.

Rozróżnienie `client_scan_id` (UUID nadawany przez urządzenie/aplikację) od `server_scan_id` (UUID nadawany przez serwer) jest fundamentem **idempotentnej synchronizacji** (sekcja 1.5).

### 1.5. Synchronizacja i przyjmowanie wyników skanów (moduł `sync`)

Moduł `sync` ([sync.service.ts](../webserver/src/sync/sync.service.ts), [sync.controller.ts](../webserver/src/sync/sync.controller.ts)) to interfejs, przez który aplikacja mobilna wysyła zebrane wyniki skanów na serwer i pobiera aktualizacje. Cała komunikacja jest realizowana modelem **offline-first** — telefon buforuje dane i synchronizuje je, gdy ma dostęp do internetu.

Kluczowe mechanizmy w [sync.service.ts](../webserver/src/sync/sync.service.ts):

- **Idempotencja uploadu** — przed zapisem sprawdzane jest, czy `client_scan_id` już istnieje; duplikat zwraca `409 Conflict` zamiast tworzyć kolejny rekord — [sync.service.ts:138-141](../webserver/src/sync/sync.service.ts#L138-L141). Pozwala to bezpiecznie ponawiać wysyłkę po zerwaniu połączenia.
- **Weryfikacja integralności (`payload_hash`)** — jeśli klient prześle skrót, serwer rekonstruuje kanoniczną postać payloadu i porównuje SHA-256; niezgodność daje `400 Bad Request` — [sync.service.ts:187-222](../webserver/src/sync/sync.service.ts#L187-L222).
- **Upsert sieci** — sieć identyfikowana po `bssid` jest tworzona lub aktualizowana atomowo (`upsert` z `conflictPaths: ['bssid']`) — [sync.service.ts:143-156](../webserver/src/sync/sync.service.ts#L143-L156).
- **Upload wsadowy** — `POST /sync/batch` przyjmuje do 50 skanów; każdy jest przetwarzany niezależnie, a odpowiedź ma status `207 Multi-Status` z wynikiem `CREATED`/`REJECTED` per skan — [sync.service.ts:90-129](../webserver/src/sync/sync.service.ts#L90-L129).
- **Synchronizacja przyrostowa** — `GET /sync/:since` zwraca sieci zmienione po danym znaczniku czasu, z paginacją (`has_more`, `next_since`) — [sync.service.ts:55-88](../webserver/src/sync/sync.service.ts#L55-L88).

Walidacja kształtu danych wejściowych odbywa się przez DTO w [webserver/src/sync/dto/](../webserver/src/sync/dto/) (m.in. [scan-upload.dto.ts](../webserver/src/sync/dto/scan-upload.dto.ts), [batch-upload.dto.ts](../webserver/src/sync/dto/batch-upload.dto.ts)) z dekoratorami `class-validator`.

### 1.6. Walidacja i centralna obsługa błędów

- Walidacja wejścia: globalny `ValidationPipe` ([main.ts:21-27](../webserver/src/main.ts#L21-L27)) plus DTO z `class-validator` w katalogach `dto/` każdego modułu.
- Centralny filtr wyjątków: [webserver/src/common/filters/http-exception.filter.ts](../webserver/src/common/filters/http-exception.filter.ts). Mapuje wszystkie wyjątki na jednolity format `{ error, message, details }`, specjalnie obsługuje błędy walidacji (`422`, lista pól) — [http-exception.filter.ts:46-71](../webserver/src/common/filters/http-exception.filter.ts#L46-L71), loguje każdy błąd z `requestId`/`userId` i inkrementuje licznik metryk `app_errors_total`. Nieznane wyjątki są zawsze sprowadzane do `500` bez wycieku szczegółów — [http-exception.filter.ts:97-116](../webserver/src/common/filters/http-exception.filter.ts#L97-L116).

### 1.7. Obserwowalność: logi, metryki, Grafana

System monitorowania to mój wkład w warstwę operacyjną. Składa się z trzech filarów zebranych w jednym dashboardzie Grafany.

**Logi (strukturalne JSON).** Logger oparty o `nestjs-pino` — konfiguracja w [webserver/src/common/logging/logging.module.ts](../webserver/src/common/logging/logging.module.ts):
- każdy log jest w formacie JSON z polami `requestId` i `userId` propagowanymi przez CLS — [logging.module.ts:33-36](../webserver/src/common/logging/logging.module.ts#L33-L36),
- **redakcja danych wrażliwych** (nagłówki `authorization`/`cookie`, hasła, tokeny są usuwane z logów) — [logging.module.ts:37-47](../webserver/src/common/logging/logging.module.ts#L37-L47),
- poziom logu zależny od kodu odpowiedzi (≥500 → `error`, ≥400 → `warn`) — [logging.module.ts:48-56](../webserver/src/common/logging/logging.module.ts#L48-L56),
- w trybie deweloperskim czytelny `pino-pretty`, w produkcji surowy JSON.

Logi kontenerów są zbierane przez **Promtail** ([webserver/monitoring/promtail-config.yml](../webserver/monitoring/promtail-config.yml)) — odkrywa kontenery z etykietą `logging=promtail` (etykieta ustawiona na serwisie `api` w [docker-compose.yml:13-14](../webserver/docker-compose.yml#L13-L14)), parsuje JSON i wyciąga pola (`level`, `requestId`, `statusCode`, `method`, `url`) jako etykiety strumienia — i wysyłane do **Loki** ([webserver/monitoring/loki-config.yml](../webserver/monitoring/loki-config.yml)).

**Metryki (Prometheus).** Serwis metryk [webserver/src/common/metrics/metrics.service.ts](../webserver/src/common/metrics/metrics.service.ts) (biblioteka `prom-client`) wystawia m.in.:
- `http_requests_total` i `http_request_duration_seconds` (histogram) — zbierane przez interceptor [http-metrics.interceptor.ts](../webserver/src/common/metrics/http-metrics.interceptor.ts),
- `db_slow_queries_total` — inkrementowane przez logger wolnych zapytań (poniżej),
- `app_errors_total` — z filtra wyjątków,
- domyślne metryki procesu Node.js (`collectDefaultMetrics`).

Endpoint `/metrics` jest **chroniony kluczem API** (`ApiKeyGuard`, nagłówek `x-api-key` lub `Bearer`) — [api-key.guard.ts](../webserver/src/common/metrics/api-key.guard.ts), [metrics.controller.ts](../webserver/src/common/metrics/metrics.controller.ts) — i wyłączony z rate-limitingu oraz dokumentacji Swagger. Prometheus ([webserver/monitoring/prometheus.yml](../webserver/monitoring/prometheus.yml)) uwierzytelnia się tokenem przekazywanym jako **docker secret** (`metrics_token`), zdefiniowanym w [docker-compose.yml:95-97](../webserver/docker-compose.yml#L95-L97).

**Wolne zapytania bazy.** Własny logger TypeORM [webserver/src/common/database/typeorm-slow-query.logger.ts](../webserver/src/common/database/typeorm-slow-query.logger.ts) loguje (z `requestId`) i zlicza zapytania przekraczające próg `DB_SLOW_QUERY_MS` — [typeorm-slow-query.logger.ts:40-56](../webserver/src/common/database/typeorm-slow-query.logger.ts#L40-L56).

**Grafana.** Provisioning źródeł danych ([monitoring/grafana/provisioning/datasources/datasources.yml](../webserver/monitoring/grafana/provisioning/datasources/datasources.yml)) podłącza Prometheus i Loki. Szczególnie istotny jest **derived field** `requestId` — pozwala przeskoczyć z konkretnej linii logu w Loki do powiązanych metryk, łącząc oba filary obserwowalności po identyfikatorze żądania — [datasources.yml:16-20](../webserver/monitoring/grafana/provisioning/datasources/datasources.yml#L16-L20). Dashboard jest provisionowany z pliku [monitoring/grafana/dashboards/honeypot.json](../webserver/monitoring/grafana/dashboards/honeypot.json). W produkcji Grafana jest dostępna wyłącznie z `localhost` (port `127.0.0.1:3333`) i z wymuszonym bezpiecznym ciasteczkiem oraz wyłączoną rejestracją — [docker-compose.prod.yml:112-123](../webserver/docker-compose.prod.yml#L112-L123).

### 1.8. HTTPS i terminacja TLS (Caddy)

Wsparcie HTTPS realizuje reverse proxy **Caddy** ([webserver/Caddyfile](../webserver/Caddyfile)), uruchamiane tylko w konfiguracji produkcyjnej ([docker-compose.prod.yml:24-46](../webserver/docker-compose.prod.yml#L24-L46)). Caddy:

- **automatycznie pozyskuje i odnawia certyfikaty TLS** (ACME / Let's Encrypt) dla hosta z `CADDY_HOSTNAME`, e-mail ACME z `CADDY_ACME_EMAIL` — [Caddyfile:1-5](../webserver/Caddyfile#L1-L5),
- **routuje ruch**: `/api/*` → kontener `api:3000`, pozostałe ścieżki → `frontend:80` — [Caddyfile:8-14](../webserver/Caddyfile#L8-L14),
- dodaje **nagłówki bezpieczeństwa** (HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, usunięcie nagłówka `Server`) — [Caddyfile:16-22](../webserver/Caddyfile#L16-L22),
- włącza kompresję (`zstd`, `gzip`).

Caddy nasłuchuje na `80`, `443` i `443/udp` (HTTP/3). Dla testów lokalnych wystarczy `CADDY_HOSTNAME=localhost` — Caddy wystawia wtedy certyfikat z wewnętrznego CA; dla realnego wdrożenia z publicznym IP można użyć `*.sslip.io` (zob. komentarz w [.env.example:37-40](../webserver/.env.example#L37-L40)).

### 1.9. Dokumentacja API (Swagger — tylko deweloperska)

Dokumentacja OpenAPI/Swagger jest generowana z dekoratorów kontrolerów i DTO, ale rejestrowana **wyłącznie poza środowiskiem produkcyjnym** — [main.ts:34-54](../webserver/src/main.ts#L34-L54). W produkcji (`NODE_ENV=production`) interfejs Swaggera nie jest w ogóle montowany, co eliminuje ujawnianie struktury API. W trybie deweloperskim dostępny pod `http://localhost:3000/api/v1`. Skonfigurowane są dwa schematy autoryzacji: `Bearer JWT` (`access-token`) oraz ciasteczko `access_token` — [main.ts:39-48](../webserver/src/main.ts#L39-L48).

### 1.10. Testy API (Postman)

Działanie API zostało zweryfikowane testami w **Postmanie**. Gotowa kolekcja jest dołączona do repozytorium: [Dokumentacja/Honeypot API.postman_collection.json](Honeypot%20API.postman_collection.json) (format Postman Collection v2.1) — można ją zaimportować bezpośrednio do klienta Postman.

Kolekcja zawiera **16 żądań** pogrupowanych w foldery odpowiadające modułom API, a każde żądanie ma dołączony skrypt testowy (`pm.test`, łącznie ok. 40 asercji):

| Folder | Żądania |
|---|---|
| **Auth** | `Register`, `Login`, `Refresh Token` |
| **Users** | `Get My Profile`, `Update My Profile` |
| **Sync** | `Upload Scan`, `Sync Status`, `Batch Upload` |
| **Scans** | `List Scans`, `Get Scan by ID` |
| **Networks** | `List Networks`, `Get Network by ID` |
| **Stats** | `Global Stats`, `Attack Stats` |
| **Cleanup** | `Logout`, `Delete Account` |

Każde żądanie weryfikuje kod statusu i kształt odpowiedzi (np. obecność `access_token`/`refresh_token` po logowaniu). Kolekcja jest **samowystarczalna i łańcuchowa**: skrypty zapisują wartości z odpowiedzi do zmiennych kolekcji (`access_token`, `refresh_token`, `scan_id`, `network_id`, `user_id` i in.) i wykorzystują je w kolejnych żądaniach — dzięki temu cały przepływ (rejestracja → logowanie → upload skanu → odczyt → wylogowanie/usunięcie konta) można odtworzyć jednym uruchomieniem przez **Collection Runner**.

Zmienne kolekcji obejmują m.in. `base_url` (domyślnie `http://localhost:3000/api/v1`) oraz dane konta testowego (`test_email`, `test_password`, `test_display_name`), więc po starcie backendu w trybie deweloperskim (sekcja 1.12) kolekcja działa bez dodatkowej konfiguracji. Postman był głównym narzędziem do testowania API w trakcie developmentu, komplementarnym wobec interaktywnej dokumentacji Swagger (sekcja 1.9).

**Odtworzenie:** Postman → *Import* → wskazać plik kolekcji → uruchomić backend → *Run collection* (lub uruchamiać żądania pojedynczo, zaczynając od `Auth/Register` lub `Auth/Login`).

### 1.11. Dane testowe (skrypty seed)

Do napełnienia bazy danymi demonstracyjnymi służą skrypty w Pythonie w [webserver/scripts/](../webserver/scripts/) (`main.py`, `seed_mock_data.py`, zarządzane przez `uv`/`pyproject.toml`), generujące spójne dane (`users`, `networks`, `scans`, `attacks`) do plików CSV i `seed.sql` w [webserver/scripts/out/](../webserver/scripts/out/). Hasła użytkowników są hashowane `bcrypt`, zgodnie z formatem oczekiwanym przez backend.

### 1.12. Uruchomienie lokalne (odtworzenie)

Wymagania: Docker + Docker Compose.

```bash
cd webserver
cp .env.example .env          # uzupełnić sekrety (JWT_SECRET, METRICS_API_KEY, ...)
docker compose up --build     # baza + override deweloperski
```

Compose w trybie deweloperskim automatycznie nakłada [docker-compose.override.yml](../webserver/docker-compose.override.yml), który uruchamia API w trybie watch (`npm run start:dev`), montuje kod źródłowy jako wolumeny i wystawia porty: API `3000`, frontend Vite `5173`, Prometheus `9090`, Loki `3100`, Grafana `3001`.

Po uruchomieniu:
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/v1`
- Grafana: `http://localhost:3001` (login `admin`, hasło z `GRAFANA_ADMIN_PASSWORD`)

### 1.13. Rozważane, lecz nieużyte rozwiązania (backend)

- **Sesje serwerowe zamiast JWT.** Rozważane, ale klient mobilny (bezstanowy, offline-first) i potrzeba uwierzytelniania urządzenia bez ciasteczek przemawiały za tokenami JWT. Kompromisem jest podwójny kanał (Bearer dla mobile, httpOnly cookie dla web).
- **Prometheus pushgateway / OpenTelemetry.** Rozważany pełny stack OTel (trace’y), ostatecznie wybrano lżejszy zestaw `prom-client` + Loki + Promtail jako wystarczający dla skali projektu i prostszy do samodzielnego hostowania.
- **Elastic/ELK do logów.** Odrzucone jako zbyt ciężkie; Loki integruje się natywnie z Grafaną i ma znacznie mniejsze wymagania zasobowe.
- **`express-rate-limit`.** Zastąpiony wbudowanym `@nestjs/throttler`, lepiej zintegrowanym z DI i dekoratorami per-endpoint.

### 1.14. Źródła (backend)

- Dokumentacja NestJS — https://docs.nestjs.com (moduły, guardy, interceptory, walidacja, Swagger).
- TypeORM — https://typeorm.io (encje, relacje, `upsert`, custom logger).
- Passport / `passport-jwt` — https://www.passportjs.org.
- `nestjs-pino` / Pino — https://github.com/iamolegga/nestjs-pino, https://getpino.io.
- `prom-client` — https://github.com/siimon/prom-client; model danych Prometheus — https://prometheus.io/docs.
- Grafana Loki + Promtail — https://grafana.com/docs/loki.
- Caddy (automatic HTTPS) — https://caddyserver.com/docs.
- `@nestjs/throttler` — https://docs.nestjs.com/security/rate-limiting.
- Postman (testy API, Collection Runner, zmienne środowiskowe) — https://learning.postman.com/docs.

---

## 2. Zarządzanie serwerem i automatyczny deployment

### 2.1. Konteneryzacja (Docker, multi-stage)

Obraz API jest budowany wieloetapowo — [webserver/Dockerfile](../webserver/Dockerfile):
- etap `dev` — pełne zależności + watch mode,
- etap `builder` — `npm run build`,
- etap `prod` — tylko zależności produkcyjne (`npm ci --omit=dev`), skopiowany `dist`, uruchomienie jako **nieuprzywilejowany użytkownik `node`** — [Dockerfile:21-36](../webserver/Dockerfile#L21-L36).

Stos jest opisany w trzech plikach Compose nakładanych warstwowo:

| Plik | Rola |
|---|---|
| [docker-compose.yml](../webserver/docker-compose.yml) | baza wspólna: `api`, `postgres` (z healthcheck), `prometheus`, `loki`, `promtail`, `grafana`, wolumeny, docker secret na token metryk |
| [docker-compose.override.yml](../webserver/docker-compose.override.yml) | tryb deweloperski (watch, montowanie kodu, otwarte porty) — nakładany automatycznie przez `docker compose` |
| [docker-compose.prod.yml](../webserver/docker-compose.prod.yml) | tryb produkcyjny: dochodzą `caddy` i `frontend`, hardening, limity zasobów, izolacja sieci |

**Hardening produkcyjny** ([docker-compose.prod.yml](../webserver/docker-compose.prod.yml)): kontenery z `read_only` filesystem + `tmpfs`, `cap_drop: ALL`, `no-new-privileges`, limity pamięci, healthchecki, Grafana wystawiona tylko na `localhost`, dedykowana podsieć — [docker-compose.prod.yml:1-23,125-129](../webserver/docker-compose.prod.yml#L1-L23).

### 2.2. Zarządzanie sekretami

Żadne sekrety nie są przechowywane w repozytorium. Plik [.env.example](../webserver/.env.example) zawiera wyłącznie placeholdery (`CHANGE_ME_...`). Sekrety produkcyjne są przechowywane jako **GitHub Actions Secrets** i wstrzykiwane do procesu deploymentu (sekcja 2.3). Token metryk dla Prometheusa jest przekazywany do kontenera mechanizmem **docker secrets** (montowany jako plik `/run/secrets/metrics_token`), a nie jako zmienna środowiskowa — [docker-compose.yml:40-41,95-97](../webserver/docker-compose.yml#L40-L41).

Lista sekretów wykorzystywanych w pipeline (zob. [.github/workflows/webserver.yml:20-36](../.github/workflows/webserver.yml#L20-L36)): `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `JWT_SECRET`, `CORS_ORIGIN`, `METRICS_API_KEY`, `GRAFANA_ADMIN_PASSWORD`, `CADDY_HOSTNAME`, `CADDY_ACME_EMAIL` oraz dane dostępowe do serwera: `VULTR_HOST`, `VULTR_USER`, `VULTR_SSH`.

### 2.3. Automatyczny deployment (GitHub Actions)

Pipeline CI/CD: [.github/workflows/webserver.yml](../.github/workflows/webserver.yml). Wyzwalany przez `push` na `main` w obrębie ścieżek `webserver/**`, `web-frontend/**` lub samego workflowu, a także ręcznie (`workflow_dispatch`) — [webserver.yml:3-11](../.github/workflows/webserver.yml#L3-L11).

Przebieg (logujemy się przez SSH na serwer Vultr akcją `appleboy/ssh-action`):

1. Sekrety są przekazywane jako zmienne środowiskowe sesji SSH (lista w polu `envs`) — [webserver.yml:32-36](../.github/workflows/webserver.yml#L32-L36).
2. Skrypt zdalny działa z `set -euo pipefail` (twarde przerwanie przy błędzie).
3. Repozytorium jest klonowane (przy pierwszym uruchomieniu) lub aktualizowane do **konkretnego SHA** commita wyzwalającego (`git fetch` + `git reset --hard $DEPLOY_SHA`) — gwarantuje deterministyczny, powtarzalny stan — [webserver.yml:43-51](../.github/workflows/webserver.yml#L43-L51).
4. Sprawdzana jest obecność wszystkich wymaganych sekretów (`: "${VAR:?...}"`) — deploy nie ruszy z brakującą zmienną — [webserver.yml:55-63](../.github/workflows/webserver.yml#L55-L63).
5. Plik `.env` jest generowany na serwerze z `umask 077` i `chmod 600` (dostępny tylko dla właściciela) — [webserver.yml:65-95](../.github/workflows/webserver.yml#L65-L95).
6. Stos jest przebudowywany i wdrażany jako projekt `honeypot` z nałożeniem konfiguracji produkcyjnej: `docker compose -f docker-compose.yml -f docker-compose.prod.yml ... pull/build/down/up -d`, na końcu `docker image prune -f` — [webserver.yml:97-104](../.github/workflows/webserver.yml#L97-L104).

### 2.4. Odtworzenie wdrożenia (na własnym serwerze)

1. Serwer z systemem Linux, zainstalowany Docker + plugin Compose, dostęp SSH kluczem.
2. W repozytorium na GitHubie skonfigurować wymienione w 2.2 *Repository Secrets* (w tym `VULTR_HOST`/`VULTR_USER`/`VULTR_SSH`).
3. Skierować rekord DNS hosta z `CADDY_HOSTNAME` na publiczny IP serwera (warunek pozyskania certyfikatu Let's Encrypt).
4. `push` na `main` (lub ręczne uruchomienie workflowu) wykonuje pełen deploy. Caddy automatycznie pobierze certyfikat TLS przy pierwszym starcie.

### 2.5. Rozważane, lecz nieużyte rozwiązania (deployment)

- **Rejestr obrazów (GHCR/Docker Hub) + `docker pull`** zamiast budowania na serwerze. Czystsze, ale wymaga publikacji obrazów i zarządzania tagami; dla pojedynczego, taniego serwera VPS budowanie na miejscu okazało się prostsze i wystarczające.
- **Kubernetes / Docker Swarm.** Zdecydowanie nadmiarowe dla jednego serwera; wybrano czysty Docker Compose.
- **Ansible / Terraform (IaC).** Rozważane do provisioningu serwera, ale przy jednym hoście narzut konfiguracji przewyższał korzyści; konfiguracja sprowadza się do skryptu w workflowie.
- **Traefik / nginx jako reverse proxy + certbot.** Caddy wybrano ze względu na w pełni automatyczne, bezkonfiguracyjne HTTPS (mniej ruchomych części niż certbot + nginx).

### 2.6. Źródła (deployment)

- GitHub Actions — https://docs.github.com/actions; szyfrowane sekrety — https://docs.github.com/actions/security-guides/encrypted-secrets.
- `appleboy/ssh-action` — https://github.com/appleboy/ssh-action.
- Docker multi-stage builds — https://docs.docker.com/build/building/multi-stage.
- Docker Compose (`-f` overrides, secrets) — https://docs.docker.com/compose.
- Dobre praktyki hardeningu kontenerów (`read_only`, `cap_drop`, `no-new-privileges`) — Docker security docs.
- Vultr (VPS) — https://www.vultr.com/docs.

---

## 3. Web-frontend — komunikacja z API (Axios)

Mój wkład we frontendzie webowym (Vue 3 + Pinia + Vue Router) to warstwa komunikacji z REST API zrealizowana w oparciu o **Axios**.

### 3.1. Globalna konfiguracja i automatyczne odświeżanie tokenu

Centralna konfiguracja w [web-frontend/src/main.js](../web-frontend/src/main.js):

- **`axios.defaults.withCredentials = true`** — wszystkie żądania wysyłają ciasteczka httpOnly z tokenami (model uwierzytelniania webowego z sekcji 1.3) — [main.js:6](../web-frontend/src/main.js#L6).
- **Interceptor odpowiedzi** automatycznie obsługujący wygaśnięcie sesji — [main.js:10-32](../web-frontend/src/main.js#L10-L32): przy odpowiedzi `401` (poza samymi trasami `/auth/`) interceptor jednorazowo wywołuje `POST /api/v1/auth/refresh`, a po udanym odświeżeniu **ponawia oryginalne żądanie**. Mechanizm jest zabezpieczony przed pętlą (`original._retry`) oraz przed równoległym wielokrotnym odświeżaniem (współdzielona obietnica `refreshing`) — dzięki temu kilka jednoczesnych żądań z wygasłym tokenem wywoła tylko jeden refresh.

Ten wzorzec sprawia, że pozostałe komponenty nie muszą w ogóle martwić się o cykl życia tokenu — wystarczy, że wykonują zwykłe zapytania.

### 3.2. Wykorzystanie w stanie aplikacji i komponentach

Komunikacja jest rozproszona po store’ach Pinia i komponentach, zawsze z `withCredentials`:

- Store użytkownika: `GET /users/me` — [stores/user.js:9](../web-frontend/src/stores/user.js#L9).
- Store statystyk globalnych: `GET /stats/global` — [stores/globalStats.js:9](../web-frontend/src/stores/globalStats.js#L9).
- Logowanie/rejestracja/wylogowanie: `POST /auth/login`, `POST /auth/register`, `POST /auth/logout` — [components/LoginForm.vue:38](../web-frontend/src/components/LoginForm.vue#L38), [components/RegisterForm.vue:49](../web-frontend/src/components/RegisterForm.vue#L49), [views/AccountView.vue:11](../web-frontend/src/views/AccountView.vue#L11).
- Wyszukiwanie sieci (z parametrami zapytania/paginacją): `GET /networks` — [components/NetworkSearch.vue:126](../web-frontend/src/components/NetworkSearch.vue#L126).
- Lista skanów użytkownika: `GET /scans` — [components/MyScans.vue:92](../web-frontend/src/components/MyScans.vue#L92).
- Szczegóły sieci/skanu: `GET /networks/:id`, `GET /scans/:id` — [components/NetworkDetails.vue:99](../web-frontend/src/components/NetworkDetails.vue#L99), [components/ScanDetails.vue:84](../web-frontend/src/components/ScanDetails.vue#L84).

### 3.3. Routing żądań: dev (proxy Vite) vs prod (nginx + Caddy)

Frontend wykonuje żądania pod ścieżki względne `/api/...`, co eliminuje problemy z CORS i pozwala działać w obu środowiskach bez zmian w kodzie:

- **Dev:** serwer deweloperski Vite proxuje `/api` na kontener API (`VITE_API_TARGET`, domyślnie `http://api:3000`) — [web-frontend/vite.config.js:29-34](../web-frontend/vite.config.js#L29-L34).
- **Prod:** statyczne assety serwuje nginx ([web-frontend/nginx.conf](../web-frontend/nginx.conf), z fallbackiem SPA `try_files ... /index.html`), a routing `/api/*` do backendu realizuje Caddy (sekcja 1.8). Obraz frontendu jest budowany wieloetapowo — [web-frontend/Dockerfile](../web-frontend/Dockerfile).

### 3.4. Rozważane, lecz nieużyte rozwiązania (frontend)

- **`fetch` zamiast Axios.** Axios wybrano dla wbudowanych interceptorów (kluczowych dla logiki refresh) i prostszej obsługi błędów/`withCredentials`.
- **Tokeny w `localStorage` + nagłówek `Authorization`.** Odrzucone na rzecz ciasteczek httpOnly (ochrona przed XSS) — token nie jest dostępny dla JavaScriptu.
- **Centralna instancja `axios.create()` z `baseURL`.** Rozważana; ostatecznie globalne `defaults` + ścieżki względne `/api` okazały się wystarczające i upraszczały konfigurację dev/prod.

### 3.5. Źródła (frontend)

- Axios (interceptory, `withCredentials`) — https://axios-http.com/docs.
- Vite (dev server proxy) — https://vite.dev/config/server-options.
- Vue 3 / Pinia — https://vuejs.org, https://pinia.vuejs.org.
- nginx (SPA `try_files`) — https://nginx.org/en/docs.

---

## 4. Aplikacja mobilna — próba komunikacji Bluetooth

### 4.1. Cel i uzasadnienie wyboru BLE

Zgodnie z założeniem architektury ([Architektura/Architektura_Systemu.md](Architektura/Architektura_Systemu.md), [Architektura/API.md](Architektura/API.md)) telefon miał komunikować się z urządzeniem honeypot lokalnie, **bez internetu**. Bluetooth Low Energy był naturalnym wyborem, ponieważ podczas aktywnego skanu **obie karty Wi-Fi urządzenia są zajęte** (`wlan0` w trybie klienta, `wlan1` w trybie monitor) — radio Bluetooth jest niezależne i nie koliduje z operacjami Wi-Fi.

Moim zadaniem było przygotowanie interfejsu tej komunikacji. **Próba zakończyła się częściowym sukcesem: udało się sparować telefon z honeypotem i przeprowadzić dwukierunkową wymianę danych (ECHO)**, jednak doprowadzenie pełnego protokołu do stabilnego działania przekroczyło ramy czasowe projektu i ostatecznie kanał BLE został zastąpiony komunikacją przez Wi-Fi (REST API).

### 4.2. Kontekst: protokół BLE GATT po stronie urządzenia (poza moim zakresem)

> Strona urządzenia (stos GATT na Raspberry Pi) **nie jest moją częścią** — została wykonana przez innego członka zespołu. Opisuję ją tu wyłącznie skrótowo jako kontekst, ponieważ interfejs po stronie aplikacji (sekcja 4.3) musiał być zgodny z tym kontraktem. Mój wkład w komunikację BLE dotyczy wyłącznie strony aplikacji.

Po stronie urządzenia komunikację realizuje stos GATT w języku **Go** (BlueZ przez D-Bus) w katalogu [honeypot/ble/](../honeypot/ble/), z usługą i dwiema charakterystykami (SSID, Security) oraz programami demonstracyjnymi peripheral/central potwierdzającymi dwukierunkową wymianę (ECHO). Szczegóły tej części opisuje dokumentacja autora komponentu urządzenia.

### 4.3. Interfejs po stronie aplikacji mobilnej

Po stronie aplikacji mobilnej (React Native / Expo), pełniącej rolę centrali BLE, zrealizowałem warstwę komunikacji z urządzeniem honeypot. Najważniejsze elementy:

- **Abstrakcyjna warstwa transportu** oddzielająca logikę aplikacji od konkretnej implementacji łącza — dzięki temu reszta aplikacji korzysta ze stabilnego interfejsu niezależnie od tego, czy pod spodem działa realne BLE, czy implementacja zastępcza. Interfejs obejmuje cały zakładany przebieg interakcji z urządzeniem: wykrywanie i parowanie, połączenie, odpytywanie o stan i informacje o urządzeniu, listowanie sieci, uruchamianie i zatrzymywanie skanu, odbiór wyników oraz strumień powiadomień o postępie skanu.
- **Integracja realnego BLE** w oparciu o natywną bibliotekę BLE dla React Native. Główną napotkaną barierą była konieczność użycia *development buildu* aplikacji (natywny moduł BLE nie działa w środowisku Expo Go) — na tym etapie udało się sparować telefon z urządzeniem i przeprowadzić dwukierunkową wymianę danych (ECHO).
- **Implementacja zastępcza (mock)** wiernie symulująca protokół komunikacji (stany połączenia, parowanie, listę sieci, okresowe powiadomienia o postępie i generowanie wyniku skanu). Pozwoliła rozwijać i testować całą aplikację bez fizycznie podłączonego, sparowanego urządzenia, a dzięki wspólnemu interfejsowi transportu jej podmiana na realne BLE nie wymaga zmian w pozostałej części aplikacji.

### 4.4. Dlaczego BLE porzucono i czym zastąpiono

Mimo udanego sparowania i wymiany ECHO, doprowadzenie pełnego, niezawodnego protokołu GATT (stabilne `Notify` dla długich sesji skanu, obsługa rozłączeń, ograniczenia MTU dla większych payloadów) okazało się czasochłonne — po mojej stronie głównie z powodu integracji natywnego modułu BLE w Expo (konieczny development build zamiast Expo Go). Wobec ograniczeń czasowych projektu zdecydowano o **zastąpieniu kanału lokalnego komunikacją przez Wi-Fi**: urządzenie po zakończeniu skanu łączy się z siecią z dostępem do internetu i wysyła wyniki do serwera przez REST API (moduł `sync`, sekcja 1.5), a aplikacja mobilna odczytuje je z tego samego API. Zachowany abstrakcyjny interfejs transportu sprawia, że powrót do BLE w przyszłości jest możliwy bez przepisywania logiki aplikacji.



### 4.5. Źródła (Bluetooth)

- `react-native-ble-plx` (BLE central po stronie aplikacji) — https://github.com/dotintent/react-native-ble-plx.
- Expo development builds — https://docs.expo.dev/develop/development-builds/introduction.
- Specyfikacja GATT (Bluetooth Core) — https://www.bluetooth.com/specifications.

---

## 5. Podsumowanie wkładu

| Obszar | Co zostało wykonane |
|---|---|
| **Architektura systemu** | Projekt architektury całej aplikacji (komponenty, kanały komunikacji, kontrakt REST API i BLE GATT, model danych, przepływy danych) jako wspólna podstawa pracy zespołu — udokumentowany w [Dokumentacja/Architektura/](Architektura/) i [Dokumentacja/Diagramy/](Diagramy/) |
| **Backend (webserver)** | Kompletne REST API (NestJS) z modułami auth/users/scans/networks/stats/sync; uwierzytelnianie JWT z rotacją refresh tokenów i podwójnym kanałem (Bearer/cookie); model danych i dostęp przez TypeORM/PostgreSQL; idempotentna synchronizacja wyników skanów z weryfikacją integralności; centralna walidacja i obsługa błędów; testy API w Postmanie pokrywające pełne scenariusze i przypadki brzegowe |
| **Obserwowalność** | Strukturalne logi (Pino) z korelacją `requestId`, zbiórka Promtail → Loki; metryki Prometheus (HTTP, błędy, wolne zapytania) z chronionym endpointem; dashboard Grafany z provisioningiem i powiązaniem logów z metrykami |
| **HTTPS / Swagger** | Terminacja TLS i nagłówki bezpieczeństwa przez Caddy (automatyczne certyfikaty); dokumentacja Swagger dostępna wyłącznie w środowisku deweloperskim |
| **Wdrożenie** | Wieloetapowe obrazy Docker + warstwowy Compose (dev/prod) z hardeningiem; pipeline GitHub Actions z deploymentem po SSH na konkretny commit; bezpieczne zarządzanie sekretami (GitHub Secrets, docker secrets, `.env` z restrykcyjnymi uprawnieniami) |
| **Web-frontend** | Warstwa komunikacji z API w oparciu o Axios — globalna konfiguracja, interceptor automatycznego odświeżania tokenu, integracja z proxy Vite (dev) i Caddy/nginx (prod) |
| **Mobile (Bluetooth)** | Komunikacja BLE **po stronie aplikacji**: abstrakcyjny interfejs transportu `HoneypotTransport` (zgodny z kontraktem protokołu) oraz implementacja mock; integracja natywnego BLE (`react-native-ble-plx`) z udanym parowaniem i wymianą ECHO. Strona urządzenia była poza moim zakresem. Kanał ostatecznie zastąpiono komunikacją Wi-Fi/REST |
