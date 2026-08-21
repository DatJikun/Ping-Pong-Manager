# PingPong Manager

Menedżer klubu tenisa stołowego na Windows. Prowadzisz skład, sztab, budżet,
akademię, transfery i kontrakty, a potem rozgrywasz ligę, puchar oraz Top 12.

## Aktualne wydanie

Najnowsza wersja testowa to `0.1.1`. Wydanie na GitHubie nazywa się
`PingPong Manager 0.1.1 beta (20260821)`, a jego tag to
`v0.1.1-20260821`. Data oznacza dzień buildu, nie numer gry.

Paczka dla Windows x64 nazywa się
`PingPong-Manager-0.1.1-windows-x64.zip`. Po rozpakowaniu uruchom
`PingPong-Manager-0.1.1-x64.exe`.

Beta 0.1.1 ma pełniejsze tłumaczenia angielskie i polskie, opcjonalny dźwięk
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
Zasady numeracji opisuje [`docs/VERSIONING.md`](docs/VERSIONING.md).

## Zapisy gry

Gra zapisuje kariery lokalnie i obsługuje eksport oraz import. Przed zmianą
wersji warto wyeksportować ważną karierę z menu gry.

Informacje o dołączonych fontach i ich licencjach znajdują się w
[`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
