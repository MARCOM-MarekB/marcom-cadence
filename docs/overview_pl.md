# Przegląd

marcom-cadence to osobista aplikacja do planowania postów i okien jedzenia, prowadzenia diety i śledzenia treningów.

## Stan obecny

Aplikacja ma jeden ekran:

- aktualny stan: post albo jedzenie oraz czas do zmiany,
- najbliższy trening,
- jeden pasek z całym tygodniem,
- lista okresów postu i jedzenia.

Harmonogram tygodnia jest zapisany w kodzie. Nie ma jeszcze logowania ani zapisywania danych.

## Struktura

| Ścieżka | Przeznaczenie |
|---|---|
| `index.html` | Struktura strony |
| `css/app.css` | Style, w tym motyw jasny i ciemny |
| `js/schedule.js` | Harmonogram tygodnia i czyste obliczenia czasu |
| `js/app.js` | Renderowanie i odświeżanie co minutę |
| `.nojekyll` | Każe GitHub Pages publikować pliki bez przetwarzania |

## Decyzje techniczne

- Zwykły HTML, CSS i moduły JavaScript, bez etapu budowania.
- Wszystkie adresy są względne, bo strona działa pod `/marcom-cadence/`.
- Czasy w harmonogramie to godziny liczone od poniedziałku 00:00, w czasie lokalnym użytkownika. Okres może przechodzić przez koniec tygodnia.

## Dane i prywatność

Repozytorium i strona są publiczne. Trafiają tu tylko kod i ogólne treści. Dane osobiste, takie jak waga, logi i pomiary, będą w Supabase za logowaniem, z Row Level Security na każdej tabeli.

## Uruchamianie i wdrożenie

Zobacz [README](../README.md).
