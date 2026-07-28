# CLAUDE REVIEW — druga opinia do `CODEX-REVIEW.md`

> Data: 2026-07-28
> Audytowany stan: `master`, commit `1b975f9`, drzewo czyste
> Autor notatek: Claude (Claude Code)
> Charakter pliku: żywy dokument — kolejne przeglądy dopisywane na dole.
> Relacja do `CODEX-REVIEW.md`: **uzupełnienie, nie zamiennik.** Nie powtarzam tez,
> z którymi się zgadzam. Poniżej jest tylko to, co wnoszę ponad tamten audyt:
> korekty stanu faktycznego, trzy nowe znaleziska, zmiany w kolejności prac
> i propozycja podziału obowiązków.

## 0. Stanowisko w jednym akapicie

Zgadzam się z audytem Codexa w zdecydowanej większości: klasyfikacja projektu
(zaawansowana alpha, nie produkt sklepowy), lista bramek wydania, kolejność
Playtest → EA i odrzucenie tezy z `ROADMAP.md` o „close to release quality" są
moim zdaniem trafne. Nie mam kontrpropozycji dla strategii. Mam natomiast
**trzy konkretne znaleziska techniczne, których w tamtym audycie nie ma**, w tym
jedno, które podejrzewam o wyższy priorytet niż cokolwiek z listy P0, oraz kilka
zmian w kolejności prac, które moim zdaniem oszczędzą realny czas.

Sprawdziłem tezy Codexa bezpośrednio w kodzie. Wszystkie liczby poniżej pochodzą
z `1b975f9`, nie z wcześniejszego audytu.

---

## 1. Korekty stanu faktycznego

### P0.1 (historia Git) — zamknięte

Repozytorium ma teraz dwa commity (`c049aae` Baseline, `1b975f9` Checkpoint),
drzewo robocze jest czyste. Opisane w audycie „1766 dodanych linii poza historią"
już nie istnieje. Z tego P0 zostaje wyłącznie:

- automatyczny CI (`check` + `test` na każdym pushu);
- kopia repozytorium poza tym komputerem.

To już nie jest największe ryzyko operacyjne projektu.

### Prune istnieje — problem jest węższy, niż opisano

Audyt sugeruje, że stan rośnie, bo nic go nie sprząta. To nieścisłe.
`pruneCareerData()` ([src/core/gameplay.js:3186](src/core/gameplay.js:3186),
wołane w season-end w [gameplay.js:4311](src/core/gameplay.js:4311)) już:

- usuwa emerytów z `players`;
- tnie `hallOfFame` do 20 najlepszych karier;
- strippuje ciężkie `matchups`/`tiebreak` ze starych wyników;
- czyści osierocone wpisy `playerHistory`.

Ma też testy ([tests/prune.test.js](tests/prune.test.js)).

Prawdziwy kształt problemu widać dopiero w Twoich zapisach: w S11 na **1256
graczy przypada 997 wolnych agentów**. To nie jest wyciek ani brak sprzątania —
to **brak rotacji puli bezrobotnych**. Generator (14 nowych FA rocznie + juniorzy
+ uzupełnianie składów AI do 10 osób) produkuje szybciej, niż emerytura
konsumuje, a wolny agent bez klubu nie ma żadnego mechanizmu wyjścia poza
osiągnięciem wieku emerytalnego.

To znacząco zawęża zadanie z §3 audytu. Nie trzeba projektować „twardych budżetów
rozmiaru stanu" dla wszystkiego. Wystarczy jedna reguła: **wolny agent, którego
przez N sezonów nikt nie podpisał i który jest poniżej progu jakości dla swojej
ligi, odchodzi z rozgrywek.** Reszta puli jest ograniczona liczbą klubów razy
rozmiar składu i rośnie tylko liniowo.

---

## 2. Trzy znaleziska spoza audytu Codexa

### C0.1 — podejrzenie twardej ściany zapisu (moim zdaniem priorytet nr 1)

`persistGame()` ([src/core/state.js:126](src/core/state.js:126)) to jedna linia:

```js
function persistGame(){if(store.G){store.G._pid=ui._pid;localStorage.setItem(LOCAL_STORAGE_KEY,JSON.stringify(store.G));}}
```

Bez `try`/`catch`. Wołane z **45 miejsc** (44 w `gameplay.js`, 1 w `shell.js`) —
po każdej kolejce, transferze, przeczytanym mailu, zmianie ustawień składu.

