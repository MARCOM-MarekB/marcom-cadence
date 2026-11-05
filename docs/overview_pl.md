# Przegląd

marcom-cadence to osobista aplikacja do planowania postów i okien jedzenia, prowadzenia diety i śledzenia treningów.

## Stan obecny

Aplikacja ma menu nawigacji z czterema widokami:

- **Dziś:** aktualny stan (post albo jedzenie), czas do zmiany i najbliższy trening.
- **Tydzień:** jeden pasek z całym tygodniem i lista okresów postu i jedzenia.
- **Dieta:** miejsce na jadłospis.
- **Treningi:** miejsce na dziennik treningów.

W nagłówku można też przełączać tryb jasny i ciemny oraz język angielski i polski. Oba wybory są zapamiętywane w przeglądarce. Bez zapisanego wyboru aplikacja używa motywu systemu i języka przeglądarki.

Harmonogram tygodnia jest zapisany w kodzie. Nie ma jeszcze logowania ani zapisywania danych osobistych.

## Struktura

| Ścieżka | Przeznaczenie |
|---|---|
| `index.html` | Struktura strony i wszystkie widoki |
| `css/app.css` | Style, w tym motyw jasny i ciemny |
| `i18n/*.json` | Teksty interfejsu, po jednym pliku na język |
| `js/app.js` | Renderowanie, nawigacja i odświeżanie co minutę |
| `js/i18n.js` | Ładowanie języka i wyszukiwanie tłumaczeń |
| `js/schedule.js` | Harmonogram tygodnia i czyste obliczenia czasu |
| `js/theme.js` | Przełączanie motywu |
| `js/theme-init.js` | Ustawia zapisany motyw przed narysowaniem strony |
| `.nojekyll` | Każe GitHub Pages publikować pliki bez przetwarzania |

## Decyzje techniczne

- Zwykły HTML, CSS i moduły JavaScript, bez etapu budowania.
- Wszystkie adresy są względne, bo strona działa pod `/marcom-cadence/`.
- Nawigacja używa fragmentu adresu (`#today`, `#week`, `#diet`, `#training`), który działa na GitHub Pages bez reguł serwera.
- Teksty tłumaczone w `index.html` mają atrybut `data-i18n`. Każdy plik języka musi zawierać te same klucze.
- Czasy w harmonogramie to godziny liczone od poniedziałku 00:00, w czasie lokalnym użytkownika. Okres może przechodzić przez koniec tygodnia.

## Dane i prywatność

Repozytorium i strona są publiczne. Trafiają tu tylko kod i ogólne treści. Dane osobiste, takie jak waga, logi i pomiary, będą w Supabase za logowaniem, z Row Level Security na każdej tabeli. W przeglądarce zapisywane są tylko motyw i język.

## Uruchamianie i wdrożenie

Zobacz [README](../README.md).
