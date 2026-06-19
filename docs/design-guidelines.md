# GitHub-like Design Guidelines

System projektowy oparty na live ekstrakcji z `https://github.com` wykonanej 2026-06-17. Celem jest aplikacja o klimacie GitHub: techniczna, gesta informacyjnie, spokojna wizualnie, z mocnym kontrastem i prostymi kontrolkami.

## Assets

| Plik | Uzycie |
|---|---|
| `../assets/design-tokens.json` | Glowne tokeny kolorow, typografii, spacingu i komponentow |
| `../assets/logo.svg` | Znak GitHub/octicon wyciagniety z DOM strony glownej |
| `../assets/favicon.ico` | Favicon z `https://github.com/fluidicon.png` |
| `../assets/homepage.png` | Screenshot referencyjny strony glownej |
| `../assets/github-extracted-styles.json` | Surowy zapis stylow z Playwright |

## Design Wireframes

Te wireframe'y sa referencja funkcjonalnego ukladu aplikacji. Traktuj je jako szablony rozmieszczenia elementow i przebiegu procesu, nie jako finalny projekt wizualny.

| Plik | Krok aplikacji | Uzycie |
|---|---|---|
| `../assets/wireframes/wireframe-step-01-initial-form.png` | Krok 1 - formularz zgloszenia | Ekran startowy z wyborem typu sprawy, danymi sprzetu, data zakupu, powodem i jednym zdjeciem |
| `../assets/wireframes/wireframe-step-02-agent-decision-chat.png` | Krok 2 - pierwsza odpowiedz agenta | Widok po analizie, z podsumowaniem zgloszenia i pierwsza wiadomoscia czatu zawierajaca decyzje, uzasadnienie i nastepne kroki |
| `../assets/wireframes/wireframe-step-03-active-chat-history.png` | Krok 3 - aktywna rozmowa | Widok rozmowy z historia wiadomosci, zakwestionowaniem decyzji i aktualizacja decyzji lub przekazaniem do weryfikacji |

## Colors

| Token | Hex / value | Uzycie |
|---|---:|---|
| `background.dark` | `#0d1117` | Gorny pasek, hero, ciemne obszary aplikacji |
| `background.canvas` | `#ffffff` | Podstawowe panele robocze i formularze |
| `background.subtle` | `#f6f8fa` | Tla sekcji, toolbarow, nieaktywne obszary |
| `text.primary` | `#1f2328` | Glowny tekst na jasnym tle |
| `text.secondary` | `#59636e` | Opisy, metadane, tekst drugiego poziomu |
| `text.onDark` | `#ffffff` | Tekst na ciemnym tle |
| `text.onDarkMuted` | `rgba(255,255,255,0.75)` | Placeholdery i tekst pomocniczy w ciemnym headerze |
| `border.default` | `#d1d9e0` | Ramki kart, inputow, przyciskow drugorzednych |
| `brand.primary` | `#0969da` | Linki i akcje na jasnym tle |
| `brand.primaryDark` | `#1f6feb` | Linki/akcenty na ciemnym tle |
| `brand.success` | `#1f883d` | Akcje pozytywne, status OK |
| `brand.danger` | `#d1242f` | Bledy i odrzucenia |
| `brand.attention` | `#d29922` | Ostrzezenia |

## Typography

Podstawowa rodzina to `Mona Sans`, z fallbackami systemowymi: `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Noto Sans`, `Helvetica`, `Arial`, `sans-serif`. Dla danych technicznych i identyfikatorow uzywaj `Mona Sans Mono` albo `Monaspace Neon` z fallbackiem `ui-monospace`.

Ekstrakcja wykryla font-face dla `Mona Sans`, `Hubot Sans`, `Mona Sans Mono`, `Monaspace Neon` oraz fallbacki Arial. W aplikacji trzymaj skale: `12px`, `14px`, `16px`, `20px`, `24px`, `32px`. Glowny tekst: `14px/21px`; nawigacja: `16px/24px`; naglowki paneli: `20-24px`, waga `600`.

