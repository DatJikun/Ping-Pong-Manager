# Owner playtest feedback — 2026-07-31

Status: surowa notatka produktowa do dalszej rozmowy. To nie jest jeszcze specyfikacja wdrożenia ani lista zatwierdzonych rozwiązań.

## Główny wniosek

Gra ma wiele systemów i liczb, ale za słabo przekłada je na zrozumiałe doświadczenie menedżera. Zawodnik, klub, styl gry i decyzja nie mają jeszcze wystarczającego „ciężaru”. Kliknięcia są szybkie, liczby przelatują, a graczowi trudno poczuć:

- dlaczego dany zawodnik jest dobry;
- jak konkretnie wpływa na wynik;
- w czym klub jest mocny i słaby;
- jak wypada na tle ligi;
- dlaczego podjęta decyzja była ważna;
- które systemy współpracują ze sobą.

Nie jest to wyłącznie problem animacji ani brak jednej porównywarki. To problem języka ocen, informacji, rytmu i informacji zwrotnej całej gry.

## 1. Rynek transferowy, gwiazdki i potencjał

- Przy zawodnikach na rynku aktualne, wypełnione złote gwiazdki powinny pokazywać bieżący OVR.
- „Fantomowe” gwiazdki, widoczne jako sama złota obwódka, powinny od razu pokazywać peak/potencjalny OVR.
- Intencja przykładu: niewiele pełnych gwiazdek i prawie pełny zakres obwódek oznacza słabego obecnie zawodnika z bardzo wysokim sufitem.
- Do rozstrzygnięcia pozostaje dokładna składnia wizualna: pięć wspólnych pozycji czy osobny zakres potencjału. Najczytelniejszym kandydatem jest jeden pasek pięciu miejsc: pełne = obecna jakość, złote kontury pozostałych miejsc = osiągalny sufit.
- Skala gwiazdek jest obecnie niewiarygodna. Przykład: OVR 46 potrafi dawać 0 gwiazdek.
- Intuicja właściciela: przy pięciu gwiazdkach około 20 punktów OVR powinno odpowiadać jednej gwiazdce. Dokładne progi wymagają sprawdzenia na realnej populacji, aby nie spłaszczyć całego rynku.

### Stan potwierdzony w kodzie

Rynek obecnie mapuje OVR 45–95 na 0–5 gwiazdek. Dlatego OVR 46 daje około 0,1 gwiazdki. Ten sam przelicznik jest używany dla zawodników i całego sztabu. Potencjał nie jest pokazany w gwiazdkach na rynku.

## 2. OVR zawodników i sztabu

- Rozkład OVR zawodników czasami wygląda na popsuty lub przesadnie nierówny. Właściciel nie przesądza jeszcze, czy część tych dysproporcji nie jest pożądana.
- Fizjoterapeuci są wyraźnym problemem: zaobserwowany zakres około 10–58, z maksimum 58. W zestawieniu z innymi profesjami wyglądają na bezwartościowych.
- Psychologowie po ponownym sprawdzeniu wyglądają w większości rozsądnie.
- Skauci po ponownym sprawdzeniu wyglądają w większości rozsądnie.
- Trenerzy na rynku wyglądają dobrze, ale wiele klubów pierwszej dywizji ma trenerów około OVR 20–31. To osłabia wiarygodność świata.
- Należy sprawdzić, czy obsada klubów pochodzi z bazy, czy jest generowana. Kluby — zwłaszcza mocne — powinny rozpoczynać z wiarygodnym sztabem zgodnym z ich poziomem i tożsamością.
- Każda profesja może mieć własne atrybuty i charakterystykę, ale końcowy OVR musi znaczyć dla gracza porównywalny poziom kompetencji.

### Stan potwierdzony w kodzie

