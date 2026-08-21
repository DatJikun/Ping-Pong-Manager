# Numeracja (beta → 1.0)

Źródło prawdy: `src/data/version.js`, `package.json` i `src-tauri/tauri.conf.json` (ten sam numer). Pilnuje tego `tests/version-sync.test.js`.

- **0.1.0** — pierwsza publiczna beta.
- **0.1.1, 0.1.2** — małe poprawki (to jest „0.11 / 0.12” w mowie potocznej, zapisane poprawnie).
- **0.2.0** — większy pakiet w becie.
- **1.0.0** — pierwszy prawdziwy release.

Data (`20260821`) jest **tylko** w tytule GitHub Release, żeby odróżnić dzisiejszy `.exe` od wczorajszego przy tym samym numerze. Nie jest numerem gry.

Po merge do `master` workflow **Release Windows** buduje instalator NSIS i publikuje prerelease.