Limit `localStorage` to około 5 MB na origin, przy czym większość silników liczy
łańcuchy w UTF-16, czyli realnie ~2,5 mln znaków. Zapisy z sezonów 8–11, które
opisujesz w §14 audytu, mają 4,5–7,7 MB.

**Zastrzeżenie, żeby nie przesadzić z pewnością:** te pliki to eksporty, a eksport
używa `JSON.stringify(..., null, 2)` ([src/main.js:52](src/main.js:52)), więc są
sformatowane z wcięciami. Wersja w `localStorage` jest kompaktowa i będzie
mniejsza, szacunkowo o 40–50%. Nie twierdzę więc, że limit **na pewno** został
przekroczony w sezonie 8. Twierdzę, że w okolicach S11 jesteśmy blisko limitu
albo za nim, a trend jest jednoznacznie rosnący.

Jeśli hipoteza się potwierdzi, konsekwencja jest poważna: w pewnym momencie długiej
kariery `setItem` rzuca `QuotaExceededError`, którego **nikt nie łapie**. Wyjątek
leci w środek przepływu sezonu, a gracz nie dostaje żadnego komunikatu — dokładnie
taki objaw jak „gra przestała działać w 8. sezonie". To jest alternatywne
wyjaśnienie przerwanej kariery, obok buga `_pid`, i te dwie hipotezy nie wykluczają
się nawzajem.

**Weryfikacja jest tania** — jeden test, zero zmian w kodzie gry: załadować
zachowane zapisy S4/S6/S8/S11, zserializować kompaktowo, policzyć
`JSON.stringify(G).length * 2` bajtów i wykreślić trend na sezon.

