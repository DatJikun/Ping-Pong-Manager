# Codex model routing — design

## Cel

Obniżyć zużycie kredytów Codexa podczas pracy nad Ping Pong Managerem bez oddawania trudnych decyzji najsłabszemu modelowi i bez wpływu na inne projekty użytkownika.

## Przyjęty wariant

- Główna sesja projektu używa `gpt-5.6-terra` z poziomem rozumowania `high`.
- Wąski zwiad i powtarzalne prace wykonuje `gpt-5.6-luna` z poziomem `max`.
- Typową implementację wykonuje `gpt-5.6-terra` z poziomem `high`.
- Architekturę, migracje zapisów, trudne błędy wielosystemowe oraz kontrolę zmian wysokiego ryzyka obsługuje `gpt-5.6-sol` z poziomem `high`.
- Jednocześnie mogą działać najwyżej dwa pomocnicze agenty.
- Tylko jeden agent może w danym momencie edytować kod. Agenci zwiadowczy i seniorski pozostają tylko do odczytu.
- Nie powstają automatyzacje podtrzymujące sesje ani sztuczne „heartbeat'y”.

## Pliki

- `.codex/config.toml` — ustawienia obowiązujące tylko w tym repozytorium.
- `.codex/agents/ppm-explorer.toml` — tani agent do odczytu i zebrania dowodów.
- `.codex/agents/ppm-worker.toml` — agent do zwykłej implementacji i testów.
- `.codex/agents/ppm-senior.toml` — agent do rzadkich analiz wysokiego ryzyka i review.
- `AGENTS.md` — proste reguły wyboru agenta i ograniczenia zapobiegające niepotrzebnemu mnożeniu pracy.

## Granice bezpieczeństwa

Konfiguracja nie zmienia globalnego pliku `C:\Users\mwojn\.codex\config.toml`. Nie modyfikuje kodu ani balansu gry. Agenci nie mają być uruchamiani równolegle, jeśli zadania dotyczą tych samych plików albo zależą od siebie.
