# CODEX REVIEW — audyt projektu i droga do wydania

> Data pierwszego audytu: 2026-07-28
> Ostatnia aktualizacja decyzji właściciela: 2026-07-28
> Audytowany stan: `master`, commit `c049aae` + istniejące niezacommitowane zmiany
> Autor notatek: Codex
> Charakter pliku: żywy dokument — kolejne przeglądy, decyzje i uwagi można dopisywać na dole.

## 1. Werdykt w jednym akapicie

**Ping Pong Manager jest zaawansowanym, grywalnym prototypem / closed alpha, a nie
jeszcze produktem gotowym do sprzedaży.** To już jest prawdziwa gra menedżerska,
nie tylko makieta: ma wielosezonową symulację, ligi, różne protokoły meczowe,
ekonomię, kontrakty, sztab, akademię, sprzęt, AI i pokaźny zestaw testów. Największą
wartością jest nisza oraz ilość połączonych systemów. Największym zagrożeniem nie
jest obecnie brak kolejnych funkcji, lecz przejście od „działa u autora” do
„bezpieczny produkt dla nieznajomego klienta”: wersjonowanie, zapis gry, dane
importowane przez użytkownika, wydajność długiej kariery, prawa do marek,
lokalizacja, onboarding, instalator i testy prawdziwego interfejsu.

Moja klasyfikacja:

- **zamknięte testy z kilkoma świadomymi testerami:** prawie tak;
- **publiczny, darmowy Steam Playtest:** po zamknięciu krytycznych problemów;
- **płatne Steam Early Access / płatny itch.io:** jeszcze nie;
- **pełne 1.0:** wyraźnie później.

Nie zgadzam się z fragmentem `ROADMAP.md`, że symulacja jest już „close to release
quality”. Jest obiecująca i dobrze testowana, ale aktualny wzrost stanu w długiej
karierze, brak testów E2E i silne sprzężenie kodu nie pozwalają jeszcze tak
powiedzieć.

## 2. Jak przeprowadzono audyt

Sprawdziłem:

- strukturę całego repozytorium i stan Git;
- wszystkie pliki Markdown na poziomie struktury, statusów i zależności oraz
  szczegółowo bieżące dokumenty: `DOCS`, `HANDOFF`, `VISION`, `ROADMAP`,
  `AUDIT-*`, `DESIGN-*`, aktualną część `CHANGELOG`;
- kod aplikacji, punkty wejścia, model stanu, zapis/migrację, generowanie świata,
  rynek, sezon, AI, szablony UI i zależności zewnętrzne;
- pełną kontrolę składni i wszystkie testy;
- krótki test długiej kariery i pełny test balansu klubu akademii;
- aktualne oficjalne wymagania Steam, Steam Playtest, Early Access, itch.io i
  zalecenia bezpieczeństwa Tauri.

Ograniczenie audytu: w tej sesji nie było dostępne sterowanie przeglądarką, więc
nie wykonałem pełnego ręcznego playtestu wizualnego i nie oceniam animacji,
czytelności każdego ekranu ani zachowania na konkretnych rozdzielczościach.

## 3. Wyniki testów — fakty

| Kontrola | Wynik |
|---|---|
| `npm run check` | **OK**, składnia wszystkich źródeł poprawna |
| `npm test` | **112/112 testów przeszło** |
| Czas pełnych testów | około **91 s** na tej maszynie |
| `node tests/stress.js 10` | **OK**, 10 sezonów w 42,2 s |
| `node tests/stress.js youth 40` | **OK**, cel akademii osiągnięty w sezonie 26, klub pozostał wypłacalny |
| `node tests/stress.js 100` | nie zakończył się w limicie 184 s; brak dowodu awarii, ale test jest obecnie zbyt wolny do wygodnego użycia |

Ważne zastrzeżenie: raport `node --test --experimental-test-coverage` nie mierzy
realnie pokrycia kodu gry, ponieważ aplikacja jest ładowana przez własny harness
do VM. Narzędzie pokazało tylko `tests/harness.js`, a nie `src/`. Liczba 112 testów
jest wartościowa, ale projekt **nie ma obecnie wiarygodnego procentu coverage**.

### Niepokojący wynik próby 10 sezonów

| Stan | Start | Po 10 sezonach |
|---|---:|---:|
| Gracze w `G.players` | 272 | **1340** |
| Pamięć heap | 9 MB | **114 MB** |
| Średni OVR L1 | 80 | 82 |
| Średni OVR L2 | 70 | **78** |
| Wyniki | 0 | 2640 |

To nie musi być klasyczny wyciek pamięci, ale jest to **realny wzrost danych i
kosztu symulacji**. Prawdopodobna przyczyna jest widoczna w kodzie: po wygaśnięciu
kontraktów wielu zawodników trafia na wolny rynek, AI uzupełnia każdy skład nowo
wygenerowanymi zawodnikami do 10 osób, a dodatkowo co sezon powstaje 14 nowych
wolnych agentów i juniorzy. Stare, wciąż aktywne obiekty pozostają w puli aż do
emerytury. Test „retired players are removed” nie zabezpiecza wielkości całej
aktywnej puli.

