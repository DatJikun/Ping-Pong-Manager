# AGENTS.md

Ten plik jest dla agentów AI pracujących nad tym repozytorium. Zasady współpracy z właścicielem: [CLAUDE.md](CLAUDE.md). Start: [README.md](README.md) i [HANDOFF.md](HANDOFF.md).

## Cursor Cloud specific instructions

PingPong Manager to gra typu single-player (menedżer klubu tenisa stołowego) napisana w czystym HTML/JS (vanilla, bez frameworków i bez kroku budowania dla wersji przeglądarkowej). Zapisy karier trzymane są w przeglądarce (IndexedDB) + eksport JSON.

### Serwisy / jak uruchamiać, testować, budować

- Gra (web, główny tryb deweloperski): to statyczne pliki ładowane przez `index.html`. NIE ma bundlera ani `npm run dev`. Uruchamiasz ją serwując katalog repo dowolnym statycznym serwerem, np. `python3 -m http.server 8123` z katalogu repo, a potem otwierasz `http://localhost:8123/index.html`. Otwieranie pliku przez `file://` nie działa poprawnie (skrypty ładowane są względnymi ścieżkami i część funkcji przeglądarki jest ograniczona), więc zawsze serwuj przez HTTP.
- Lint / syntax check: `npm run check` (odpala `node --check` na kluczowych plikach `src/`). To jest jedyny "lint" w projekcie — nie ma ESLint/Prettier.
- Testy: `npm test` (Node built-in test runner, pomija testy oznaczone `[slow]`). Pełny zestaw: `npm run test:full`. Testy nie potrzebują przeglądarki ani serwera — to czysty Node.
- Długi bieg symulacji (opcjonalnie): `node tests/stress.js` (albo `node tests/stress.js youth` dla akademii).
- Build desktop (Windows, Tauri 2): tylko dla wydań `.exe`, robi się automatycznie na GitHubie (workflow `release-windows.yml`) i wymaga toolchainu Rust. NIE jest potrzebny do dewelopmentu ani testów w tym środowisku.

### Gotchas (nieoczywiste)

- `favicon.ico` zwraca 404 przy serwowaniu przez `http.server` — to kosmetyka, nie błąd gry.
- W UI szybkie / podwójne klikanie w przyciski nawigacji lub „Rozpocznij Sezon” potrafi wywołać nakładkę ładowania (czarny ekran z kręcącym się białym sześcianem) i chwilowy brak reakcji, bo w tle liczy się symulacja. To normalne zachowanie przy generacji świata / symulacji, a nie crash — poczekaj aż nakładka zniknie i klikaj pojedynczo.
- CI (`.github/workflows/ci.yml`) chodzi na `windows-latest` z Node 22 i odpala `npm run check` + `npm test`. Node 22 to wymagana wersja.
- Po zmianie wersji gry pamiętaj o synchronizacji: `src/data/version.js`, `package.json`, `src-tauri/tauri.conf.json` (pilnuje tego `tests/version-sync.test.js`).