**Niezależnie od wyniku** — `setItem` bez obsługi błędu w 45 miejscach to defekt
sam w sobie i wpisuje się w P0.4 audytu („zapis nie spełnia standardu płatnego
produktu"). Minimum: jedna funkcja `safePersist()` z jawnym komunikatem i
propozycją eksportu awaryjnego zamiast cichego wyjątku.

### C0.2 — dokładna przyczyna niepełnej migracji ID (i dlaczego sam fix nie wystarczy)

Codex ustalił trafnie, że migracja nie widzi kolizji `academyProspects ↔ players`.
Mogę podać dokładny mechanizm.

W [src/core/state.js:288](src/core/state.js:288) `repairIds()` tworzy **nowy `Set`
przy każdym wywołaniu**:

```js
const repairIds=(arr)=>{
  const seen=new Set();      // ← nowy zbiór na każdą tablicę
  ...
};
repairIds(game.players);
repairIds(game.staff);
repairIds(game.staffPool);
repairIds(game.scoutPool);
repairIds(game.academyProspects);
repairIds(game.prDirectorPool);
```

Sześć niezależnych przebiegów, sześć niezależnych zbiorów. Kolizja *wewnątrz*
jednej tablicy jest wykrywana; kolizja *pomiędzy* tablicami — nigdy. Stąd dokładnie
objaw z S8: prospect o ID 319 i gracz o ID 319 przechodzą migrację nietknięci, a
`openPlayerModal(319)` otwiera pierwszego znalezionego.

Poprawka jednolinijkowa (wspólny `seen` na zewnątrz) jest oczywista, ale
**samodzielnie jest niebezpieczna**, i to jest mój główny wkład do tego wątku.
Przenumerowanie encji osierocą wszystkie referencje trzymane po ID. Znalazłem
co najmniej sześć takich rodzin:

| Referencja | Miejsce |
|---|---|
| `transferMarket[].playerId` | [gameplay.js:1802](src/core/gameplay.js:1802), 1807, 1811, 1820 |
| `loans[].playerId` | [gameplay.js:76](src/core/gameplay.js:76), 1833 |
| `playerHistory[id]` | [gameplay.js:2045](src/core/gameplay.js:2045), 3127, 3143 |
| `inbox[].decision.playerId` | [gameplay.js:2725](src/core/gameplay.js:2725) |
| `hallOfFame[].id` | prune/HoF |
| `results[].matchups[]` | protokoły meczowe |

Naiwne „duplikat dostaje nowe ID" po cichu wyrzuci zawodnika z rynku transferowego,
z wypożyczenia albo z jego własnego wykresu rozwoju. Zamienimy jeden widoczny bug
na kilka niewidocznych.

**Reguła, którą proponuję zapisać w spec zadania:** przy kolizji przenumerowujemy
zawsze encję **bez referencji** — kandydata z `academyProspects`, `staffPool`,
`scoutPool` — a **nigdy** gracza obecnego w `players`. Kolejność przetwarzania:
`players` pierwsze i nietykalne, reszta ustępuje.

Do tego test, który moim zdaniem jest wart więcej niż sam fix: **test integralności
referencyjnej** — po migracji każde `playerId`/`id` występujące w referencjach musi
wskazywać na istniejącą encję, a żadne ID nie może występować dwa razy w całym
save'ie. Uruchamiany na wszystkich siedmiu zachowanych zapisach jako fixture'ach.
Taki test złapie następną kolizję tej klasy, zanim trafi do gracza.

### C0.3 — brakuje mechanizmu egzekwującego „zakaz przypadkowej zmiany balansu"

§12 pkt 4 audytu stawia tę zasadę, ale nic jej nie pilnuje. Obecne 112 testów
sprawdza **własności** („OVR rośnie", „klub nie bankrutuje", „format ligi się
zgadza"), a nie **wartości**. Zmiana stałej w ekonomii przejdzie zieloną suitę.

Skoro seedy są deterministyczne, można to domknąć tanio: **golden run**.

- Uruchom karierę na ustalonym seedzie przez 10 sezonów.
- Zrzuć podsumowanie do fixture'a: końcowe tabele, saldo klubu, rozkład OVR w L1/L2,
  liczba encji w `players` i `results`, rozmiar zserializowanego save'a.
- Test porównuje bieżący przebieg z fixture'em i failuje przy dowolnym dryfie.
- Świadoma zmiana balansu wymaga `--update-golden` w **osobnym** commicie, którego
  diff pokazuje dokładnie, co się przesunęło.

Dwa efekty na raz: to jest jednocześnie **test budżetu rozmiaru stanu** z §3 audytu,
bo liczba graczy i rozmiar zapisu są częścią snapshotu. Regresja typu „pula rośnie
szybciej" przestaje wymagać osobnego stress testu w CI.

---

## 3. Zmiany w kolejności prac względem §9 audytu

Nie kwestionuję etapów ani bramek. Proponuję cztery przesunięcia, każde
uzasadnione oszczędnością pracy, nie preferencją.

### 3.1 Escaping i i18n to jeden przelot, nie dwa

Audyt umieszcza escapowanie danych w UI w Etapie B, a i18n w Etapie D. Oba
zadania przepisują **te same** ~1500 linii szablonów w `pages.js` i `gameplay.js`
(49 linii z `innerHTML`, plus template stringi). Robienie tego dwa razy to podwójna
okazja do regresji wizualnej w kodzie, którego nie da się sensownie testować
jednostkowo.

Proponuję jeden przebieg na plik: `${escapeHtml(t('key'))}`. Wyciągamy string do
katalogu tłumaczeń i owijamy w escaper w tym samym ruchu.

Konsekwencja dla planu: i18n częściowo awansuje z Etapu D do B. To nie znaczy, że
angielski musi być gotowy wcześniej — znaczy tylko, że **ekstrakcja stringów**
dzieje się razem z sanitacją, a tłumaczenie może poczekać.

### 3.2 Fikcyjna baza jako pierwsza paczka danych

Audyt ustawia kolejność: (1) format paczki, (2) import, (3) edytor, (4) Workshop —
i osobno P0.2 „fikcyjne nazwy w `constants.js`". To dwa razy ta sama praca nad
danymi.

Proponuję: napisać format paczki **najpierw** i dostarczyć nową, fikcyjną bazę
jako paczkę nr 0, ładowaną tym samym importerem co mody. Format zostaje
przetestowany produkcyjnie, zanim ktokolwiek z zewnątrz zrobi moda, a walidator
ma od pierwszego dnia realny plik testowy. Ryzyko prawne z P0.2 znika przy okazji.

### 3.3 Spike Tauri teraz, nie w Etapie C

Nie pełny build — jeden dzień na sprawdzenie, czy aplikacja startuje w WebView2 i
co dokładnie łamie restrykcyjny CSP.

Uzasadnienie: budżet sprzątania inline handlerów jest w tej chwili nieznany, a to
on determinuje długość Etapu C. Policzyłem linie zawierające `onclick=`:

| Plik | Linie z `onclick=` |
|---|---:|
| `src/ui/pages.js` | 102 |
| `src/core/gameplay.js` | 32 |
| `index.html` | 29 |
| `src/ui/shell.js` | 12 |
| `src/core/gameplay.club-ui.js` | 3 |
| **razem** | **178** |

(Zgodne z szacunkiem ~185 z audytu.) Bez spike'u planujemy Etap C na ślepo.

### 3.4 Inline handlery usuwać mechanicznie, nie ręcznie

178 ręcznych przepisań przez AI to prawie pewna regresja w klikalności ekranów.
Proponuję:

1. jedna globalna delegacja zdarzeń na `document`, mapująca atrybut `data-act`;
2. migracja plik po pliku, po jednym commicie na plik;
3. **test lintowy**, który failuje na każdym nowym `onclick=` w źródłach — żeby
   liczba mogła tylko spadać.

Punkt 3 jest tani i chroni przed cofaniem się do starego stylu przy kolejnych
funkcjach.

### 3.5 Stress 100 sezonów — nie przyspieszać na siłę

Audyt odnotowuje, że test nie kończy się w limicie 184 s. Nie optymalizowałbym
symulacji tylko po to, żeby ten test się mieścił — to optymalizacja pod narzędzie,
nie pod grę. Proponuję: 25 sezonów z twardym budżetem czasu i rozmiaru w CI,
100 sezonów jako osobny skrypt nightly / uruchamiany ręcznie przed wydaniem.

### 3.6 Coverage — jeden spike, potem plan B

Audyt słusznie zauważa, że `--experimental-test-coverage` mierzy tylko harness,
bo źródła są ładowane do VM. Wart godziny spike'u: nadanie skryptom VM nazw plików
i uruchomienie testów z `NODE_V8_COVERAGE`, żeby profiler przypisał pokrycie do
`src/`. Jeśli to nie zadziała w rozsądnym czasie — **nie walczyć**. Zamiast procentu
wprowadzić test inwentaryzacyjny: każda funkcja eksportowana w `window.PPM.gameplay`
musi być dotknięta przez co najmniej jeden test. To gorsza metryka, ale uczciwa i
tania, a procent pokrycia i tak nie jest bramką wydania.

---

## 4. Czego bym nie zmieniał

Żeby ten dokument nie wyglądał na listę zastrzeżeń — poniższe tezy Codexa uważam
za trafne i nie mam do nich alternatywy:

- klasyfikacja gotowości (alpha, nie produkt sklepowy) i odrzucenie „close to
  release quality" z `ROADMAP.md`;
- ścieżka Playtest → dopiero potem płatne EA;
- P0.2 (prawa do marek) i decyzja o w pełni fikcyjnej bazie;
- P0.3 jako realne ryzyko, nie teoretyczne — zwłaszcza w kontekście Tauri;
- P0.6 (brak dowodu, że obcy rozumie grę) jako większy bloker niż brak funkcji;
- diagnoza monolitu i rekomendacja splitu przy okazji pracy zamiast rewrite'u;
- konsolidacja dokumentacji do sześciu operacyjnych plików;
- rada z §15: nie dodawać kolejnych szerokich systemów.

Ocena obszarów z §8 wydaje mi się rozsądna. Jedyna korekta: „Zapisy i odporność
danych 2/10" bym obniżył, jeśli hipoteza C0.1 się potwierdzi — zapis, który
przestaje działać w połowie kariery bez komunikatu, jest gorszy niż zapis
prymitywny.

---

## 5. Propozycja podziału obowiązków

Pytanie jest zasadne, bo jesteśmy dwoma agentami o **różnych ograniczeniach**.
Codex sam zaznacza w §2 audytu, że nie miał dostępu do sterowania przeglądarką i
dlatego nie ocenia UI ani nie wykonał playtestu. Ja ten dostęp mam.

Proponuję podział **po rodzaju dowodu**, nie po obszarze kodu:

| | Codex | Claude (Claude Code) | Właściciel |
|---|---|---|---|
| **Rola** | audytor, autor specyfikacji | wykonawca + weryfikacja w runtime | decyzje, playtest, sprawy zewnętrzne |
| **Robi** | audyty, kryteria akceptacji, bramki wydania, konsolidacja dokumentów, review moich diffów | implementacja test-first, uruchamianie gry w headless Chrome, testy przepływu UI, commity, Tauri/packaging | wybory produktowe i balansowe, rekrutacja testerów, Steam, licencje, ewentualny prawnik |
| **Nie dotyka** | kodu gry | dokumentów strategicznych (`VISION`, `RELEASE`) | — |

### Dlaczego Codex nie powinien commitować kodu

Recenzent, który napisał daną zmianę, nie jest już jej recenzentem. Największą
wartością `CODEX-REVIEW.md` jest właśnie niezależność spojrzenia — utrzymanie
Codexa w roli audytora i autora spec chroni tę wartość. To nie jest ocena
kompetencji, tylko konstrukcja procesu.

### Gdzie mam przewagę operacyjną

Mogę uruchomić grę w headless Chrome, załadować zachowany zapis S8, kliknąć profil
juniora i **zobaczyć, czyj profil się otwiera**. To jest dokładnie ten „test
przepływu UI, nie tylko test modelu ID", którego audyt żąda w §14 pkt 5 i którego
Codex nie mógł wykonać. To samo dotyczy Etapu C: rozdzielczości, skalowanie DPI,
alt-tab, zachowanie po zamknięciu aplikacji w złym momencie.

### Zasady współpracy

1. **Jeden plik = jeden agent naraz.** Nigdy równolegle w `gameplay.js`.
2. **`BACKLOG.md` jest kontraktem.** Jedno zadanie ma: autora spec (Codex),
   wykonawcę, mierzalne kryterium akceptacji, listę plików w zakresie. Bez tego
   jeden agent cofa zmiany drugiego.
3. **Claude commituje, Codex recenzuje diff.** Nigdy odwrotnie.
4. **`CLAUDE-CODEX-CONVO.md` jest kanałem wymiany** — pytania, kontrpropozycje,
   ostrzeżenia „nie ruszaj tego pliku, jestem w środku". Właściciel przekazuje
   wpisy między sesjami.
5. Reguły z §12 audytu Codexa zostają bez zmian — są dobre i nie mam do nich
   poprawek.

---

## 6. Proponowana kolejność trzech pierwszych zadań

### Zadanie 1 — pomiar rozmiaru zapisu (czysta diagnostyka)

Zero zmian w kodzie gry. Załadować siedem zachowanych zapisów, zserializować
kompaktowo, zmierzyć rozmiar w bajtach UTF-16, wykreślić trend na sezon i
porównać z realnym limitem `localStorage`. Wynik rozstrzyga, czy C0.1 jest
priorytetem nr 1, czy tylko defektem do posprzątania przy P0.4.

**Kryterium zamknięcia:** znamy rozmiar zapisu w funkcji sezonu i wiemy, w którym
sezonie kariera przestaje się zapisywać.

### Zadanie 2 — kolizje ID, poprawnie

Najpierw test odtwarzający kolizję `academyProspects ↔ players` na `s8-k0-pre`.
Potem wspólny zbiór ID z regułą „nie przenumerowuj gracza z `players`". Potem test
integralności referencyjnej na wszystkich siedmiu zapisach. Na końcu weryfikacja w
headless Chrome: załadować S8, otworzyć profile 30 nowych juniorów, porównać
imię i ID.

**Kryterium zamknięcia:** żaden zachowany zapis po migracji nie ma powtórzonego ID
w całym obiekcie, wszystkie referencje wskazują na istniejące encje, a klik w
juniora otwiera jego własny profil.

### Zadanie 3 — golden run + budżet stanu

Snapshot 10-sezonowej kariery na ustalonym seedzie jako fixture, plus twarde limity
liczby encji, czasu sezonu i rozmiaru zapisu po 25 sezonach w CI.

**Kryterium zamknięcia:** dowolna zmiana wpływająca na balans lub rozmiar stanu
zapala czerwone światło, a jej akceptacja wymaga osobnego commitu z widocznym
diffem fixture'a.

Dopiero **po** zadaniu 3 ruszałbym rotację wolnych agentów — bez baseline nie da
się udowodnić, że naprawa wzrostu puli nie zepsuła jakości lig.

---

## Dziennik

### 2026-07-28 — pierwsza druga opinia

- Przejrzano `CODEX-REVIEW.md` i zweryfikowano jego tezy bezpośrednio w kodzie na
  commicie `1b975f9`. Kod gry nie został zmieniony.
- Potwierdzono zamknięcie P0.1 (dwa commity, czyste drzewo).
- Doprecyzowano problem wzrostu puli: istnieje `pruneCareerData()`, brakuje rotacji
  wolnych agentów (997 z 1256 encji w S11).
- Zgłoszono C0.1: `persistGame()` bez obsługi błędu w 45 wywołaniach, podejrzenie
  przekroczenia limitu `localStorage` w długiej karierze.
- Zgłoszono C0.2: dokładny mechanizm niepełnej migracji ID (`seen` tworzony per
  tablica) oraz sześć rodzin referencji, które naiwna naprawa osieroci.
- Zgłoszono C0.3: brak mechanizmu egzekwującego zakaz przypadkowej zmiany balansu;
  propozycja golden run.
- Zaproponowano cztery przesunięcia w kolejności prac i podział obowiązków.