**Przed publicznym testem trzeba dodać twarde budżety rozmiaru stanu**, np.:

- maksymalna sensowna liczba wolnych agentów;
- maksymalny rozmiar `players`, `results`, historii i zapisu po 10/25/50 sezonach;
- maksymalny czas symulacji sezonu;
- zachowanie różnicy L1/L2 po 10/25/50 sezonach.

## 4. Co jest naprawdę dobre

### Produkt

- Bardzo czytelna nisza: nie ma tłoku gier typu „table tennis club manager”.
- Rdzeń fantazji menedżerskiej jest spójny: skład, kontrakty, sztab, akademia,
  infrastruktura i przygotowanie mają prowadzić do wyniku bez sterowania meczem.
- Protokoły różnych lig, style gry, debel i sprzęt dają grze własną tożsamość.
- Akademia i klub-wyzwanie są dobrym zalążkiem długoterminowej historii.
- Projekt ma już wystarczająco dużo systemów, aby **przestać dodawać szerokość**
  i zacząć poprawiać jakość, czytelność oraz opowieści.

### Inżynieria

- 112 testów to bardzo dobry wynik jak na projekt prowadzony przez vibe coding.
- Testy nie są wyłącznie „czy funkcja istnieje”; wiele sprawdza zachowanie
  statystyczne, formaty lig, migracje, ekonomię i regresje zgłoszone przez autora.
- Deterministyczne seedy ułatwiają reprodukcję błędów.
- `schemaVersion` i funkcja migracji są dobrym początkiem kompatybilności zapisów.
- Kod ma sensowne komentarze domenowe, a dokumentacja uczciwie przyznaje, co jest
  tylko projektem, co wdrożono i gdzie istnieje dług techniczny.
- Ostatnia warstwa wizualna ma konkretny kierunek, zamiast losowego zbioru kart.

### Sposób współpracy z AI

Najlepszą decyzją procesową było ustanowienie reguły: zmiana + test regresji +
aktualizacja dokumentacji. To chroni właściciela, który nie czyta kodu. Ten proces
trzeba jednak uzupełnić o małe commity, zewnętrzne playtesty i automatyczny CI.

## 5. Krytyczne problemy przed sprzedażą

### P0.1 — historia Git i możliwość odzyskania pracy

Repozytorium ma **jeden commit**. Bieżąca wersja zawiera 9 zmodyfikowanych plików,
łącznie około 1766 dodanych i 1113 usuniętych linii, które nie są zapisane w
historii Git. Remote `origin/master` wskazuje ten sam jedyny commit.

To jest obecnie największe ryzyko operacyjne: błąd AI, uszkodzony dysk albo
nieudane ręczne cofnięcie może zabrać cały ostatni etap UI.

**Działanie:** przed następną zmianą kodu przejrzeć diff i zapisać aktualny stan
jednym nazwanym checkpointem; potem wymagać małych, logicznych commitów. Dodatkowo
trzymać kopię poza tym komputerem.

### P0.2 — realne marki i nazwy klubów

`src/data/constants.js` zawiera realne kluby i ogromną liczbę realnych marek:
sprzęt, sponsorów i firmy z wielu państw. Przykłady to Butterfly, Tibhar, Stiga,
DHS, Samsung, Borussia Düsseldorf, Orlen, IKEA, Nintendo i wiele innych.

Nie twierdzę, że każde użycie nazwy automatycznie narusza prawo, ale sprzedaż gry
z takim zestawem danych bez analizy prawnej to niepotrzebne ryzyko. Co ważne,
projekt sam deklaruje fikcyjną bazę jako kierunek.

**Działanie:**

1. fikcyjne kluby, sponsorzy i producenci w wersji domyślnej;
2. żadnego oficjalnego „real-name packa” w repozytorium ani w paczce gry;
3. inwentaryzacja licencji fontów, bibliotek, ikon, muzyki i grafik;
4. plik `THIRD_PARTY_NOTICES` oraz zachowanie wymaganych licencji;
5. przed sprzedażą krótka konsultacja z prawnikiem znającym gry/IP.

### P0.3 — import zapisów i baz danych nie jest bezpieczną granicą

`loadDatabaseFile()` sprawdza jedynie, czy istnieją tablice `teams` i `players`.
`loadGameFromText()` wykonuje `JSON.parse`, migrację i przyjmuje obiekt bez
walidacji schematu, typów, limitów rozmiaru i dozwolonych wartości.

Jednocześnie UI:

- wykonuje co najmniej 49 przypisań do `innerHTML`;
- generuje bardzo dużo HTML przez template strings;
- nie ma wspólnej funkcji `escapeHtml` / sanitizera;
- umieszcza w HTML m.in. `team.name`, `player.name`, nazwę custom DB i inne dane
  pochodzące z importowanych plików.

Przykład: nazwa custom DB jest wstawiana bezpośrednio do `innerHTML` w
`renderMainMenu()`. Nazwy klubów i zawodników trafiają w ten sam sposób na wiele
ekranów. Złośliwy „mod” lub zapis może więc wstrzyknąć HTML/JavaScript. W zwykłej
karcie offline to błąd bezpieczeństwa; w Tauri, gdzie frontend może uzyskać
uprawnienia do plików/systemu, staje się to znacznie poważniejsze.

