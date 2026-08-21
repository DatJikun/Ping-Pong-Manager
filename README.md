# PingPong Manager

Menedżer klubu tenisa stołowego. Teraz **beta 0.1.0** — to nie jest jeszcze 1.0.

Gra jest po polsku, offline, dla jednej osoby. Prowadzisz klub: skład, skrzynka, budżet, akademia, sprzęt, skaut.

## Pobierz (Windows)

Każdy update na `master` buduje **instalator `.exe`** i wrzuca go do [Releases](https://github.com/DatJikun/Ping-Pong-Manager/releases).

1. Wejdź w najnowsze wydanie (np. `PingPong Manager 0.1.0 beta (20260821)`).
2. Pobierz instalator NSIS (plik `.exe`).
3. Zainstaluj i odpal **PingPong Manager**.

Data w tytule wydania to dzień buildu, nie nowy numer gry. Numer widzisz też na ekranie startowym.

## Wersje

| Numer | Co oznacza |
|---|---|
| **0.1.0** | Pierwsza publiczna beta |
| **0.1.1, 0.1.2…** | Małe poprawki i dopiski do tej bety |
| **0.2.0** | Większy pakiet zmian w becie |
| **1.0.0** | Pierwszy prawdziwy release (docelowo Steam) |

Nie numerujemy gry samą datą (`200826`). Data jest tylko przy pliku na GitHubie, żeby odróżnić dzisiejszy instalator od wczorajszego przy tym samym `0.1.0`.

## Gra w przeglądarce

Bez instalacji: otwórz `index.html` (najlepiej Chrome / Edge). Po aktualizacji zrób twarde odświeżenie (`Ctrl+F5`).

Zapisy karier są w przeglądarce (IndexedDB). Zrób kopię **JSON** z menu, jeśli chcesz przenieść karierę albo zabezpieczyć sezon.

## Co jest w 0.1

- Liga, puchar, skład, kontrakty, sztab, akademia
- Skrzynka (0–3 sprawy na kolejkę, ciche kolejki są OK)
- Rodziny okładzin (kontrakt 1–5 lat, zmiana w przedsezonie)
- Skaut: OVR widać zawsze, cechy obcych jako pasma, peak `?` aż ich zeskautujesz
- Przewodnik w menu i na meczu „dlaczego ten wynik”

Czego jeszcze nie ma (i nie udajemy, że jest): angielski, Steam, edytor bazy, wyzwania.

## Testy (dla asystenta / CI)

```
npm test
npm run check
```

Instalator Windows buduje się sam na GitHubie po wrzuceniu zmian na `master` (workflow **Release Windows**).

## Dokumentacja

Zaczynaj od tego pliku. Reszta:

| Plik | Po co |
|---|---|
| [CHANGELOG.md](CHANGELOG.md) | Co weszło w betę |
| [ROADMAP.md](ROADMAP.md) | Co zostało do 1.0 |
| [VISION.md](VISION.md) | Po co ta gra istnieje |
| [HANDOFF.md](HANDOFF.md) | Stan prac dla kolejnej sesji AI |
| [docs/README.md](docs/README.md) | Mapa wszystkich notatek |
| [DESIGN-alive-career.md](DESIGN-alive-career.md) | Skrzynka, akademia, życie |
| [DESIGN-equipment.md](DESIGN-equipment.md) | Okładziny |
| [CLAUDE.md](CLAUDE.md) | Zasady współpracy z właścicielem |

Stare audyty i GDD v17 leżą w [docs/archive](docs/archive/README.md) — to historia, nie aktualny opis gry.
