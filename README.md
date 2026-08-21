# PingPong Manager

Menedżer klubu tenisa stołowego na Windows. Prowadzisz skład, sztab, budżet,
akademię, transfery i kontrakty, a potem rozgrywasz ligę, puchar oraz Top 12.

## Aktualne wydanie

Najnowsza wersja testowa to
[17.0.0-beta.2](https://github.com/DatJikun/Ping-Pong-Manager/releases/tag/v17.0.0-beta.2).
Paczka dla Windows x64 nazywa się
`PingPong-Manager-17.0.0-beta.2-windows-x64.zip`. Po rozpakowaniu uruchom
`PingPong-Manager-17.0.0-beta.2-x64.exe`.

Beta.2 ma pełniejsze tłumaczenia angielskie i polskie, opcjonalny dźwięk
interfejsu, szybsze potwierdzenie kliknięć oraz obsługę klawiaturą w głównych
zakładkach i kreatorze nowej gry. Starsze kariery pozostają zgodne.

Windows SmartScreen może ostrzec przed nieznanym wydawcą, ponieważ plik nie ma
płatnego podpisu cyfrowego.

## Uruchomienie z kodu

Wymagany jest Node.js z npm.

```powershell
npm ci
npm run desktop
```

## Testy i build

```powershell
npm run check
npm test
npm run test:full
node tests/soak.js --seasons=5
npm run dist:win
```

Portable EXE trafia do `dist/`. Szczegóły wydania są w
[`docs/DESKTOP-RELEASE.md`](docs/DESKTOP-RELEASE.md), a zmiany w
[`CHANGELOG.md`](CHANGELOG.md).

## Zapisy gry

Gra zapisuje kariery lokalnie i obsługuje eksport oraz import. Przed zmianą
wersji warto wyeksportować ważną karierę z menu gry.

Informacje o dołączonych fontach i ich licencjach znajdują się w
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
