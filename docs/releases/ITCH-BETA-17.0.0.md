# PingPong Manager 17.0.0 — Windows beta

Build: `beta/itch-candidate` at commit `78e0cf5`.

## Uruchomienie

1. Rozpakuj cały ZIP do zwykłego folderu.
2. Uruchom `PingPong-Manager-17.0.0-x64.exe`.
3. Windows SmartScreen może ostrzec przed nieznanym wydawcą, ponieważ hobbystyczna
   beta nie ma płatnego certyfikatu podpisu kodu.

Gra przechowuje kariery lokalnie na komputerze. Przed aktualizacją do kolejnej
wersji warto dodatkowo wyeksportować ważną karierę z menu gry.

## Zakres tej bety

- organiczna liczba wolnych zawodników i kandydatów sztabu;
- naprawiona integralność długich karier i migracja starszych zapisów;
- ograniczony Hall of Fame oraz trwała historia sezonów klubów;
- poprawione działanie fizjoterapeutów, rezerw i przygotowania meczowego;
- poprawki zgłoszeń betatestera: PulseForge, wiadomości `undefined`, stare decyzje,
  licznik `MATCH 5/5`, mieszanie infrastruktury PL/EN i regeneracja między sezonami.

## Weryfikacja

- `npm run check` — PASS;
- `npm test` — 266/266 PASS;
- `npm run test:full` — 299/299 PASS;
- 30 sezonów kariery — wszystkie reguły integralności PASS;
- przenośny plik Windows pozostawał aktywny po 8 sekundach testu startowego.

## Znany brak

Ta paczka używa jeszcze domyślnej ikony Electron. Własna ikona i materiały strony
itch.io zostaną dodane przed publiczną premierą.

Feedback najlepiej przesyłać razem z numerem sezonu, klubem, zrzutem ekranu oraz
wyeksportowanym zapisem sprzed błędu.
