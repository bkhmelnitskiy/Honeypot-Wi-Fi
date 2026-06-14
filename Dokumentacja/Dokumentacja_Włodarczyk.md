# Łukasz Włodarczyk

### Główne wykonane zadania

- Implementacja [kontrolera](../honeypot/wifi/README.md) (dokument napisany w języku angielskim z przyzwyczajenia) serwisu systemowego wpa_supplicant w formie API HTTP działającym lokalnie w języku Go.
- Implementacja komunikacji Bluetooth w formie testowej pomiędzy urządzeniem Raspberry Pi oraz komputerem z systemem Linux w języku Go.
- Konfiguracja serwisów systemowych na urządzeniu Raspberry Pi.
- Debugowanie oraz naprawa błędów, również tych w innych częściach projektu.

### Wi-Fi HTTP API

Głównym zamysłem stojącym za stworzeniem tego komponentu systemu była potrzeba dynamicznego oraz kontrolowanego łączenia się ze skanowanymi sieciami Wi-Fi, jak również dostęp do szczegółowanych parametrów punktów dostępowych oraz oferowanych przez nich algorymów bezpieczeństwa. Udostępniony przez wpa_supplicant kanał komunikacji D-Bus opakowany został w prostszy i łatwiejszy w użyciu interfejs HTTP korzystający z formatu danych JSON.

### Bluetooth Low Energy

Pierwotnie komunikacja pomiędzy urządzeniem mobilnym a Raspberry Pi miała odbywać się za pomocą BLE. W takim scenariuszu komunikację obsługiwałby albo orkiestrator, albo osobny serwis lokalny który ponadto musiałby komunikować się z orkiestratorem.

Biblioteka [TinyGo](https://github.com/tinygo-org/bluetooth) została użyta do osiągnięcia tego celu. Jednakże zostały odkryte pewne zasadnicze problemy wynikające z (nieudokumentowanego przez autorów?) założenia że parowanie urządzeń zostało wcześniej wykonane (nie jest obsługiwane przez bibliotekę).

Biblioteka [bless](https://github.com/kevincar/bless) oferowała tą samą funkcjonalność (urządzenia peryferialnego oraz serwera GATT), ale niestety w dokumentacji po raz kolejny nie było nic wspomniane o parowaniu. W związku z tym została podjęta decyzja o nie testowaniu tego rozwiązania.

Najpewniejszym aczkolwiek bardziej czasochłonnym rozwiązaniem które zostało wybrane było skorzystanie z interfejsu D-Bus serwisu BlueZ działającym w systemie Linux. Na czas rozwijania oraz testowania komunikacji Bluetooth oraz aplikacji mobilnej konieczne było również stworzenie narzędzia klienckiego (urządzenia centralnego oraz klienta GATT).

W trakcie tworzenia oprogramowania napotkanych i rozwiązanych zostało wiele problemów i błędów, ale finalnie udało się nawiązać testowe połączenie oraz wymienić dane. Jednakże nie starczyło czasu na integrację z orkiestratorem, co zmusiło nas do skorzystania z alternatywnego planu, w którym na Raspberry Pi działają trzy interfejsy sieciowe, gdzie trzeci z nich zastępuje komunikację Bluetooth.

### Skonfigurowane serwisy w systemie Linux

- wpa_supplicant
- dhcpcd
- bluetooth

### Narzędzia oraz źródła

- [Interfejs D-Bus dla wpa_supplicant](https://w1.fi/wpa_supplicant/devel/dbus.html)
- [Interfejs D-Bus dla BlueZ](https://bluez.readthedocs.io/en/latest/)
- [Wiązania natywne D-Bus dla języka Go](https://github.com/godbus/dbus)
- [Kod TinyGo Bluetooth jako punkt odniesienia](https://github.com/tinygo-org/bluetooth)