Fizjoterapeuci są generowani na osobnej, celowo niższej skali atrybutów (w przybliżeniu 6–60), po czym ich średnia jest pokazywana jako OVR na tej samej skali i tymi samymi gwiazdkami co pozostały sztab. To nie jest wyłącznie pech losowania. Problem dotyczy wspólnego języka oceny i balansu profesji.

## 3. Sztuczna liczebność rynków

### Wolni zawodnicy

- Rynek nie powinien mieć zawsze dokładnie 120 wolnych zawodników.
- Liczba powinna wynikać z życia świata: emerytur, naborów, zwolnień, wygaśnięć umów i transferów.
- Pożądana jest odczuwalna zmienność sezonowa, np. o 20–40 osób: czasem rok obfity, czasem rynek ubogi.
- Techniczny bezpiecznik może istnieć, ale nie może być widoczny jako stała liczba.

### Wolny sztab

- Liczba około 99–101 osób w każdej grupie sztabu również wygląda sztucznie.
- PR-owców jest zwykle około 93; to ten sam rodzaj problemu.
- Rynek pracy powinien mieć odpływ, dopływ, niedobory i lata mocniejszych roczników, zamiast uzupełniać każdą rolę do jawnej normy.

### Stan potwierdzony w kodzie

- Wolni zawodnicy są przycinani do pięciu osób na każdy aktywny klub: w świecie 24 klubów daje to dokładnie 120.
- Rynek sztabu ma twardą dolną granicę 80 kandydatów na każdą z głównych profesji. Po odejściach jest co sezon uzupełniany do tej granicy.
- Są to użyteczne zabezpieczenia przed puchnięciem zapisów i pustym rynkiem, ale obecna implementacja zamienia zabezpieczenie w widoczny wzór.

## 4. Ekran nowej gry

- Główna zawartość jest za mała względem okna.
- Zostaje za dużo pustej przestrzeni.
- Ekran powinien wyglądać jak pełnoprawny początek produktu i kariery, nie mały panel pozostawiony na dużym tle.
- Potrzebuje lepszej skali, hierarchii i mocniejszego wejścia w świat gry, nie tylko powiększenia każdego elementu.

## 5. Przygotowanie sezonu

- Obecny proces nie płynie naturalnie od jednej decyzji do następnej.
- Cena biletu wygląda na już ustawioną, przez co krok sprawia wrażenie pozornego.
- Sponsor, partner techniczny, cena biletu i rozpoczęcie sezonu są połączone niespójnymi przyciskami.
- Przycisk „Start Season” nie powinien stale wisieć jako wygaszony. Powinien pojawić się dopiero, gdy gracz faktycznie dotrze do końca przygotowań i spełni warunki.
- Docelowo ma to być prowadzona sekwencja decyzji: jedna rzecz, jasny skutek, przejście dalej, podsumowanie, rozpoczęcie sezonu.

### Stan potwierdzony w kodzie

W kodzie istnieje już czterostopniowy ekran, ale wszystkie kroki pozostają swobodnie klikalne, cena biletu jest od początku traktowana jako ukończona, a wygaszony „Start Season” jest stale widoczny. Fundament flow istnieje; jego zasady i prezentacja nadal nie domykają zamierzonego doświadczenia.

## 6. Kształt przycisków i spójność wizualna

- Usunąć przyciski w kształcie równoległoboków.
- Przyciski powinny być prostokątne i zgodne z resztą interfejsu.
- Uwaga została powtórzona kilka razy i jest jednoznaczną decyzją estetyczną, nie luźną sugestią.
- Należy usunąć ten motyw systemowo, a nie poprawiać pojedyncze ekrany.

### Stan potwierdzony w kodzie

Wspólny styl głównych przycisków nadaje im skośny kształt przez `clip-path`, więc jedna zmiana komponentu może usunąć większość problemu. Inne dekoracyjne równoległoboki trzeba ocenić osobno.

## 7. Skład, synergia i tożsamość zespołu

Ekran składu powinien w prosty sposób odpowiadać na pytania:

