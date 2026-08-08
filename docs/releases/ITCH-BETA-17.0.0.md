# PingPong Manager 17.0.0-beta.1 — Windows beta

Kanał: `beta/itch-candidate`. Finalna paczka dla testera będzie przenośnym
wydaniem Windows — bez instalatora i bez wymaganego konta w sklepie.

## Uruchomienie

1. Rozpakuj cały ZIP do zwykłego folderu.
2. Uruchom `PingPong-Manager-17.0.0-beta.1-x64.exe`.
3. Windows SmartScreen może ostrzec przed nieznanym wydawcą, ponieważ hobbystyczna
   beta nie ma płatnego certyfikatu podpisu kodu.

Gra przechowuje kariery lokalnie na komputerze. Przed aktualizacją warto
dodatkowo wyeksportować ważną karierę z menu gry.

## Co obejmuje beta.1

- poprawioną integralność lig, terminarzy, tabel, awansów i spadków w długich
  karierach oraz bezpieczne migracje starszych zapisów;
- jeden spójny skład klubu oraz nominację meczową 3+2 z czytelną dostępnością
  zawodników;
- pojedynczą liczbę OVR, gwiazdki aktualnego poziomu na listach oraz Peak OVR
  pokazywany dopiero na karcie zawodnika;
- kontrakty ze strategicznymi partnerami sprzętowymi, z profilem, długością,
  kosztem, premiami i warunkami wcześniejszego zerwania;
- czytelny status Pucharu Krajowego: format, nagrody, następny krok, droga klubu
  i stan po odpadnięciu;
- naturalne, fikcyjne marki sponsorów dla wszystkich krajów oraz zrozumiałe
  poziomy ofert;
- poprawki wypożyczeń i historii nominacji, w tym wyjaśnienie zniknięcia
  zawodnika zamiast pustego miejsca;
- własne logo, ikonę aplikacji Windows, favicon oraz gotowe materiały graficzne
  dla strony itch.io.

## Materiały itch.io

- `assets/branding/pingpong-manager-itch-cover-630x500.png` — okładka 630×500;
- `assets/branding/pingpong-manager-itch-banner.png` — pełny baner źródłowy;
- `assets/branding/pingpong-manager-logo.png` — logo źródłowe.

## Weryfikacja wydania

- `npm run check` — PASS;
- `npm test` — 336/336 PASS na wersji z brandingiem;
- pięć sezonów kariery po końcowych poprawkach rozgrywki — PASS wraz z corocznym
  zapisem, walidacją i ponownym wczytaniem;
- przenośny build Windows x64 — PASS;
- `app.asar` zawiera komplet pięciu zatwierdzonych materiałów brandingu;
- test startu — proces aplikacji aktywny po 12 sekundach na osobnym profilu;
- ZIP: 88 403 846 bajtów;
- SHA-256 ZIP: `DBEB9410C98945420F6221FB2A60126CE0C37941FDD0808BEC7350DE95C1141B`;
- SHA-256 EXE: `738D66BE4C4A5D4A1E27BBA9E4ACEA1F4236378446548EABE640B2A0B0F210AB`.

## Znane ograniczenia

- wydanie jest niepodpisane i może uruchomić ostrzeżenie SmartScreen;
- przed publicznym wydaniem nadal potrzebny jest test na czystym koncie Windows;
- Steamworks nie jest częścią tej bety i nie jest wymagany do gry.

Feedback najlepiej przesyłać razem z numerem sezonu, klubem, zrzutem ekranu oraz
wyeksportowanym zapisem sprzed błędu.
