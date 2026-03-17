# Diagramy przepływu danych (Data Flow)

## 1. Główny przepływ danych systemu (DFD)

<img src="../Diagramy/dataflow_glowny.svg">
Pokazuje jak dane przepływają od momentu skanu sieci WiFi aż do wyświetlenia statystyk społeczności.

### Opis kroków:

1. **Analiza Sieci** - Urządzenie honeypot zbiera informacje o sieci oraz analizuje je, a następnie oblicza rating bezpieczeństwa.
3. **Transfer wyników** - Po zakończeniu skanu wyniki są przesyłane do telefonu przez BLE
4. **Cache lokalny** - Aplikacja mobilna zapisuje wynik w lokalnej bazie SQLite
5. **Kolejkowanie** - Skan jest dodawany do kolejki uploadów ze statusem PENDING
6. **Upload** - Gdy pojawi się internet, Sync Engine wysyła dane na serwer
7. **Walidacja serwerowa** - Serwer weryfikuje integralność (hash), deduplikuje, zapisuje
8. **Agregacja** - Silnik statystyk przelicza rankingi sieci i globalne statystyki
9. **Prezentacja** - Frontend wyświetla interaktywne wykresy i statystyki

---

## 2. Szczegółowy flow pojedynczego skanu

Pokazuje dokładną sekwencję zdarzeń od momentu gdy użytkownik naciska "Skanuj" do wyświetlenia wyników.

<img src="../Diagramy/dataflow_skan.svg">

---

## 3. Flow synchronizacji offline queue z serwerem

Pokazuje jak kolejka skanów oczekujących na upload jest przetwarzana gdy telefon uzyska dostęp do internetu.

<img src="../Diagramy/dataflow_sync.svg">

