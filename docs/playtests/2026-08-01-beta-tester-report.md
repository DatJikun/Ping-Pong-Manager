# Raport beta testera — 2026-08-01

Status: **sześć zgłoszeń odtworzonych i naprawionych w kandydacie bety**.

Źródło: zewnętrzny beta tester. Nie zapisano jeszcze numeru commita/builda,
systemu operacyjnego ani pliku kariery, na którym wystąpiły problemy.

## Zgłoszone objawy

1. Po wybraniu partnera sprzętowego **PulseForge** pulpit nadal informował, że
   klub nie ma partnera sprzętowego.
2. W sekcji wiadomości wielokrotnie pojawiał się tekst **`undefined`**.
3. Menedżer objął klub w sezonie 6, ale otrzymał decyzje pochodzące z sezonów
   3–5.
4. Podczas piątego pojedynku ekran meczu pokazywał **`MATCH 5/4`**.
5. Język polski i angielski były przemieszane w interfejsie.
6. Część podstawowych zawodników rozpoczynała sezon ze zmęczeniem w zakresie
   **70–91%**.

## Materiał potrzebny przy późniejszej diagnozie

- dokładny plik `.exe` albo commit używany przez testera;
- zapis kariery sprzed wystąpienia każdego błędu, jeśli jest dostępny;
- kraj, klub, sezon i kolejka;
- wybrany język gry;
- zrzuty ekranów z `undefined`, `MATCH 5/4` i pulpitu po wyborze PulseForge;
- informacja, czy kariera była rozpoczęta od sezonu 1, z historią wstępną, czy
  przez zmianę klubu w trakcie kariery.

## Granica tego wpisu

Dokument rejestruje wyłącznie obserwacje beta testera. Nie przypisuje przyczyn,
nie ustala priorytetów implementacyjnych i nie zawiera poprawek w kodzie.

## Zamknięcie zgłoszeń

1. Pulpit korzysta teraz z rzeczywiście wybranego partnera technicznego zamiast
   z funkcji zwracającej zawsze brak partnera.
2. Podgląd wiadomości na pulpicie rozwiązuje semantyczne `msgKey` i `msgParams`
   tak samo jak pełne archiwum wiadomości.
3. Symulacja historii bez menedżera nie generuje jego poczty, skrzynka jest
   czyszczona przy przejęciu klubu, a migracja usuwa wyłącznie nieodpowiedziane
   decyzje starsze niż bieżący sezon.
4. Licznik pojedynków używa długości rzeczywistego protokołu meczu.
5. Akademia, przygotowanie sezonu, partnerzy techniczni i poziomy infrastruktury
   6–7 korzystają z angielskiej warstwy prezentacji, gdy aktywny jest angielski.
6. Regeneracja między sezonami używa wzoru
   `round(max(0, fatigue - 30) * 0.20)`; zmęczenie 70/90/100 przechodzi na
   8/12/14 zamiast na 40/60/70.

Dowody: siedem testów regresji RED→GREEN, `npm run check`, szybki zestaw
`npm test` — **266/266 PASS** oraz pełny zestaw `npm run test:full` —
**299/299 PASS**. Raport należy ponownie potwierdzić na paczce `.exe`
przed publicznym wydaniem na itch.io.

