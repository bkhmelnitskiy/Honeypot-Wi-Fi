# Architektura Systemu Honeypot Wi-Fi

## 1. Przegląd systemu

System Honeypot Wi-Fi to platforma IoT do analizy bezpieczeństwa otwartych sieci Wi-Fi. Składa się z trzech głównych komponentów połączonych dwoma kanałami komunikacji.

### Komponenty

| Komponent | Platforma | Rola |
|---|---|---|
| **Honeypot Device** | Raspberry Pi + 2x karta WiFi + powerbank | Łączy się z sieciami WiFi, monitoruje ruch sieciowy, analizuje pakiety pod kątem znanych wzorców ataków, generuje raport bezpieczeństwa sieci |
| **Mobile App** | Android | Zarządzanie urządzeniem honeypot (parowanie, konfiguracja, uruchamianie skanów), wyświetlanie wyników analiz, przechowywanie danych offline w lokalnej bazie, kolejkowanie skanów do wysłania na serwer |
| **Web Server** | Serwer | Centrum społeczności użytkowników - gromadzenie wyników skanów od wszystkich użytkowników, generowanie statystyk i rankingów sieci, udostępnianie interaktywnych wizualizacji danych, zarządzanie kontami użytkowników |

### Kanały komunikacji

| Kanał | Protokół | Opis |
|---|---|---|
| Honeypot <-> Mobile | Bluetooth LE| Komunikacja lokalna, bezpośrednia między urządzeniami, nie wymaga dostępu do internetu |
| Mobile <-> Server | HTTPS REST API + JWT auth | Synchronizacja danych gdy telefon ma dostęp do internetu, logowanie, upload skanów, pobieranie statystyk społeczności |

<img src="../Diagramy/architektura_wysokopoziomowa.svg">

## 2. Bluetooth LE jako primary communication

Podczas aktywnego skanu sieci WiFi:
- **wlan0** jest połączona z docelową siecią (tryb client) - honeypot musi być połączony z siecią żeby analizować ruch
- **wlan1** jest w trybie monitor mode - pasywne przechwytywanie wszystkich ramek WiFi w zasięgu

Żadna karta WiFi nie jest wolna do komunikacji z telefonem. **Bluetooth Low Energy** używa oddzielnego radia wbudowanego w Raspberry Pi i nigdy nie koliduje z operacjami WiFi. Dzięki temu użytkownik może na bieżąco obserwować postęp skanu na telefonie, nawet gdy obie karty WiFi są w użyciu.


## 3. Wewnętrzna architektura Honeypot Device (Raspberry Pi)


<img src="../Diagramy/architektura_honeypot.svg">

## 4. Wewnętrzna architektura Mobile App (Android)

Aplikacja mobilna zbudowana jest w architekturze trójwarstwowej, z naciskiem na działanie offline-first - wszystkie dane są najpierw zapisywane lokalnie, a synchronizacja z serwerem odbywa się w tle gdy pojawi się internet.

<img src="../Diagramy/architektura_mobile.svg" >


## 5. Wewnętrzna architektura Web Server

Serwer webowy służy jako centrum społeczności - gromadzi dane od wszystkich użytkowników i udostępnia zagregowane statystyki. Frontend aplikacji ma za zadanie wyświetlać statystyki i wyniki skanów wszystkich użytkowników. Komunikacja Frontend ←→ Backend będzie przez REST API.


<img src="../Diagramy/architektura_server.svg">


## 6. Safety Score - algorytm obliczania

Safety score (0-100, gdzie 100 = najbezpieczniejsza sieć) jest obliczany przez honeypot po zakończeniu wszystkich modułów detekcji:

### TODO (mejbi coś takiego)

```
base_score = 100

Dla kazdego wykrytego ataku:
  jesli severity == CRITICAL:  penalty = 30 * confidence
  jesli severity == HIGH:      penalty = 20 * confidence
  jesli severity == MEDIUM:    penalty = 10 * confidence
  jesli severity == LOW:       penalty = 5  * confidence

  base_score -= penalty

safety_score = max(0, base_score)
```

Gdzie:
- `severity` - powaga ataku (CRITICAL/HIGH/MEDIUM/LOW) - ustalana przez moduł detekcji na podstawie typu ataku
- `confidence` - pewność detekcji (0.0-1.0) - jak pewny jest moduł że atak naprawdę występuje (wyklucza false positives)

**Przykład**: Sieć z wykrytym ARP Spoofing (HIGH, confidence 0.87) i Evil Twin (CRITICAL, confidence 0.65):
- Penalty ARP: 20 * 0.87 = 17.4
- Penalty Evil Twin: 30 * 0.65 = 19.5
- Safety score: 100 - 17.4 - 19.5 = **63.1/100**

Serwer oblicza zagregowany score sieci jako ważoną średnią wszystkich skanów od różnych użytkowników, z wagą malejącą eksponencjalnie (half-life = 14 dni) - nowsze skany mają większy wpływ na ocenę.
