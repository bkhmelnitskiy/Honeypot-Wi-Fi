# Tomasz Styn:
## UX, UI, frontend
### 1. UX
- Rozpoznanie grupy odbiorców
- Ustalenie potrzeb odbiorców
- Sporządzenie rekomendacji dla projektowania UI na podstawie w/w rozpoznań ([UX_Report.md](Tydzien_1/UX_Report.md))
- Projektowanie User flows dla aplikacji ([Figma](https://www.figma.com/board/I3hxw1UKg9f6Huf0WyTvFF/User-Flows-IoT?node-id=0-1&t=Awvb3DkHzZjYr52F-1))

### 2. UI
- Pierwszy mockup wizualny aplikacji (Inkscape)
- Opracowanie spójnej, możliwej do implementacji szaty graficznej na podstawie wynków badania UX
- Lo-Fi wireframe aplikacji mobilnej ([Figma](https://www.figma.com/design/y93kjWZXqs9yuqkIsm0ugr/IoT-UI?node-id=0-1&t=Awvb3DkHzZjYr52F-1))
- Hi-Fi wireframe aplikacji mobilnej ([Figma](https://www.figma.com/design/y93kjWZXqs9yuqkIsm0ugr/IoT-UI?node-id=33-3&t=Awvb3DkHzZjYr52F-1))
- Lo-Fi wireframe strony internetowej ([Figma](https://www.figma.com/design/y93kjWZXqs9yuqkIsm0ugr/IoT-UI?node-id=12-2&t=Awvb3DkHzZjYr52F-1))
- Hi-Fi wireframe strony internetowej ([Figma](https://www.figma.com/design/y93kjWZXqs9yuqkIsm0ugr/IoT-UI?node-id=49-157&t=Awvb3DkHzZjYr52F-1))
- Projekt ikon SVG ([assets/icons](../web-frontend/src/assets/icons))

### 3. Strona internetowa (pierwsze doświadczenie z frontend development)
- Ikony zmienione w stylowalne assety Vue.js ([components/icons](../web-frontend/src/components/icons))
- Adaptacja logiki stworzonej przez Michała do potrzeb rozkładu strony ([components](../web-frontend/src/components) i [views](../web-frontend/src/views))
- Rozkład strony zgodnie z projektem
- Nawigacja sidebar ([Sidebar.vue](../web-frontend/src/components/Sidebar.vue))
- Stylizacja każdej podstrony zgdonie z projektem:
    - Rozkład i stylizacja każdego z komponentów w [web-frontend/src/components](../web-frontend/src/components)
    - Rozkład i stylizacja każdego z widoków w [web-frontend/src/views](../web-frontend/src/views)
    - Responsywne pola input
    - Stylizowane scrollowalne listy skanów i parametrów
    - Kolorowanie wyników bezpieczeństwa w zależności od wartości
    - Nauka oraz implementacja dynamicznego rozkładu strony w zależności od wymiarów okna przeglądarki
- Obsługa [chart.js](https://www.chartjs.org/) do wyświetlania wykresu aktywności
- Testowanie szyku strony na różnym sprzęcie (inne komputery, zmiana rozmiaru okna przeglądarki, telefon)
- Rozważane, lecz nie zaimplementowane:
    - Mapa skanów