# Przegląd

marcom-cadence to osobista aplikacja do planowania postów i okien jedzenia, prowadzenia diety i śledzenia treningów.

## Stan obecny

Aplikacja ma menu nawigacji z sześcioma widokami:

- **Dziś:** aktualny stan z postępem, odliczanie na żywo do końca postu lub następnego postu, następnego posiłku i następnego treningu, oś tygodnia oraz dzisiejsze posiłki z oznaczeniem minionych i następnego.
- **Tydzień:** oś tygodnia i lista okresów postu i jedzenia. Okresy jedzenia rozwijają się do kalendarza godzin tego okresu, z osobną sekcją na każdy dzień.
- **Dieta:** wybór dnia i wybrany dzień jako kalendarz z wierszami godzin, z posiłkami, treningami oraz początkami i końcami postów w ich godzinach. Kilka pustych godzin z rzędu zwija się do jednego krótkiego wiersza, a przycisk pokazuje zamiast tego wszystkie godziny. Wybór jest zapamiętywany w przeglądarce. Godziny postu i treningu są zacieniowane, a bieżąca godzina zaznaczona. Posiłki mają szacunkowe kalorie i makroskładniki oraz rozwijany przepis.
- **Zakupy:** lista zakupów na najbliższe 1 do 14 dni, liczona od teraz, zsumowana z zaplanowanych posiłków i pogrupowana według kategorii. Pozycje można odhaczać pojedynczo lub wszystkie naraz, a listę skopiować albo wydrukować na A4. Lista nie obejmuje przypraw, a odhaczenia nie są zapisywane.
- **Treningi:** miejsce na dziennik treningów.
- **Pomiary:** rysunkowa postać z punktami pomiarowymi i ostatnimi wartościami, formularz zapisu pomiarów według daty, zmiany od pierwszego wpisu i historia. Ponowny zapis tej samej daty łączy wartości.

Oś tygodnia to jeden pasek na cały tydzień. Przerywane linie oznaczają każdą północ, a kreska z napisem Teraz pokazuje bieżący dzień i godzinę.

W nagłówku można też przełączać tryb jasny i ciemny oraz język angielski i polski. Oba wybory są zapamiętywane w przeglądarce. Bez zapisanego wyboru aplikacja używa motywu systemu i języka przeglądarki.

Harmonogram tygodnia i jadłospis są zapisane w kodzie. Nie ma jeszcze logowania ani zapisywania danych osobistych.

## Struktura

| Ścieżka | Przeznaczenie |
|---|---|
| `index.html` | Struktura strony i wszystkie widoki |
| `css/app.css` | Style, w tym motyw jasny i ciemny |
| `favicon.svg` | Ikona aplikacji w stylu logo Marcom (biała litera na turkusowym kole) |
| `i18n/*.json` | Teksty interfejsu, po jednym pliku na język |
| `js/app.js` | Renderowanie, nawigacja i odświeżanie co sekundę |
| `js/diet.js` | Produkty, posiłki z wartościami i składnikami, plan tygodnia, sumy i obliczanie listy zakupów; nazwy i kroki przepisów są w `i18n/*.json` |
| `js/measurements.js` | Lista pomiarów, zapis w przeglądarce i obliczenia |
| `js/measurements-view.js` | Renderowanie i formularz widoku Pomiary |
| `js/i18n.js` | Ładowanie języka i wyszukiwanie tłumaczeń |
| `js/schedule.js` | Harmonogram tygodnia i czyste obliczenia czasu |
| `js/theme.js` | Przełączanie motywu |
| `js/theme-init.js` | Ustawia zapisany motyw przed narysowaniem strony |
| `.nojekyll` | Każe GitHub Pages publikować pliki bez przetwarzania |
| `package.json` | `npm start` do lokalnego uruchamiania na porcie 3100; sama aplikacja nie ma zależności |

## Decyzje techniczne

- Zwykły HTML, CSS i moduły JavaScript, bez etapu budowania.
- Wszystkie adresy są względne, bo strona działa pod `/marcom-cadence/`.
- Nawigacja używa fragmentu adresu (`#today`, `#week`, `#diet`, `#shopping`, `#training`, `#measurements`), który działa na GitHub Pages bez reguł serwera.
- Składniki posiłków to dane strukturalne, więc przepisy i lista zakupów korzystają z jednego źródła.
- Teksty tłumaczone w `index.html` mają atrybut `data-i18n`. Każdy plik języka musi zawierać te same klucze.
- Czasy w harmonogramie to godziny liczone od poniedziałku 00:00, w czasie lokalnym użytkownika. Okres może przechodzić przez koniec tygodnia.

## Dane i prywatność

Repozytorium i strona są publiczne. Trafiają tu tylko kod i ogólne treści. Pomiary są na razie w pamięci przeglądarki, więc zostają na jednym urządzeniu i znikają po wyczyszczeniu danych strony. Przejdą do Supabase za logowaniem, z Row Level Security na każdej tabeli, razem z innymi danymi osobistymi. W przeglądarce zapisywane są też motyw, język i sposób wyświetlania godzin.

## Uruchamianie i wdrożenie

Zobacz [README](../README.md).
