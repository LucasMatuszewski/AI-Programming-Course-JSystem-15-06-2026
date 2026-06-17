# Polityka reklamacji

Dokument roboczy dla MVP aplikacji do obslugi reklamacji rowerow. Polityka opisuje ogolny proces biznesowy i nie stanowi finalnej interpretacji prawnej.

---

## 1. Zakres

Polityka dotyczy reklamacji rowerow zglaszanych przez aplikacje. W MVP system obsluguje przede wszystkim uszkodzenia mechaniczne widoczne na zdjeciach oraz opisane przez klienta.

---

## 2. Dane wymagane do zgloszenia

Klient musi podac:

1. Rodzaj sprzetu.
2. Marke roweru.
3. Model roweru.
4. Opis problemu.
5. Okolicznosci powstania uszkodzenia.
6. Co najmniej 1 zdjecie uszkodzenia.

Klient moze dodac maksymalnie 5 zdjec.

---

## 3. Znaczenie opisu problemu

Opis klienta jest istotnym elementem oceny reklamacji. Zdjecie pokazuje stan uszkodzenia, ale nie zawsze wyjasnia jego przyczyne.

Przyklady:

1. Jesli zdjecie pokazuje uszkodzona rame, a klient opisuje, ze przewrocil sie na rowerze, zgloszenie moze zostac wstepnie uznane za niepodlegajace reklamacji.
2. Jesli zdjecie pokazuje peknieta rame, a klient opisuje, ze rama pekla podczas normalnej jazdy, zgloszenie powinno zostac potraktowane jako potencjalnie podlegajace reklamacji albo wymagajace weryfikacji serwisowej.

---

## 4. Wstepna ocena reklamacji

System wykonuje wstepna ocene na podstawie:

1. Danych roweru.
2. Zdjec dodanych przez klienta.
3. Opisu problemu.
4. Okolicznosci powstania uszkodzenia.

Wstepna decyzja moze miec jeden z wynikow:

1. Podlega reklamacji.
2. Nie podlega reklamacji.
3. Wymaga doprecyzowania.

Kazda decyzja musi zawierac uzasadnienie odnoszace sie do zdjec i opisu klienta.

---

## 5. Przypadki potencjalnie podlegajace reklamacji

Zgloszenie moze zostac wstepnie uznane za potencjalnie podlegajace reklamacji, gdy:

1. Opis wskazuje na awarie podczas normalnego uzytkowania roweru.
2. Uszkodzenie moglo powstac bez udzialu upadku, kolizji lub niewlasciwego uzycia.
3. Zdjecia i opis sa spojne.
4. System nie znajduje wystarczajacych podstaw do wstepnej odmowy.

---

## 6. Przypadki potencjalnie niepodlegajace reklamacji

Zgloszenie moze zostac wstepnie uznane za niepodlegajace reklamacji, gdy opis wskazuje na:

1. Upadek klienta na rowerze.
2. Kolizje lub uderzenie.
3. Niewlasciwe uzycie roweru.
4. Uszkodzenie wynikajace z czynnika zewnetrznego.
5. Uszkodzenie powstale po zakupie w okolicznosciach niezaleznych od sprzedawcy lub producenta.

---

## 7. Doprecyzowanie zgloszenia

System powinien poprosic klienta o dodatkowe informacje, jesli:

1. Opis nie wyjasnia, jak doszlo do uszkodzenia.
2. Zdjecia sa niewystarczajace do oceny.
3. Zdjecia i opis sa ze soba sprzeczne.
4. Nie da sie okreslic, czy uszkodzenie powstalo podczas normalnego uzytkowania.

---

## 8. Weryfikacja serwisowa

Klient moze poprosic o dodatkowa weryfikacje przez serwisanta. W takim przypadku zgloszenie powinno zostac oznaczone jako wymagajace weryfikacji serwisowej.

Serwisant powinien widziec:

1. Dane roweru.
2. Opis problemu.
3. Okolicznosci powstania uszkodzenia.
4. Zdjecia.
5. Wstepna decyzje AI.
6. Uzasadnienie decyzji AI.
7. Historie rozmowy klienta z AI, jesli istnieje.

---

## 9. Komunikat dla klienta

Przy kazdej decyzji system powinien pokazac komunikat:

"To jest wstepna ocena wygenerowana automatycznie. Ostateczna decyzja moze wymagac weryfikacji przez sprzedawce lub serwis."

