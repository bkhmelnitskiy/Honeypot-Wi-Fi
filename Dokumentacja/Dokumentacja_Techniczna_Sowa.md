# Sebastian Sowa:
## Aplikacja mobilna (frontend + integracja z REST API)
### 1. Dobór i konfiguracja frameworka
- Analiza dostępnych rozwiązań cross-platform i wybór stosu Expo + React Native + TypeScript (jeden codebase na Androida i iOS, możliwość web buildu)
- Konfiguracja projektu Expo z włączoną New Architecture i routingiem plikowym `expo-router` z typowanymi trasami (app.json)
- Wydzielenie centralnej konfiguracji runtime (adres API, timeout), nadpisywalnej zmienną `EXPO_PUBLIC_API_BASE_URL` (services/config.ts)
- Podział aplikacji na grupy tras `(auth)` i `(tabs)` (app/)

### 2. Implementacja interfejsu na bazie projektu
- Implementacja całego layoutu aplikacji zgodnie z zaprojektowaną szatą graficzną i przepływami (Dokumentacja_UX_UI_Styn.md)
- Dolna nawigacja zakładkowa (Dashboard, Scan, History, Community, Settings) z ikonami Ionicons (app/(tabs)/_layout.tsx)
- Stylizacja każdego ekranu zgodnie z projektem:
    - Dashboard — podsumowanie stanu i ostatnich skanów (Dashboard.tsx)
    - Scan — uruchamianie skanu i monitorowanie postępu w czasie rzeczywistym (scan_screen.tsx)
    - History / My networks — historia skanów i lista sieci (My_networks.tsx)
    - Community wraz z podstronami: wyszukiwanie, statystyki globalne, ranking (Community.tsx, community_search.tsx, community_stats.tsx, community_top.tsx)
    - Settings wraz z podstronami: aplikacja, urządzenie, parametry skanu, konto (settings.tsx, settings_app.tsx, settings_device.tsx, settings_scan.tsx, account.tsx)
    - Network details — szczegóły sieci z historią i podsumowaniem ataków (network_details.tsx)
- Obsługa motywu light/dark/system oraz preferencji języka (en/pl) (services/preferences.ts)
- Wspólne komponenty prezentacyjne i hooki motywu, z osobnymi wariantami `.web` (components/)
- Kolorowanie wyników bezpieczeństwa (Safety Score) w zależności od wartości

### 3. Integracja z REST API
- Centralny klient HTTP (`apiFetch`) oparty o `fetch` — nagłówki, dołączanie tokenu, mapowanie błędów na klasę `ApiError` (status / kod / lista pól) (services/api/client.ts)
- Warstwa endpointów zgodna z plikiem (Architektura/API.md), podzielona tematycznie:
    - logowanie, rejestracja, wylogowanie, profil, zmiana danych, usunięcie konta (api/auth.ts)
    - lista skanów z paginacją kursorową i filtrami, szczegóły skanu (api/scans.ts)
    - sieci społeczności — wyszukiwanie, sortowanie, filtrowanie geograficzne (api/networks.ts)
    - statystyki globalne i statystyki ataków (api/stats.ts)
- Typy TypeScript odwzorowujące dokumentację REST API (typy ataków, severity, payload skanu) (api/types.ts)

### 4. Uwierzytelnianie po stronie aplikacji
- Pełny przepływ JWT: logowanie, rejestracja, wylogowanie, profil użytkownika
- Automatyczne odświeżanie tokenu (refresh token) z kolejkowaniem równoległych żądań i globalnym handlerem `401` (services/api/client.ts)
- Bezpieczne przechowywanie tokenów w `expo-secure-store` (auth/storage.ts)
- Kontekst uwierzytelniania dla całej aplikacji i przełączanie między grupą `(auth)` a `(tabs)` (auth/AuthContext.tsx, app/_layout.tsx)

### 5. Warstwa offline-first (lokalna baza i synchronizacja)
- Lokalna baza SQLite (`expo-sqlite`) na skany, kolejkę uploadu i cache sieci (constants/db.ts)
- Silnik synchronizacji push/pull: wysyłka skanów w batchach (limit 50), pobieranie zmian od ostatniego znacznika `last_sync_at`, oznaczanie stanu (pending / syncing / synced / rejected) (sync/engine.ts)
- Liczenie `payload_hash` przy zachowaniu kolejności pól zgodnej z dokumentacją API (weryfikacja integralności po stronie serwera)
- Cache sieci i statystyk dla działania UI bez połączenia (network_cache.ts)
- Ekran kolejki aktualizacji do podglądu i ponawiania nieprzesłanych skanów (update_queue.tsx)

### 6. Spięcie ze skanem i warstwą urządzenia
- Menedżer cyklu życia skanu: lista sieci → wybór → start → oczekiwanie → wynik → zapis lokalny → kolejka uploadu (scan_manager.ts)
- Integracja z warstwą komunikacji z urządzeniem honeypot przez wspólny interfejs transportu (plik BLE/honeypot — zob. Dokumentacja_Techniczna_Pitera.md, sekcja 4), co pozwoliło rozwijać całą aplikację na implementacji zastępczej bez fizycznie podłączonego urządzenia

### 7. Rozważane, lecz nie zaimplementowane
- Mapa sieci (filtrowanie po GPS gotowe w API, brak widoku mapy)
- Powiadomienia push o wykrytych zagrożeniach
- Realny transport BLE jako domyślny kanał — wymaga development buildu poza Expo Go; ostatecznie kanał lokalny zastąpiono komunikacją przez REST API (zob. Dokumentacja_Techniczna_Pitera.md, sekcja 4.4)
