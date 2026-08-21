# HANDOFF — stan prac

Jeśli sesja AI zaczyna od zera: najpierw [README.md](README.md), potem ten plik.

## Kto co robi

- **Mikołaj** — nie programuje. Gra, mówi co czuć i co zepsuć. Kierunek gry, UX, ryzyko zapisów.
- **Agent** — kod, testy, git, release. Nie pyta o warianty techniczne.

`npm test` i `npm run check` po każdej zmianie kodu.

## Co jest teraz (2026-08-21)

**Wersja produktu: 0.1.0 beta.** 1.0 = prawdziwy release (Steam). Łatki: 0.1.1, 0.1.2. Data tylko w tytule GitHub Release.

Gra: vanilla HTML/JS, `index.html`. Zapisy: IndexedDB + JSON. Schema zapisów: 22.

W grze m.in.: liga/puchar, 5 stylów, sprzęt (rodziny + kontrakt przedsezonowy), skaut (mgła), skrzynka + katalog życia, akademia (`peakChance`), przewodnik, VME z kanałami i „dlaczego ten wynik”.

Windows: Tauri 2, workflow `.github/workflows/release-windows.yml` (push na `master` → prerelease z `.exe`).

## Następne (kolejność dla gracza)

1. Ty: sezon w 0.1 — sprzęt, skaut, skrzynka, przewodnik. Czy coś gubi.
2. Potem do obcych: crash/export + jaśniejszy pierwszy przedsezon. Nie dokładamy nowych systemów.
3. Angielski, potem Steam (Cloud, strona sklepu). Edytor bazy i wyzwania — później.
4. Świadomie odłożone: partner sprzętu L, poaching/bankructwo, split `gameplay.js`.

## Testy

```
npm test
npm run check
```

Długi bieg: `node tests/stress.js`. Akademię: `node tests/stress.js youth`.

## Gdzie co leży

| Rzecz | Plik |
|---|---|
| Wersja | `src/data/version.js` (+ `package.json`, `src-tauri/tauri.conf.json`) |
| Silnik | `src/core/gameplay.js` |
| Ekrany | `src/ui/pages.js` |
| Menu / przewodnik | `src/ui/shell.js` |
| Zapisy | `src/core/save-manager.js`, `state.js` |
| Stałe | `src/data/constants.js` |
| Skrzynka / akademia | `DESIGN-alive-career.md` |
| Okładziny | `DESIGN-equipment.md` |
| Mapa docs | `docs/README.md` |
| Historia docs | `docs/archive/` |

Nowe pole w zapisie → default w `migrateLoadedGame()` + ewentualnie `SAVE_SCHEMA_VERSION`.