- Jak działa synergia tej drużyny?
- Czy nasza synergia jest dobra względem średniej ligi?
- Jakie style gry dominują w lidze?
- Na jakie style jesteśmy dobrze przygotowani, a na jakie źle?
- Gdzie mamy przewagę jakości, a gdzie wyraźną lukę?
- Który zawodnik i dlaczego zmienia profil zespołu?

Nie chodzi o dodanie wielkiej tabeli. Potrzebne jest krótkie „rozpoznanie zespołu”: kilka ważnych przewag, słabości i porównań, które są bezpośrednio związane z decyzją o składzie.

## 8. Rezerwy jako sparingpartnerzy

- Rezerwowi powinni delikatnie poprawiać rozwój i przygotowanie kolegów.
- Powinni pomagać w przygotowaniu do różnych stylów rywali.
- Ich wartość powinna zależeć od liczby, jakości, stylów i ewentualnie cech mentorskich.
- Efekt ma być subtelny: ważny strategicznie, ale nie zamieniający szerokiej ławki w obowiązkowy exploit.
- Gracz powinien widzieć, co konkretnie daje mu ławka.

### Stan potwierdzony w kodzie

System sparingu już istnieje: głębokość i jakość rezerw/akademii zwiększa rozwój całej drużyny, a mentorzy dodają bonus. To przede wszystkim problem niewidocznej mechaniki i braku informacji zwrotnej. Przygotowanie do konkretnych stylów nie jest jeszcze czytelnie przedstawione i wymaga osobnej decyzji projektowej.

## 9. Akademia, tłumaczenie i powiadomienia

- Nie wszystko jest przetłumaczone na angielski. Potwierdzony przykład: „Brak akademii”.
- Potrzebny jest pełny przegląd wycieków języka w rzeczywistym interfejsie, a nie pojedyncza podmiana tekstu.
- Obecne podzakładki akademii („Juniors”, „Intake”, „Scouts Reports”; w wypowiedzi pojawia się też informacja o czterech zakładkach) wymagają oceny pod kątem naturalnego flow.
- Nowy junior lub raport powinien jednocześnie:
  - trafić do inboxa;
  - pokazać czerwony licznik na głównej pozycji „Academy”;
  - pokazać licznik na dokładnej podzakładce, gdzie czeka nowa treść.
- Powiadomienie powinno zniknąć w logicznym momencie po obejrzeniu treści.
- To nie jest tylko kwestia czerwonego koloru. Potrzebny jest spójny stan „nowe / przeczytane / obsłużone”.

## 10. Nominacja meczowa i rezerwy

- Właściciel proponuje obowiązek zabrania dwóch rezerw, ponieważ gra pozwala obecnie rozpocząć mecz bez nich.
- Taki brak może prowadzić do niejasnego lub błędnego zachowania przy nietypowym przebiegu spotkania.
- Przed zmianą trzeba sprawdzić protokoły wszystkich lig/krajów. Nie każdy format musi wymagać tej samej ławki.
- Docelowo ekran nominacji ma jasno powiedzieć: ilu graczy podstawowych i ilu rezerwowych wymaga dany format oraz do czego rezerwy mogą być potrzebne.

### Stan potwierdzony w kodzie

Obecna bramka wymaga minimum trzech zdrowych seniorów. Nie należy globalnie narzucać dwóch rezerw bez sprawdzenia reguł poszczególnych formatów.

## 11. Prezentacja meczu

- Usunąć małe statystyki pod głównym obszarem meczu i zawodnikami. Są wizualnym szumem i nie pasują do reszty.
- Jednocześnie gra musi lepiej pokazywać, dlaczego ktoś wygrywa: znaczenie stylu, cech, formy, kondycji i przewagi konkretnego zawodnika.
- Rozwiązaniem nie powinno być pozostawienie wszystkich mikrodanych na stałe. Lepsze będą nieliczne, kontekstowe wyjaśnienia w odpowiednim momencie.
- Mecze zazwyczaj przebiegają zbyt szybko, by poczuć dramaturgię i wpływ zawodników.