**Działanie:**

1. formalny, wersjonowany schemat zapisu i custom DB;
2. walidacja rozmiaru, typów, zakresów, enumów i liczby rekordów przed migracją;
3. kodowanie każdego tekstu pochodzącego z danych przed wstawieniem do HTML;
4. usunięcie inline handlerów i przejście na delegację zdarzeń;
5. restrykcyjny CSP i minimalne capabilities Tauri;
6. testy ze złośliwymi nazwami, bardzo dużym plikiem i brakującymi polami.

Oficjalna dokumentacja Tauri wprost zaleca restrykcyjny CSP i ostrzega przed
zdalnymi skryptami oraz niezaufanymi plikami:
[Tauri — Content Security Policy](https://v2.tauri.app/security/csp/).

### P0.4 — zapis gry nie spełnia standardu płatnego produktu

Automatyczny zapis żyje w jednym kluczu `localStorage`. Jest eksport/import JSON,
ale nie ma:

- slotów;
- rotacyjnych autosave’ów;
- zapisu atomowego;
- backupu ostatniego poprawnego stanu;
- komunikatu o uszkodzonym zapisie;
- testowanego downgrade/upgrade policy między wersjami;
- integracji z normalną lokalizacją danych aplikacji i Steam Cloud.

`loadPersistedGame()` po błędzie po prostu zwraca `null`, więc gracz może zobaczyć
„brak zapisu”, bez diagnozy i ścieżki odzysku.

**Działanie:** warstwa repozytorium zapisów niezależna od UI, 3–5 slotów,
autosave rotacyjny, kopia przed migracją, eksport diagnostyczny i jawny błąd
zamiast cichego `catch`.

### P0.5 — aplikacja nie jest jeszcze w pełni offline ani spakowana

Gra ładuje Google Fonts i GSAP z CDN. Brak `src-tauri`, `tauri.conf.json`,
instalatora, zasobów lokalnych i procesu budowania wydania. Brak sieci nie niszczy
rdzenia, ale zmienia wygląd i wyłącza animacje.

Tauri jest dobrym wyborem, ale opis „wrapping + saves, nie rewrite” jest zbyt
optymistyczny. Projekt ma około **185 inline `onclick`**, dynamiczne `innerHTML`,
globalny namespace i niezaufane importy. To koliduje z bezpiecznym CSP i będzie
wymagało pracy frontendowej, choć nadal nie wymaga przepisywania silnika.

Na Windows Tauri 2 opiera renderowanie na WebView2 i wymaga odpowiedniego
toolchainu do budowania:
[Tauri — prerequisites](https://v2.tauri.app/start/prerequisites/).

### P0.6 — brak dowodu, że nieznajomy rozumie grę

Dokumentacja sama mówi: „never tested by a stranger”. To jest obecnie większy
bloker sprzedaży niż brak kolejnej funkcji.

Gracz musi bez autora:

- rozpocząć karierę;
- zrozumieć cztery decyzje presezonu;
- wiedzieć, dlaczego nie może przejść dalej;
- rozegrać pierwszy mecz;
- zrozumieć wpływ stylu, zmęczenia i sztabu;
- zakończyć sezon, zmienić klub lub kontynuować;
- zapisać i odzyskać grę.

Potrzebny jest obserwowany test co najmniej 5–10 nowych osób. Autor nie powinien
im tłumaczyć interfejsu — tylko notować, gdzie pytają, klikają źle i rezygnują.

## 6. Ważny dług techniczny

### Monolit i globalne sprzężenie

Aktualne rozmiary najważniejszych plików:

| Plik | Linie | Funkcje |
|---|---:|---:|
| `src/core/gameplay.js` | ok. **5742** | **319** |
| `src/ui/pages.js` | ok. **1532** | **46** |
| `styles/main.css` | ok. **1183** | — |
| `src/core/state.js` | ok. **364** | 15 |
| `src/ui/shell.js` | ok. **283** | 19 |

`gameplay.js` obejmuje jednocześnie ekonomię, AI, symulację, sezon, kontrakty,
rynek, akademię, turnieje, modalne UI i animowane przebiegi spotkań. Problemem
nie jest estetyka kodu, lecz promień rażenia zmian: AI-koder musi za każdym razem
utrzymać w kontekście setki funkcji i niejawne globalne zależności.

Rekomenduję split przy okazji pracy, nie wielki rewrite:

1. `market` + `contracts`;
2. `saves` + walidacja;
3. `season` + `ai`;
4. `academy` + development;
5. czysta symulacja meczu oddzielona od mutacji;
6. na końcu cienkie adaptery UI.

### Mutacja podczas symulacji

`simTeamMatch` nadal zmienia stan, zamiast zwrócić kompletny wynik do osobnej
funkcji aplikującej. Dokumentacja poprawnie oznacza to jako dług. Utrudnia to
preview, debugowanie, replay i test „symulacja jest czysta”.

### UI oparte na wielkich stringach

Ten styl był szybki na prototyp, ale skaluje się coraz gorzej:

- brak automatycznego escapowania;
- trudne testy interakcji;
- duża liczba globalnych funkcji;
- ryzyko kolizji CSS, czego projekt już doświadczył z `.pos`;
- trudna lokalizacja, bo tekst jest rozrzucony po szablonach i logice.

Nie trzeba przechodzić na React. Można pozostać przy vanilla JS, ale dodać małe
komponenty, bezpieczny helper tekst/HTML oraz delegację zdarzeń.

## 7. Dokumentacja — ocena

Dokumentacja jest ponadprzeciętnie dobra jak na projekt solo/AI. Ma north star,
GDD, handoff, changelog, dokumenty projektowe, roadmapę i audyt. To duża zaleta.

Problemem jest liczba źródeł prawdy i narastający drift:

- `ROADMAP.md` w „Right now” nadal mówi, że właściciel ma wybrać prototyp, mimo
  że `HANDOFF.md` i `CHANGELOG.md` mówią o wyborze i wdrożeniu `proto-final`;
- `HANDOFF.md` raz mówi, że market grid jest wdrożony, a starszy backlog nadal
  opisuje go jako otwarty;
- `HANDOFF.md` ma niezaznaczony „Real main menu”, chociaż kod ma obecnie menu;
- `DESIGN-staff.md` mówi jednocześnie, że osobny sparring hire został odrzucony,
  a później nazywa sparring partners „NEW” i najwyższym priorytetem;
- `GDD-v17.md`, `BALANCING-v17.md` i `ARCHITECTURE-v17.md` są jawnie częściowo
  stare, ale nadal zawierają bardzo konkretne liczby i kolejność prac;
- `ROADMAP.md` jest miejscami bardziej planem funkcji niż prawdziwą checklistą
  release gate.

**Rekomendacja:** nie usuwać historii, ale ograniczyć dokumenty operacyjne do:

1. `VISION.md` — dlaczego;
2. `GDD.md` — co jest grą;
3. `RELEASE.md` — bramki wydania;
4. `BACKLOG.md` — jedyna kolejka pracy;
5. `CHANGELOG.md` — co weszło;
6. `CODEX-REVIEW.md` — niezależny audyt/feedback.

Stare `*-v17.md` można przenieść do `docs/archive/` po skonsolidowaniu aktualnej
wiedzy. AI-koder powinien dostawać krótką kolejność: bieżący handoff → backlog →
testy, zamiast kilku częściowo sprzecznych roadmap.

## 8. Ocena obszarów

Skala nie jest procentem ukończenia; 10 oznacza „na poziomie małego płatnego
wydania w tej niszy”.

| Obszar | Ocena | Komentarz |
|---|---:|---|
| Pomysł i pozycjonowanie | **8/10** | wyraźna nisza i czytelna fantazja |
| Zakres działających systemów | **8/10** | dużo połączonych mechanik |
| Silnik i regresje | **7/10** | 112 testów, ale brak realnego coverage i problem długiej kariery |
| Balans / „feel” | **5/10** | testy statystyczne są dobre, lecz brak szerokiego playtestu |
| Architektura / utrzymywalność | **4/10** | monolit, globals, inline handlers, mutacje |
| UI / spójność wizualna | **5/10** | kierunek jest, pełnego ręcznego QA brak |
| Onboarding i dostępność | **2/10** | brak testu z obcym graczem i pełnego tutorialu |
| Lokalizacja | **1/10** | polskie stringi są w kodzie; brak i18n |
| Zapisy i odporność danych | **2/10** | localStorage + JSON, brak slotów/walidacji/backupów |
| Gotowość prawna/licencyjna | **1/10** | realne marki/kluby, brak inwentaryzacji licencji |
| Packaging / dystrybucja | **1/10** | brak desktop builda i instalatora |
| Ogólna gotowość do płatnego EA | **3/10** | dobra alpha, jeszcze nie produkt sklepowy |

## 9. Zalecana kolejność prac

### Etap A — zabezpieczyć projekt

- checkpoint obecnego diffu i regularne małe commity;
- automatyczny CI: składnia + testy na każdym pushu;
- test budżetu rozmiaru stanu i czasu 10/25/50 sezonów;
- usunięcie przyczyny niekontrolowanego wzrostu puli zawodników;
- spójny numer wersji aplikacji, save schema i changelog wydania.

**Gate A:** po 25 sezonach czas/sezon i rozmiar zapisu nie rosną bez kontroli,
pełne testy są zielone w CI, a każdy build da się odtworzyć z Git.

### Etap B — bezpieczeństwo i prawa

- fikcyjne nazwy domyślnej bazy;
- schema + walidacja zapisów i baz;
- escapowanie danych w UI;
- lokalne fonty/GSAP i dokumentacja licencji;
- plan CSP/capabilities pod Tauri;
- usunięcie cichych błędów ładowania zapisu.

**Gate B:** złośliwy lub uszkodzony plik jest odrzucany z jasnym komunikatem,
a gra działa całkowicie offline.

### Etap C — prawdziwy build dla testerów

- minimalny Tauri 2, Windows first;
- sloty, autosave rotation, kopia przed migracją;
- log błędów + „eksportuj zapis diagnostyczny”;
- instalacja/deinstalacja na czystym Windows;
- test 1366×768, 1920×1080, skalowanie 125/150%, alt-tab i fullscreen.

**Gate C:** tester pobiera instalator, uruchamia bez instrukcji, gra offline,
zamyka aplikację w złym momencie i nie traci kariery.

### Etap D — produkt dla obcej osoby

- i18n, angielski jako pełny język produktu; polski pozostaje dostępny;
- krótki guided first season / kontekstowa pomoc;
- dokończenie season stage rail i season-end flow;
- jasne wyjaśnienie wpływu stylów, zmęczenia, sztabu i sprzętu;
- 5–10 obserwowanych testów pełnego pierwszego sezonu;
- poprawki według drop-offów, nie według liczby życzeń.

**Gate D:** większość nowych testerów kończy sezon bez pomocy autora i potrafi
powiedzieć, jakie decyzje zmieniły wynik.

### Etap E — „żywy świat”, ale z zamkniętym zakresem

Nie budować od razu „tysięcy kombinacji”. Na EA wystarczy dobry, kontrolowany
zestaw:

- wątki inbox z pamięcią i eskalacją;
- ograniczony katalog konkretnych wydarzeń;
- poaching i konflikty kontraktowe;
- raport rundy, który pokazuje konsekwencje decyzji AI;
- testy cooldownów i braku powtórzeń.

**Gate E:** dwie kariery po 5–10 sezonów tworzą różne historie i nie spamują tym
samym komunikatem.

### Etap F — Steam Playtest, dopiero potem płatne EA

Najlepsza ścieżka dla tego projektu:

1. prywatne buildy dla kilku testerów;
2. strona Coming Soon i bezpłatny **Steam Playtest**;
3. poprawki na podstawie zachowania obcych graczy;
4. dopiero wtedy płatny Steam Early Access;
5. itch.io jako kanał dodatkowy, nie główna strategia odkrywalności.

Steam opisuje Playtest jako darmowy, oddzielny appID bez wpływu na recenzje i
wishlisty głównej gry:
[Steamworks — Steam Playtest](https://partner.steamgames.com/doc/features/playtest).

## 10. Steam i sprzedaż — aktualne fakty

- Steam Direct kosztuje obecnie **100 USD za aplikację**; opłata jest odzyskiwana
  po osiągnięciu co najmniej 1000 USD Adjusted Gross Revenue:
  [Steam Direct Fee](https://partner.steamgames.com/doc/gettingstarted/appfee).
- Dla nowego partnera istnieje minimum **30 dni** od opłaty do wydania, a publiczna
  strona Coming Soon musi działać co najmniej **2 tygodnie**:
  [Steamworks Partner Program](https://partner.steamgames.com/steamdirect/),
  [Release Options](https://partner.steamgames.com/doc/store/types).
- Review strony/builda zwykle trwa **3–5 dni roboczych**, a Valve zaleca wysłanie
  co najmniej 7 dni roboczych wcześniej:
  [Release Process](https://partner.steamgames.com/doc/store/releasing).
- Early Access ma być grywalnym produktem wartym swojej bieżącej ceny, nie
  obietnicą finansującą przyszłą grę. Steam odradza uruchamianie EA, gdy nie
  wiadomo jeszcze, co jest właściwą zabawą:
  [Steam Early Access](https://partner.steamgames.com/doc/store/earlyaccess).
- itch.io pozwala ustawić cenę minimalną / pay-what-you-want i własny udział
  platformy, więc może być dobrym dodatkowym kanałem do buildów:
  [itch.io pricing](https://itch.io/docs/creators/pricing),
  [itch.io payments](https://itch.io/docs/creators/payments).

Moja sugestia: konto Steamworks i appID można przygotować wcześnie, gdy finalna
nazwa gry, podmiot sprzedający i dane podatkowe są ustalone. Nie należy jednak
spieszyć się z płatnym EA tylko po to, by „już coś sprzedawać”. Pierwsze recenzje
są dużo droższe do naprawienia niż dodatkowy miesiąc dobrego playtestu.

## 11. Co świadomie wyciąć z pierwszego Early Access

Żeby projekt został wydany, EA nie powinno wymagać spełnienia całej wizji.

Można przesunąć na aktualizacje EA:

- rozbudowany edytor baz;
- wiele scenariuszy/challenge modes;
- głębokie głosowania ligowe;
- pełną symulację federacji i reprezentacji;
- ogromny katalog life events;
- achievements inne niż kilka podstawowych;
- wersje inne niż Windows.

Nie można przesunąć:

- bezpiecznych i odzyskiwalnych zapisów;
- działania offline;
- fikcyjnych danych i sprawdzonych licencji;
- angielskiej wersji, jeśli celem jest rynek globalny;
- tutorialu/onboardingu;
- stabilności długiej kariery;
- instalatora i QA na czystej maszynie;
- jasnej informacji, co jest, a czego nie ma w EA.

## 12. Zasady dla kolejnego AI-kodera

Każde zadanie powinno mieć:

1. jeden mierzalny rezultat;
2. listę plików w zakresie;
3. test najpierw dla buga lub nowej reguły;
4. zakaz przypadkowej zmiany balansu;
5. `npm run check` i właściwe testy;
6. ręczną checklistę UI, jeżeli zmienia się ekran;
7. mały commit po akceptacji;
8. aktualizację jednego źródła prawdy, nie pięciu dokumentów naraz.

Przykład dobrego zlecenia:

> Ogranicz wzrost puli zawodników. Najpierw dodaj test, który symuluje 25 sezonów
> i wymaga mniej niż ustalony limit aktywnych graczy oraz akceptowalnego czasu
> sezonu. Zdiagnozuj źródło wzrostu, przedstaw mechanizm usuwania/rotacji wolnych
> agentów bez zmiany jakości lig, poczekaj na akceptację reguły balansu, potem
> wdrożenie. Nie zmieniaj UI. Uruchom syntax check, testy i stress.

## 13. Pytania do właściciela

Najważniejsze pytania, które zmienią plan:

1. Czy ktokolwiek poza Tobą uruchomił grę od zera bez Twoich instrukcji i
   zakończył pełny sezon? Gdzie utknął lub się znudził?
2. Jaka jest najdłuższa kariera, którą sam naprawdę rozegrałeś przez UI, a nie
   przez auto-play/test? Co spowodowało, że przestałeś?
3. Czy pierwszy płatny build ma być globalny po angielsku, czy najpierw mały,
   polski Early Access?
4. Czy zgadzasz się, że edytor baz i challenges mogą wejść już podczas EA, zamiast
   blokować pierwszy płatny build?
5. Czy wszystkie grafiki, fonty, fragmenty kodu, dźwięki i dane pochodzą z
   miejsc, których warunki pozwalają na komercyjną sprzedaż?
6. Czy chcesz całkowicie fikcyjne nazwy w podstawowej grze i modding wyłącznie po
   stronie społeczności?
7. Jaka cena i minimalna długość satysfakcjonującej kariery są Twoim celem?
8. Ile realnie czasu/budżetu chcesz przeznaczyć na testy, trailer, kapsuły Steam,
   tłumaczenie i ewentualną konsultację prawną?

## 14. Odpowiedzi i decyzje właściciela po audycie

### Zewnętrzne playtesty

Jedna lub dwie osoby poza właścicielem ukończyły więcej niż jeden sezon, ale na
znacznie wcześniejszej, nudniejszej i bardziej przewidywalnej wersji. Jest to
dobry sygnał dla samego core loopa, ale **nie zastępuje testu aktualnego buildu**,
ponieważ UI i duża część systemów mocno się od tego czasu zmieniły.

Nowy cel: minimum 5 osób zaczyna aktualną wersję od zera; przynajmniej 3 kończą
pierwszy sezon bez pomocy autora, a 1–2 kontynuują kilka sezonów.

### Najdłuższa kariera i stary błąd juniorów

Właściciel rozegrał maksymalnie **8 sezonów**. Kariera została przerwana przez
błędy: po kliknięciu nowego juniora akademii otwierał się profil innego zawodnika.
Było to około 40% czasu rozwoju projektu temu.

Ten objaw bardzo dokładnie pasuje do znanego błędu `_pid`: po wznowieniu zapisu
globalny licznik identyfikatorów potrafił cofnąć się i przydzielić nowej osobie ID
już istniejącego zawodnika. Wyszukiwanie `find(p => p.id === pid)` zwracało wtedy
pierwszy pasujący obiekt, czyli zły profil. Obecny kod:

- zapisuje `_pid` razem z karierą;
- po wczytaniu ustawia licznik powyżej maksymalnego istniejącego ID;
- migracją naprawia powtórzone ID w starych zapisach;
- ma testy regresji dla persist/resume i naprawy duplikatów.

**Wniosek:** błąd prawdopodobnie został naprawiony, ale nie jest jeszcze
potwierdzony doświadczeniem gracza. Kryterium zamknięcia:

1. jeżeli stary save nadal istnieje — zachować kopię i załadować go w obecnym
   buildzie;
2. sprawdzić, czy migracja wykrywa/naprawia duplikaty;
3. w świeżej karierze dojść do minimum sezonu 10;
4. otworzyć profile co najmniej 30 nowo wygenerowanych juniorów i porównać
   imię/ID z kartą, raportem skauta i listą akademii;
5. dodać test przepływu UI, nie tylko test modelu ID.

#### Aktualizacja po analizie zachowanych zapisów

Właściciel dostarczył siedem zapisów z sezonów 4, 6, 7, 8 i 11. Analiza
potwierdziła root cause i pokazała, że obecna migracja naprawia go tylko częściowo.

| Zapis | Gracze | Wolni agenci | Powtórzone ID w `players` | `_pid` | Najwyższe ID |
|---|---:|---:|---:|---:|---:|
| S4 K4 | 573 | 326 | 0 | 846 | 843 |
| S6 K22 | 768 | 511 | 87 | 570 | 843 |
| S7 K0 | 865 | 611 | 162 | 691 | 843 |
| S8 K0 | 969 | 710 | 242 | 439 | 843 |
| S8 K21 | 971 | 710 | 244 | 439 | 843 |
| S11 K4 | 1256 | 997 | 307 | 291 | 843 |

S4 jest jeszcze spójny: `_pid` znajduje się powyżej wszystkich istniejących ID.
Od S6 licznik jest cofnięty i nowe encje seryjnie dostają używane już numery.

Trzy bliskie sobie zapisy S8 odtwarzają błąd krok po kroku:

1. `s8-k0-pre`: kandydat **Łukasz Niedzielski** ma ID 319, które należy już do
   **Kacpra Adamskiego**; **Radomir Wasilewski** ma ID 320 należące do
   **Rocha Pawlaka**.
2. `s8-k0-pre(1)`: po przyjęciu Łukasza w `players` istnieją dwie osoby z ID 319.
3. `s8-k21-pre`: po przyjęciu obu juniorów istnieją duplikaty 319 i 320.
4. `openPlayerModal(pid)` używa `players.find(x => x.id === pid)`, więc zwraca
   pierwszą osobę o danym ID — dokładnie dlatego kliknięcie juniora otwierało
   innego zawodnika.

Obecny `migrateLoadedGame()` usuwa wszystkie duplikaty znajdujące się już
**wewnątrz** `players` i podnosi `_pid` ponad aktualne maksimum. Nie używa jednak
jednego wspólnego zbioru ID dla `players`, `academyProspects`, `staff`,
`staffPool`, `scoutPool` itd. W efekcie:

- zapis S8 K21 po migracji nie ma duplikatów wewnątrz `players`;
- zapis S8 K0 nadal ma kolizje kandydatów 319/320 z istniejącymi graczami;
- przyjęcie takiego kandydata aktualnym kodem ponownie tworzy duplikat i
  `find()` nadal otwiera niewłaściwy profil;
- analogiczny przypadek istnieje w S11: kandydat Borys Dudek ma ID należące do
  Bruno Wiśniewskiego.

**Skorygowany status:** pierwotny generator duplikatów został naprawiony dla
nowych karier, ale migracja starych karier jest niepełna. Zachowane pliki są
gotowymi fixture’ami regresji. Następne zadanie powinno zacząć się od minimalnego
testu odtwarzającego kolizję `academyProspects ↔ players`, a dopiero potem
ujednolicić naprawę ID i sprawdzić wszystkie referencje do zmienianych encji.

Pliki mają od około 4,5 MB (S4) do 7,7 MB (S8 K21), co dodatkowo potwierdza
wcześniejszy wniosek o zbyt szybkim wzroście aktywnej puli zawodników.

### Język

Decyzja: **angielski wystarczy na pierwsze wydanie**. Kolejne języki są opcjonalne.

Rekomendacja techniczna: nie usuwać polskiego tekstu, tylko podczas wdrażania i18n
przenieść go do `pl`, zbudować kompletne `en` i ustawić angielski jako domyślny.
Koszt zachowania polskiego po wydzieleniu stringów będzie mały, a właściciel nadal
będzie mógł naturalnie testować grę po polsku.

### Fikcyjna baza i mody

Decyzja: domyślna gra ma zawierać **wyłącznie fikcyjne kluby, sponsorów, marki i
zawodników**, najwyżej wiarygodnie inspirowane strukturą prawdziwego świata.
Społeczność ma móc tworzyć i udostępniać własne bazy.

To ustala ważną kolejność:

1. najpierw bezpieczny, wersjonowany **format paczki danych**;
2. potem import lokalny i walidacja;
3. później prosty edytor, jeżeli rzeczywiście ułatwi tworzenie danych;
4. na końcu adapter Steam Workshop do pobierania/publikowania tych samych paczek.

Workshop nie powinien definiować formatu moda. Ma być tylko kanałem dystrybucji
formatu, który działa również poza Steam.

Minimalna paczka moda powinna zawierać:

- `manifest.json`: `formatVersion`, stabilne ID paczki, nazwa, autor, zgodność z
  wersją gry i lista typów zawartości;
- bezpieczne JSON-y z klubami/zawodnikami/sponsorami;
- opcjonalne obrazy PNG/WebP z limitami rozmiaru i wymiarów;
- stabilne, namespacowane identyfikatory zamiast powiązań po nazwie;
- raport walidacji i czytelny komunikat o konflikcie/niezgodnej wersji.

Na początku nie dopuszczać w modach JavaScriptu, HTML ani niesprawdzonych SVG.
Paczki danych mają być danymi, nie kodem.

Oficjalny Steam Workshop wymaga integracji `ISteamUGC`; Steam pobiera
subskrybowane elementy do osobnych katalogów, a gra odczytuje ich lokalizację
przez `GetItemInstallInfo`. Workshop wymaga również konfiguracji Cloud quota,
widoczności, upload flow i obsługi umowy prawnej autora:
[Steam Workshop Implementation Guide](https://partner.steamgames.com/doc/features/workshop/implementation).

**Wniosek zakresowy:** schema/importer są fundamentem i powinny wejść przed EA.
Graficzny edytor i pełny upload do Workshop mogą wejść w trakcie EA, jeśli ich
wdrożenie zacznie opóźniać stabilny build.

### Edytor i challenges

Decyzja: nie są istotnym warunkiem premiery. Mogą wejść wcześnie tylko wtedy, gdy
upraszczają rozwój lub budują potrzebny fundament.

Moja decyzja produktowa na tej podstawie:

- schema, walidator i import paczek: **przed EA**;
- edytor: **podczas EA**;
- integracja Workshop: najwcześniej pod koniec przygotowań do EA lub jako pierwsza
  większa aktualizacja;
- challenges: **podczas EA**, po ustabilizowaniu normalnej kariery.

### Cena i charakter projektu

Cel właściciela: około **9,99 USD**, projekt hobbystyczny, finansowy sukces oznacza
przede wszystkim pokrycie kosztów subskrypcji AI. Potencjalne DLC około 4,99 USD
jest pomysłem na później.

Cena 9,99 USD jest spójna z małym, niszowym managerem w Early Access, o ile
bieżący build daje już satysfakcjonującą wielosezonową karierę. Nie należy jednak
projektować zakresu pod maksymalizację DLC przed sprawdzeniem, czy baza ma
publiczność. Najpierw dobra gra podstawowa; DLC dopiero jako uczciwy, opcjonalny
pakiet nowej zawartości, nie wycięty system bazowy.

Steam pozwala ustawić ceny w 37 walutach i oferuje narzędzia przeliczeń regionalnych;
ostateczne ceny pozostają decyzją wydawcy:
[Steam pricing](https://partner.steamgames.com/doc/store/pricing).

### Zaktualizowana strategia projektu

Ponieważ celem nie jest budowa dużej firmy ani odzyskanie wielkiego budżetu,
strategia powinna być oszczędna:

- nie maksymalizować liczby funkcji;
- nie blokować EA edytorem, challenges ani ogromnym life-events systemem;
- wydać mniejszą, stabilną grę za około 9,99 USD;
- użyć Playtestu do zdobycia dowodów, a nie przeczucia;
- utrzymywać koszty narzędzi i produkcji pod kontrolą;
- traktować Workshop jako mnożnik zawartości po ustabilizowaniu formatu danych.

## 15. Moja najważniejsza rada

**Przez najbliższy etap nie dodawaj kolejnych szerokich systemów.** Gra ma już
wystarczająco dużo mechanik, aby zostać dobrą. Teraz trzeba udowodnić trzy rzeczy:

1. obcy człowiek rozumie ją bez autora;
2. kariera działa szybko i bezpiecznie przez dziesiątki sezonów;
3. build można legalnie i niezawodnie sprzedać.

Jeżeli te trzy rzeczy zostaną dowiezione, nisza i istniejący rdzeń dają temu
projektowi realną szansę. Jeżeli zamiast tego dojdzie kolejne 20 systemów w
`gameplay.js`, ryzyko utknięcia przed wydaniem będzie rosło szybciej niż wartość gry.

---

## Dziennik kolejnych uwag i decyzji

### 2026-07-28 — audyt startowy

- Utworzono pierwszy niezależny audyt projektu.
- Kod gry nie został zmieniony.
- Potwierdzono 112/112 testów i poprawną składnię.
- Potwierdzono poprawny 10-sezonowy stress oraz 40-sezonowy probe akademii.
- Zidentyfikowano priorytety: Git/checkpoint, wzrost puli graczy, fikcyjne dane,
  walidacja/sanitacja importów, zapis desktopowy, Tauri/offline, i18n i testy
  zewnętrznych graczy.

### 2026-07-28 — odpowiedzi właściciela

- Potwierdzono wcześniejsze zewnętrzne playtesty oraz 8-sezonową karierę autora.
- Stary błąd akademii powiązano z naprawionym problemem duplikacji ID; wymagany
  nowy test akceptacyjny na aktualnym buildzie.
- Pierwsze wydanie: angielski domyślny, polski warto zachować przez i18n.
- Domyślna baza: w pełni fikcyjna.
- Modding: bezpieczny format danych przed EA; edytor/Workshop mogą wejść później.
- Challenges nie blokują EA.
- Cena docelowa: około 9,99 USD; DLC dopiero po potwierdzeniu popytu.

### 2026-07-28 — analiza historycznych zapisów

- Siedem plików JSON przeanalizowano bez ich modyfikowania.
- Potwierdzono cofnięcie `_pid` i setki powtórzonych ID od sezonu 6.
- Sekwencja trzech zapisów S8 odtwarza błędny profil juniora krok po kroku.
- Potwierdzono, że aktualna migracja naprawia duplikaty w `players`, ale nie
  kolizje pomiędzy `academyProspects` i `players`.
- Zachowane zapisy należy wykorzystać jako fixture’y przy właściwej poprawce.
