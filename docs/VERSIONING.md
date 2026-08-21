# Numeracja wydań

Numer gry jest zgodny z SemVer i pozostaje taki sam przez cały build. Data służy
tylko do nazwania GitHub Release i odróżnia kolejne paczki z tego samego dnia.

- `0.1.0`: pierwsza publiczna beta.
- `0.1.1`, `0.1.2`: małe poprawki tej bety.
- `0.2.0`: większy pakiet zmian w becie.
- `1.0.0`: pierwsze pełne wydanie.

Przykład dla obecnej wersji:

- numer gry: `0.1.1`;
- kanał: `beta`;
- tytuł GitHub Release: `PingPong Manager 0.1.1 beta (20260821)`;
- tag: `v0.1.1-20260821`.

Źródłami numeru w tej gałęzi są `package.json`, `package-lock.json` oraz
`src/data/version.js`. Test `tests/versioning.test.js` pilnuje ich zgodności.