## 12. Auto-season

Przed uruchomieniem auto-sezonu powinien pojawić się ekran konfiguracji:

- wybór podstawowych zawodników i rezerw;
- reguły rotacji lub skład na serię spotkań;
- wybór warunków zatrzymania;
- możliwość ignorowania próśb zawodników o grę;
- możliwość zatrzymania przy kontuzji, ważnym meczu, kryzysie składu lub innej wybranej sytuacji.

Dodatkowe oczekiwania:

- auto-sezon nie powinien zatrzymywać się przy każdej wiadomości decyzyjnej;
- prośba zawodnika o grę już około drugiego meczu sezonu wygląda absurdalnie i wymaga ograniczenia częstotliwości/cooldownu;
- jeden automatyczny mecz powinien trwać około dwóch sekund i pokazać wynik, zamiast znikać natychmiast;
- gracz ma rozumieć, dlaczego automat się zatrzymał.

### Stan potwierdzony w kodzie

Auto-sezon obecnie usuwa opóźnienia animacji i zatrzymuje się przy dowolnej nieobsłużonej decyzji z inboxa. To bezpośrednio odpowiada opisanemu problemowi.

## 13. Infrastruktura

- Ulepszenia są zbyt tanie.
- Ścieżki rozwoju kończą się zbyt szybko.
- Potrzebny jest dłuższy łuk kariery i ważniejsze wybory, a nie tylko wyższe ceny.
- Poziomy powinny zmieniać sposób prowadzenia klubu, tworzyć koszty stałe lub kompromisy i dawać powód, by nie kupować wszystkiego automatycznie.
- Należy sprawdzić tempo w kilku typach kariery, nie balansować na podstawie jednego sezonu.

## 14. Partner techniczny

- Obecny system zdecydowanie nie podoba się właścicielowi.
- Odczyt mechaniki: im lepszy klub, tym lepszy dostępny partner i większy bonus. Jest to logiczne, ale mało interesujące.
- Nowy system powinien dawać wybór tożsamości i kompromisu, nie być kolejną drabiną prestiżu.
- Kierunki do późniejszego omówienia:
  1. partnerzy wyspecjalizowani w różnych stylach, z obowiązkami i wadami;
  2. wspólny program testów/rozwoju sprzętu w trakcie sezonu;
  3. dopasowanie marki do profilu zespołu i zawodników zamiast prostego „wyższy tier = lepiej”.
- Nie zatwierdzono jeszcze żadnego z tych wariantów.

## 15. Sponsorzy

- Nazwy są zbyt podobne i generator jest widoczny: „Asteron Finanse”, „Asteron Technologie”, „Asteron Żywność”.
- Kategorie sponsorów pojawiają się po polsku mimo angielskiej wersji gry.
- Potrzebne są marki o różnych konstrukcjach nazw i charakterach, nie tylko większa liczba pierwszych członów.
- Sponsor powinien sprawiać wrażenie fikcyjnej firmy z branżą, skalą i osobowością, a nie kombinacji dwóch list.

### Stan potwierdzony w kodzie

Nazwy są tworzone jako pełny iloczyn listy rdzeni i listy sektorów. Dla Polski sektory są literalnie zapisane po polsku, niezależnie od języka interfejsu. To dokładnie tworzy zauważony wzór.

## 16. Pomoc i cechy zawodników

- Sekcja Help jest zbyt uboga.
- Za mało cech zawodnika jest opisanych i wyjaśnionych.
- Pomoc powinna być przede wszystkim kontekstowa: z ekranu zawodnika, składu i meczu gracz powinien móc szybko zrozumieć znaczenie danej rzeczy.
- Nie należy rozwiązywać problemu wyłącznie długą encyklopedią.

## 17. Porównywarka