Wagi: `400` regular, `500` medium, `600` semibold, `700` bold. Nie stosuj ozdobnej typografii ani ujemnego letter-spacingu.

## Spacing

Bazowy rytm to `4px`. Najczestsze wartosci: `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48px`. Kontrolki i listy powinny byc zwarte: header `16px 0`, elementy menu `8px`, male przyciski `4px 12px`, glowne CTA `6px 20px`.

## Border Radius

| Token | Wartosc | Uzycie |
|---|---:|---|
| `none` | `0px` | Layout, sekcje pelnej szerokosci |
| `sm` | `3px` | Male badge, mikroelementy |
| `md` | `6px` | Przyciski, inputy, karty, panele |
| `lg` | `12px` | Wieksze modale lub promo panele |
| `full` | `999px` | Pigulki statusow i avatary tekstowe |

Domyslny radius komponentow to `6px`. Nie rob zaokraglonych kart marketingowych bez potrzeby.

## Components

### Header

Header powinien byc ciemny (`#0d1117`), wysoki wizualnie ok. `64px`, z bialym logo po lewej, nawigacja `16px/24px`, input wyszukiwania i akcje konta po prawej. Na mobile przejdz na kompaktowy pasek z ikonami i menu.

### Navigation

Menu ma byc tekstowe, oszczedne i skanowalne. Linki w headerze: biale, waga `400`, padding `8px`. Linki w jasnej czesci aplikacji: `#0969da`; linki drugorzedne: `#59636e`.

### Buttons

Primary button: zielony `#1f883d`, bialy tekst, `6px 20px`, radius `6px`, wysokosc ok. `43px`. Secondary dark: przezroczysty, bialy tekst, ramka `#d1d9e0`, `4px 12px`. Dla narzedzi i akcji technicznych preferuj ikonki Octicon/lucide z tooltipem zamiast dlugich etykiet.

### Inputs

Inputy maja radius `6px`, cienka ramke i zwarte paddingi. W ciemnym headerze tlo pozostaje transparentne, tekst bialy, placeholder `rgba(255,255,255,0.75)`. W jasnych formularzach uzywaj `#ffffff`, tekst `#1f2328`, ramka `#d1d9e0`.

### Cards and Panels

Karty sa funkcjonalne, nie dekoracyjne: biale tlo, ramka `#d1d9e0`, radius `6px`, cien lub inset border tylko gdy potrzebna separacja. Uzywaj ich dla list, repozytoriow, wynikow analizy, statusow i pojedynczych rekordow.

### Promo Bar

Promo lub alert informacyjny: tlo `#f6f8fa`, tekst `#59636e`, ramka `#d1d9e0`, radius `6px`. Dla ostrzezen dodaj akcent `#d29922`; dla bledow `#d1242f`.

## Logo Usage

`logo.svg` jest znakiem w `currentColor`. Na ciemnym tle ustaw kolor `#ffffff`; na jasnym tle `#1f2328`. Zachowaj minimum `16px` wolnej przestrzeni wokol znaku i nie lacz go z ozdobnymi gradientami. W produkcie kursowym nie udawaj oficjalnej aplikacji GitHub; traktuj znak i styl jako referencje projektowa.

## Visual Style Summary

Interfejs powinien wygladac jak narzedzie dla osob technicznych: gesty, czytelny, z mocnymi liniami podzialu i bez ozdobnikow. Dominujace tlo moze byc jasne, ale header i kluczowe sekcje moga korzystac z ciemnego `#0d1117`. Akcje pozytywne sa zielone, linki niebieskie, statusy kodowane kolorem. Najwazniejsza jest ergonomia powtarzalnej pracy: listy, formularze, stany, wyniki i historia powinny byc latwe do skanowania.
