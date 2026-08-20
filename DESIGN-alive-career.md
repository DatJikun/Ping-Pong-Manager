# Żywa kariera — ustalenia z właścicielem (2026-08-20)

> **Status: w grze** — skrzynka, budynki, akademia peakChance, katalog życia,
> **rodziny okładzin (zakres M)** i **pełna mgła skauta**. Partner z klauzulami
> (zakres L) oraz ręczne deski/gąbki zostają na później.

---

## Zasada pracy
Rozmowa → akceptacja → dopiero wtedy kod.

---

## 1. Skrzynka (wdrożone)

**Dużo** znaczy: dużo *rodzajów* listów i historii w karierze, nie 4 maile co kolejkę.

- Na kolejkę: **0–3 sprawy**. **Cicha kolejka jest OK**. Nie wymyślamy wypełniaczy.
- Tylko **decyzja** blokuje „graj kolejkę”.
- Skutek widać **przed** kliknięciem (TAK / NIE na karcie).
- Rezerwa prosi o stół według **gwarancji roli w kontrakcie**, z chłodzeniem ~6 kolejek.

| Kontrakt | Kiedy pisze „daj mi stół” |
|---|---|
| **Projekt** | Prawie nigdy. Jedynie przy **bardzo wysokiej formie** (`seasonFormImpact` ≥ 8, ~7%). |
| **Rotacja** | Od czasu do czasu (`≥5` ~16%, `≥3` ~6%), cooldown 6 kolejek. |
| **Pierwszy skład** | Nie prosi o szansę. Złamana gwarancja — osobny wątek w skrzynce. |

---

## 2. Sprzęt — rodziny okładzin (wdrożone, zakres M)

Liczby z `DESIGN-equipment.md`, zaakceptowane przez właściciela.

- Pięć rodzin: TENSOR / TACKY / CONTROL / SHORT_PIPS / LONG_PIPS. Każda ma plusy **i** minusy.
- Klasa magazyn / turniej / PRO tylko **skaluje** wybraną rodzinę (×0,5 / ×1 / ×1,3) i tempo zużycia. Drożej ≠ zawsze lepiej.
- Zmiana rodziny i klasy **tylko w przedsezonie**. Klubowa rodzina to **kontrakt 1–5 lat**; inna rodzina po wygaśnięciu.
- Świeżość 100→0 przy meczach (wymiana świeżości w sezonie zostaje). Zużyte okładziny słabną; dno to zero efektu.
- Zmiana rodziny: **4–6 kolejek** adaptacji (−2 do zmienionych cech).
- Preferencja ze stylu. Trafienie: +1 MEN. Gwiazda (OVR ≥ 74) może zażądać swoich okładzin — TAK to **obietnica na przedsezon**, nie zmiana w kolejce.
- Kluby AI dostają rodzinę z większości starterów.

**Nie w tym zakresie:** klauzule partnera (wyłączność, quota, R&D) oraz ręczne deski/gąbki (zostaje `fitEquipmentToStyle`).

---

## 3. Życie poza stołem (wdrożone — mały katalog)

Mail tylko gdy sprawa dojrzała. Nadal 0–3 na kolejkę, cisza OK, skutek przed kliknięciem.

| Wątek | Kiedy | TAK / NIE |
|---|---|---|
| Opieka po urazie | Pauza ≥2 kolejki, raz na uraz | Konsultacja (kasa, krótszy uraz) / gabinet klubu |
| Wypalenie | Starter, głęboki dołek formy | Pauza meczu i oddech / gra dalej, większe ryzyko urazu |
| Styl życia | Rzadko, od ok. 4. kolejki, raz na sezon | PR wycisza za kasę / merch i morale dostają rykoszet |
| Mentorship | Weteran + junior, raz na sezon | Extra stół (zmęczenie weta, forma juniora) / odpuszczamy |
| Sprawa rodzinna | Lojalny senior, rzadko | Pauza meczu / gra, lojalność spada |
| Złamana gwarancja składu | Kontrakt „pierwszy skład”, a jest w rezerwie | Obietnica stołu / serio zła krew (eskalacja, max 2 listy) |
| Żądanie okładzin | Gwiazda na obcej rodzinie | Obietnica wymiany w przedsezonie / zła krew |

---

## 4. Skaut + peak OVR (wdrożone)

- OVR zawsze widać.
- **Własny skład** jest zawsze zeskautowany: liczby cech i peak.
- **Obcy:** cechy jako pasma (np. 56–72), peak `?`, dopóki nie: obserwacja za 2000 € (potrzebny skaut na etacie), mecz przeciwko nim, albo podpis.

---

## 5. Budynki (wdrożone)

1. **Siła na korcie ma miękki sufit.** Trening hali kończy się ok. +60% (nie +80%).
2. **Po poziomie 5: projekty** (trybuny, internat, sezonowa odnowa, kolekcja merchu) — kasa i tożsamość, nie plus do OVR.
3. **Medycyna:** krótszy **i** rzadszy uraz, poziomy różne, rzut u **tych co grali**.
4. Nazwy: sala, fizjo, kuźnia, dom kibica.

### Akademia — peak (właściciel 2026-08-20)

Upgrade **nie podnosi sufitu peak OVR**. Zakres **56–92 na każdym poziomie**.
Poziom podnosi tylko **szansę** na górę skali (`peakChance` 0.08 → 0.58), plus pasmo startowego OVR i tempo rozwoju.

---

## Kolejność

1. ~~Skrzynka + rezerwa + ciche kolejki~~
2. ~~Sprzęt zakres M (rodziny, zużycie, adaptacja, preferencja, żądania)~~
3. ~~Katalog życia~~
4. ~~Pełny skaut / pasma~~
5. ~~Budynki / projekty / akademia peakChance~~

Zostaje: playtest odczucia; partner z klauzulami (L); ręczne deski.
