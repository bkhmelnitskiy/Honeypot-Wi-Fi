# Patryk Harasik

## Backend honeypota

- Znalezienie podobnych do tworzonego projektu rozwiązań

- Opracowanie zestawu detektorów
    - arp spoofing
    - dns spoofing
    - evil twin
    - network scan

- Implementacja poszczególnych modułów w oparciu o bibliotekę scapy oraz unbound
    - Pliki modułów znajdują się w folderze [honeypot/scanner/](/honeypot/scanner/)
    - [wifi_api_client.py](/honeypot/scanner/wifi_api_client.py) - interfejs do programu wifi napisanego przez Łukasza 
    - [interface_manager.py](/honeypot/scanner/interface_manager.py) - klasa obsługująca pobieranie interfejsów sieciowych
    - [launcher.py](/honeypot/scanner/launcher.py) - logika agregatora alertów oraz uruchamiania detektorów w wątkach

- Implementacja pierwszego orkiestratora, która ostatecznie została porzucona [orchestrator.py](/honeypot/orchestrator.py)
    - Orkiestrator komunikuje się poprzez bibliotekę requests z API programu wifi w celu podłączenia się do sieci
    - Następnie przeprowadza skany i wypisuje odpowiednie logi w CLI
    - Pierwotnie urządzenie miało działać w oparciu o 2 karty sieciowe

- Implmenetacja orkiestratora działającego po HTTP na porcie 5000 jako usługa systemowa w oparciu o bilbiotekę Flask [server.py](/honeypot/service/server.py)
    - to rozwiązanie miało być jedynie PoC pokzaującym, że jeśli rozwiązanie oparte na Bluetooth nie zostanie wdrożone na czas, to możliwe jest zastąpienie go komunikacją po przez serwer HTTP postawiony na AP za pomocą hostapd - minusem tego rozwiązania jest to, że wykorzystywane są 3 karty sieciowe
    - GET '/health' - zwraca informacje o gotowości orkiestratora do pracy (w tym informacje o dostępnych kartach sieciowych)
    - GET '/device_info' - zwraca między innymi nazwę urządzenia, firmware i ilość wykonanych skanów
    - GET '/device_status' - zwraca informację o aktualnie wykonywanym skanie i część informacji z endpointu '/device_info'
    - GET '/networks' - zwraca listę wykrytych sieci
    - POST '/scan' - uruchamia skan sieci. Jako parametr należy podać 'ssid' lub 'bssid' sieci, hasło 'psk' oraz czas trwania 'duration' w sekundach. Endpoint zwraca scan_id wykonywanego skanu
    - GET '/scan/status?scan_id=<id>' - zwraca informacje o statusie aktualnie wykonywanego skanu
    - GET '/alerts?scan_id=<id>' - zwraca dokładne informacje o znalezionych w skanowanej sieci zagrożeniach
    - GET '/scan/history' - zwraca listę wykonywanych skanów z krótkim podsumowaniem
    
## Integracja honeypota z aplikacją mobilną

- Modyfikacja mockowego interfejsu interakcji z rzeczywistym interfejsem honeypota  [honeypot.ts](/mobile_app/IoTApp/services/honeypot.ts)
- Dodanie do aplikacji funkcjonalności kontrolki wskazującej stan urządzenia honeypot 
- Dodanie hashowania wysyłanych na backend skanów
- Poprawienie drobnych błędów związanych z logiką wysyłania skanów na serwer

## Przygotowanie Raspberry Pi do działania jako honeypot

- Opracowanie razem z Łukaszem konfiguracji [wpa_supplicant.conf](/honeypot/config/etc/wpa_supplicant/wpa_supplicant.conf) oraz [dhcpcd.conf](/honeypot/config/etc/dhcpcd.conf)

- Uruchomienie daemonów:
    - [hostapd](/honeypot/config/etc/hostapd/hostapd.conf) - umożliwiającego połaczenie po wifi z honeypotem
    - [dnsmasq](/honeypot/config/etc/dnsmasq.conf) - pozwlającego na nadanie adresu podłaczonemu przez hostapd urządzeniowi
    - [wifi](/honeypot/config/etc/systemd/system/wifi.service) - API do wpa_supplicant'a napisanego przez Łukasza
    - [honeypot-serv](/honeypot/config/etc/systemd/system/honeypot-serv.service) - orkiestratora opartego na HTTP
    - [wifi-monitor-mode](/honeypot/config/etc/systemd/system/wifi-monitor-mode.service) - prostego [skryptu](/honeypot/config/usr/local/bin/wifi-monitor-setup.sh) ustawiającego kartę sieciową w tryb monitor 
    
- Ustawienie stałych nazw interfejsów sieciowych w [systemd](/honeypot/config/etc/systemd/network/)