- Brak wygodnego porównania utrudnia ocenę zawodników i klubów.
- Potrzebne są porównania aktywnych zawodników i klubów w bieżącym sezonie oraz ich statystyk kariery/lifetime.
- Porównywarka nie powinna być tylko osobną stroną statystyk. Jej najważniejsze wnioski powinny zasilać ekran składu, profil klubu i przygotowanie do meczu.

## 18. Ciężar decyzji i „game feel”

- Zawodnicy i kluby są obecnie odbierani jako szybko zmieniające się liczby, nie podmioty o znaczeniu.
- Kliknięcia i przejścia są zbyt natychmiastowe, płaskie i „fałszywe”.
- Potrzebna jest bardzo delikatna inercja: krótka odpowiedź interfejsu, jasne potwierdzenie skutku, zmiana stanu, czasem moment podsumowania.
- Nie chodzi o spowolnienie każdej czynności ani dodanie ciężkich animacji.
- Gra ma lepiej pokazywać związek: decyzja → przyczyna → skutek.
- Styl, cecha, statystyka i synergia powinny być czytelne w wyniku meczu, ale bez bombardowania gracza detalami.
- Jest to nadrzędny filar produktowy obejmujący wiele ekranów, nie pojedyncze zadanie „dodać animacje”.

## 19. Dodatkowe ryzyko wydania zauważone podczas zapisu notatki

Świeża instalacja zależności raportuje 17 podatności o wysokiej wadze oraz kilka przestarzałych zależności pośrednich. Przed wydaniem należy ustalić, które dotyczą wyłącznie narzędzi budowania, a które trafiają do aplikacji. Nie należy stosować automatycznego wymuszonego uaktualnienia bez testów.

## Klasyfikacja do dalszej rozmowy

### Mechaniki istniejące, ale niewidoczne lub źle wyjaśnione

- sparingowy wpływ rezerw;
- część zależności stylów i cech;
- czterostopniowe przygotowanie sezonu;
- potencjał zawodników;
- wpływ sztabu i infrastruktury.

### Problemy zaufania do liczb i świata

- nielogiczna skala gwiazdek;
- wspólny OVR dla nieporównywalnie wygenerowanych profesji;
- niskiej klasy trenerzy w mocnych klubach;
- dokładnie 120 wolnych zawodników;
- niemal stałe rozmiary rynków sztabu;
- szablonowe nazwy sponsorów.

### Problemy flow i informacji

- przygotowanie sezonu;
- konfiguracja auto-sezonu i jego zatrzymania;
- akademia i wielopoziomowe powiadomienia;
- nominacja zgodna z formatem meczu;
- brak kontekstowego porównania drużyny z ligą.

### Problemy prezentacji i odczucia

- mały ekran nowej gry;
- skośne przyciski;
- szum mikrodanych podczas meczu;
- zbyt szybki rytm meczu i automatyzacji;
- mało odczuwalna waga zawodników, klubów i decyzji.

### Systemy wymagające głębszego przeprojektowania

- partnerzy techniczni;
- długoterminowy rozwój infrastruktury;
- organiczny rynek zawodników i sztabu;
- czytelny język jakości, potencjału i tożsamości zespołu.

## Decyzje jeszcze niepodjęte

- Dokładny zapis pięciu gwiazdek obecnego OVR i potencjału.
- Czy potencjał na rynku jest wiedzą dokładną, czy powinien zależeć od jakości skautingu.
- Docelowe rozkłady OVR każdej profesji i poziomy sztabu poszczególnych klubów.
- Reguły naturalnej liczebności rynków i ich bezpieczne minima/maksima.
- Format wymaganego składu i rezerw dla każdej ligi.
- Zakres wpływu rezerw na przygotowanie do stylów.
- Model nowego partnerstwa technicznego.
- Warunki zatrzymania auto-sezonu i domyślna konfiguracja.
- Docelowy rytm rozwoju infrastruktury.

