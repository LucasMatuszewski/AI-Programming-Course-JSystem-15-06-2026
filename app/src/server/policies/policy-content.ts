import "server-only";

import type { RequestType } from "../../shared/contracts";

export const bundledPolicyContentByRequestType: Record<RequestType, string> = {
  RETURN: `# Polityka Zwrotów — TechSerwis (dokument przykładowy)

> **Uwaga:** To uproszczony, przykładowy dokument firmowy stworzony na potrzeby MVP.
> Nie stanowi porady prawnej. Bazuje na prawie odstąpienia od umowy zawartej na
> odległość (Dyrektywa 2011/83/UE oraz ustawa o prawach konsumenta). Agent używa
> tego dokumentu jako zbioru reguł przy ocenie zgłoszeń typu **ZWROT**.

## 1. Zakres stosowania

1.1. Niniejsza polityka dotyczy **zwrotów** (odstąpienia od umowy) towarów
zakupionych **na odległość** (sklep internetowy, telefon) przez konsumenta.

1.2. Prawo do zwrotu **nie przysługuje** dla zakupów dokonanych stacjonarnie
w sklepie (tam obowiązuje wyłącznie polityka reklamacji).

## 2. Termin

2.1. Konsument ma **14 dni kalendarzowych** od dnia otrzymania towaru na złożenie
oświadczenia o odstąpieniu od umowy.

2.2. Zgłoszenia po upływie 14 dni od otrzymania towaru są **odrzucane** w ramach
tej polityki (decyzja: REJECT).

## 3. Stan towaru kwalifikujący do zwrotu

Towar przyjmowany jest do zwrotu, jeżeli spełnia **wszystkie** poniższe warunki:

3.1. Brak śladów użytkowania wykraczających poza zwykłe sprawdzenie towaru (takie,
jakie konsument mógłby wykonać w sklepie stacjonarnym).

3.2. Brak uszkodzeń mechanicznych (zarysowania, pęknięcia, wgniecenia), zalania,
śladów zabrudzeń, zapachów (np. dym, perfumy).

3.3. Kompletność: oryginalne opakowanie, wszystkie akcesoria, kable, instrukcje,
metki i zabezpieczenia.

3.4. Brak trwałej personalizacji (np. zalogowane konta, ustawiony kod blokady,
sparowanie z kontem użytkownika, grawer).

3.5. W przypadku produktów w zapieczętowanym opakowaniu ze względów higienicznych
(np. słuchawki douszne, golarki) — **nieusunięta plomba/zabezpieczenie**. Po
otwarciu zwrot tych produktów jest niemożliwy.

## 4. Pomniejszenie wartości

4.1. Jeżeli towar nosi ślady użytkowania wykraczające poza sprawdzenie, ale nadaje
się do dalszej odsprzedaży po obniżonej cenie, dopuszczalna jest decyzja
**warunkowa (CONDITIONAL)** z propozycją zwrotu pomniejszonego o utratę wartości.

## 5. Decyzje

| Sytuacja | Decyzja |
|---|---|
| W terminie, towar bez śladów użycia, kompletny | APPROVE |
| Po 14 dniach od otrzymania | REJECT |
| Uszkodzenia mechaniczne / zalanie / niekompletny | REJECT |
| Drobne ślady użycia, nadaje się do odsprzedaży | CONDITIONAL (pomniejszenie wartości) |
| Zdjęcie niewyraźne / brak danych o dacie otrzymania | NEEDS MORE INFO |
| Zakup stacjonarny / sytuacja nietypowa / spór o stan | ESCALATE |

## 6. Zwrot środków

6.1. Po zatwierdzeniu zwrotu i otrzymaniu towaru środki zwracane są w terminie
**14 dni**.

6.2. Ostateczna decyzja oraz weryfikacja fizycznego stanu towaru należą do zespołu
serwisu. Ocena copilota ma charakter **wstępny i niewiążący**.`,
  COMPLAINT: `# Polityka Reklamacji — TechSerwis (dokument przykładowy)

> **Uwaga:** To uproszczony, przykładowy dokument firmowy stworzony na potrzeby MVP.
> Nie stanowi porady prawnej. Bazuje na przepisach o braku zgodności towaru z umową
> (ustawa o prawach konsumenta po nowelizacji z 1 stycznia 2023 r., Dyrektywa
> 2019/771/UE). Agent używa tego dokumentu jako zbioru reguł przy ocenie zgłoszeń
> typu **REKLAMACJA**.

## 1. Zakres stosowania

1.1. Niniejsza polityka dotyczy **reklamacji** z tytułu braku zgodności towaru
z umową (dawniej: rękojmia) dla konsumentów.

1.2. Reklamacja dotyczy **wad i usterek** towaru, a nie chęci rezygnacji z zakupu
(do tego służy polityka zwrotów).

## 2. Termin odpowiedzialności

2.1. Sprzedawca odpowiada za brak zgodności towaru z umową istniejący w chwili
dostawy i ujawniony w ciągu **2 lat** od wydania towaru.

2.2. Domniemywa się, że brak zgodności ujawniony w ciągu **2 lat** od dostawy
istniał już w chwili dostawy (ciężar dowodu po stronie sprzedawcy).

2.3. Zgłoszenia po upływie 2 lat od daty zakupu są co do zasady **odrzucane**
w ramach tej polityki (decyzja: REJECT), chyba że obowiązuje dłuższa gwarancja
producenta.

## 3. Co podlega reklamacji (wada / brak zgodności)

3.1. Wady fabryczne i materiałowe (np. martwe piksele, niedziałający przycisk,
samoczynne wyłączanie, wadliwa bateria odbiegająca od specyfikacji).

3.2. Niezgodność ze specyfikacją lub opisem (inny model, brak deklarowanej funkcji).

3.3. Usterki ujawniające się w normalnym użytkowaniu bez winy użytkownika.

## 4. Co NIE podlega reklamacji (wyłączenia)

4.1. **Uszkodzenia mechaniczne** powstałe z winy użytkownika: pęknięty/zarysowany
ekran, wgniecenia, urwane elementy.

4.2. **Zalanie / kontakt z cieczą** (ślady korozji, zaparowanie pod szybą,
zadziałanie wskaźników zalania).

4.3. Uszkodzenia wskutek nieprawidłowego użytkowania, przeciążenia, nieoryginalnych
akcesoriów lub niewłaściwego zasilania.

4.4. **Naturalne zużycie** materiałów eksploatacyjnych (np. spadek pojemności
baterii w granicach normy, zużycie powłok).

4.5. Uszkodzenia po samodzielnej lub nieautoryzowanej naprawie.

## 5. Uprawnienia konsumenta (hierarchia)

5.1. W pierwszej kolejności: **naprawa albo wymiana** towaru.

5.2. Jeżeli naprawa/wymiana jest niemożliwa, nadmiernie kosztowna lub nieskuteczna —
konsument może żądać **obniżenia ceny** albo **odstąpić od umowy** (zwrot pieniędzy),
o ile brak zgodności nie jest nieistotny.

## 6. Decyzje

| Sytuacja | Decyzja |
|---|---|
| Wada fabryczna, w terminie 2 lat, brak winy użytkownika | APPROVE (naprawa/wymiana) |
| Uszkodzenie mechaniczne / zalanie widoczne na zdjęciu | REJECT |
| Naturalne zużycie / materiał eksploatacyjny | REJECT |
| Po 2 latach od zakupu | REJECT |
| Wada możliwa, ale wymaga diagnostyki / niejasna przyczyna | CONDITIONAL (przyjęcie do diagnozy) |
| Zdjęcie niewyraźne / brak opisu usterki / brak daty zakupu | NEEDS MORE INFO |
| Spór co do przyczyny / wysoka wartość / sytuacja nietypowa | ESCALATE |

## 7. Terminy i ostateczność

7.1. Sprzedawca ustosunkowuje się do reklamacji w terminie **14 dni**.

7.2. Ostateczna decyzja oraz diagnostyka techniczna należą do zespołu serwisu.
Ocena copilota ma charakter **wstępny i niewiążący**.`
};
