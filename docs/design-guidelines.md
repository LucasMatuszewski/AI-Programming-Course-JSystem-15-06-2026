# Design Guidelines - Lando-inspired direction

Ten design system jest inspirowany strona [landonorris.com](https://landonorris.com/), ale nie jest proba kopiowania marki 1:1. Kierunek wizualny adaptujemy do aplikacji reklamacyjnej: szybki, techniczny, kontrastowy, z mocnym neonowym akcentem i sportowym charakterem.

---

## Assets

| Asset | Path | Usage |
|---|---|---|
| Screenshot strony zrodlowej | `../assets/homepage.png` | Referencja klimatu: neonowy splash, ciemny znak, wysoki kontrast |
| Logo SVG | `../assets/logo.svg` | Referencja stylu znaku i proporcji, nie finalny znak aplikacji |
| Favicon | `../assets/favicon.png` | Referencja assetu zrodlowego |
| Design tokens | `../assets/design-tokens.json` | Zrodlo tokenow dla UI |

Uwaga: screenshot lokalny uchwycil splash screen strony, bo hero jest mocno animowany i ladowany przez Webflow/Rive. Dodatkowe decyzje oparto na HTML/CSS oraz widocznej strukturze strony.

---

## Colors

| Token | Hex | Usage |
|---|---:|---|
| `brand.primary` | `#d2ff00` | Glowne CTA, focus, aktywne stany, statusy wymagajace uwagi |
| `brand.primaryMuted` | `#b2c73a` | Drugorzedne akcenty, ilustracyjne oznaczenia, hover |
| `brand.accent` | `#ff6b00` | Ostrzezenia, eskalacja, elementy wymagajace decyzji |
| `background.default` | `#282c20` | Glowna ciemna baza aplikacji |
| `background.panel` | `#111112` | Panele, karty, formularze, modal |
| `background.elevated` | `#3b3c38` | Podniesione powierzchnie i segmenty |
| `text.primary` | `#f4f4ed` | Glowny tekst na ciemnym tle |
| `text.secondary` | `#dde1d2` | Opisy i tekst pomocniczy |
| `text.muted` | `#b9bbad` | Metadane, mniej wazne etykiety |
| `text.onAccent` | `#282c20` | Tekst na neonowym tle |

Zasada: interfejs powinien byc ciemny, ale nie czarny wszedzie. Neon lime ma byc akcentem funkcyjnym, nie tlem calej aplikacji.

---

## Typography

### Font families

| Token | Family | Usage |
|---|---|---|
| `fontFamily.primary` | `"Mona Sans Variable", Arial, sans-serif` | UI, formularze, tabele, chat, nawigacja |
| `fontFamily.display` | `"Brier", "Mona Sans Variable", Arial, sans-serif` | Krotkie naglowki, hero, puste stany, statusy |

Z CSS strony zrodlowej:

```css
@font-face {
  font-family: Brier;
  font-weight: 700;
}

@font-face {
  font-family: Mona Sans Variable;
  font-weight: 200 900;
}
```

### Weight scale

| Token | Weight | Usage |
|---|---:|---|
| `regular` | `400` | Normalny tekst |
| `medium` | `500` | Tresc formularzy i chatu |
| `semibold` | `660` | Sekcje, statusy |
| `bold` | `750` | Naglowki |
| `black` | `800` | Przyciski, etykiety, nav |

### Size scale

| Token | Size | Usage |
|---|---:|---|
| `eyebrow` | `0.625rem` | Male etykiety uppercase |
| `sm` | `0.875rem` | Tekst pomocniczy |
| `base` | `1rem` | Standardowe UI |
| `md` | `1.25rem` | Wieksze kontrolki, lead |
| `lg` | `1.6rem` | Sekcje formularza |
| `xl` | `2rem` | Naglowki paneli |
| `title` | `4.5rem` | Hero / ekran startowy |
| `impact` | `7rem` | Tylko bardzo duze momenty wizualne |

Naglowki i przyciski powinny uzywac uppercase. W aplikacji operacyjnej nie naduzywac `impact`, bo panel sprzedawcy musi byc czytelny.

---

## Spacing

Bazowa jednostka: `0.25rem`.

| Token | Value | Usage |
|---|---:|---|
| `4` | `1rem` | Wnetrze mniejszych kontrolek |
| `5` | `1.25rem` | Domyslny gap i padding kontenera |
| `8` | `2rem` | Sekcje formularza |
| `12` | `3rem` | Wieksze odstepy miedzy blokami |
| `16` | `4rem` | Ekrany i duze pasma |
| `20` | `5rem` | Hero lub splash |

Preferuj rytm gesty, techniczny i skanowalny. Panel obslugi reklamacji nie powinien wygladac jak landing page.

---

## Border Radius

| Token | Value | Usage |
|---|---:|---|
| `xs` | `0.411875rem` | Male przyciski drugorzedne |
| `sm` | `0.54rem` | Glowne przyciski i inputy |
| `md` | `0.74rem` | Ikonowe kontrolki, menu |
| `lg` | `1rem` | Karty i panele |
| `xl` | `3rem` | Duze sekcje promocyjne, rzadko |
| `organic` | `6.25rem` | Miekksze, owalne elementy inspirowane strona |

W aplikacji reklamacyjnej podstawowy radius powinien zostac w zakresie `0.54rem`-`1rem`.

---

## Components

### Header / Nav

Header moze byc ciemny lub przezroczysty na hero. Nawigacja powinna byc uppercase, gruba, techniczna. Glowne akcje w prawym gornym rogu moga miec neonowy przycisk.

### Buttons

Primary button:

- tlo `#d2ff00`
- tekst `#282c20`
- uppercase
- font-weight `800`
- radius `0.54rem`
- wysokosc ok. `3rem`

Secondary button:

- przezroczyste tlo
- border `currentColor`
- tekst jasny na ciemnym tle
- radius `0.411875rem`

### Inputs

Inputy i textarea powinny byc ciemne, kontrastowe, z jasnym tekstem i lime focus ringiem. Komunikaty walidacji powinny uzywac pomaranczu lub czerwieni tylko wtedy, gdy wymagaja reakcji.

### Cards / Panels

Karty powinny byc bardziej techniczne niz dekoracyjne: ciemne tlo, cienka linia, male etykiety uppercase, wyrazny status. Unikac kart w kartach.

### Statuses

- `Podlega reklamacji`: lime jako akcent, nie pelne neonowe tlo dla calego panelu.
- `Nie podlega reklamacji`: pomarancz lub czerwien jako sygnal, z jasnym uzasadnieniem.
- `Wymaga doprecyzowania`: muted grey + lime focus na akcji uzupelnienia.

---

## Logo Usage

`assets/logo.svg` jest referencja stylu znaku wyciagnieta ze strony zrodlowej. Do finalnej aplikacji nalezy przygotowac wlasny znak, ale zachowac podobne zasady:

1. Mocny, skondensowany wordmark.
2. Jasny wariant na ciemnym tle.
3. Neonowy akcent tylko jako detal.
4. Nie uzywac logo Lando Norris jako finalnego brandingu aplikacji.

---

## Visual Style Summary

Styl powinien byc szybki, kontrastowy i techniczny: ciemna oliwkowa baza, neonowy lime jako sygnal akcji, mocna typografia uppercase i duze, wyraziste stany. Inspiracja pochodzi z estetyki motorsportowej, ale aplikacja reklamacyjna musi pozostac uzytkowa: formularz, panel i chat maja byc czytelne, skanowalne i spokojniejsze niz hero strony. Najlepszy kierunek to "sportowy system operacyjny", nie marketingowa strona fana.

---

## Implementation Notes For Future UI Work

1. Pierwszy ekran aplikacji moze miec ciemne tlo, duzy naglowek i neonowy primary CTA, ale formularz powinien byc od razu dostepny.
2. Panel sprzedawcy powinien uzywac gestszej siatki, mniejszych naglowkow i jasnych statusow.
3. Chat po odmowie powinien miec spokojniejszy rytm: ciemne dymki, lime tylko dla aktywnych akcji.
4. Nie uzywac pelnoekranowych neonowych tla poza splash/empty state.
