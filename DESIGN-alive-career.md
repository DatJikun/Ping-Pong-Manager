# Żywa kariera — ustalenia z właścicielem (2026-08-20)

> **Status: pierwszy kawałek W GRZE** (skrzynka + budynki + peak akademii).
> Sprzęt (rodziny), katalog życia i pełna mgła skauta **nie** wchodzą w tym commicie.

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
| **Pierwszy skład** | Nie prosi o szansę. Złamana gwarancja — osobny, jeszcze nie zbudowany wątek. |

---

## 2. Sprzęt — później

Zakres M z `DESIGN-equipment.md` po osobnej zgodzie na liczby. **Nie w tym commicie.**

---

## 3. Życie poza stołem — później

Mały katalog **po** skrzynce. **Nie w tym commicie.**

---

## 4. Skaut + peak OVR (częściowo)

- OVR zawsze widać.
- **Peak OVR jako liczba** u własnego składu (zawsze „zeskautowany”). Na rynku obcy = `?` do pełnej mgły skauta.
- Pełne pasma statystyk — jeszcze nie.

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

## Kolejność, która została

1. ~~Skrzynka + rezerwa + ciche kolejki~~
2. Sprzęt (po zgodzie na liczby)
3. Katalog życia
4. Pełny skaut / pasma
5. ~~Budynki / projekty / akademia peakChance~~
