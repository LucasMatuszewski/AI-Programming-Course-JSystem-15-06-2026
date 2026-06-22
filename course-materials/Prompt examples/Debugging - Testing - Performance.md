# Przykłady promptów - Debugging, Testing, Performance

## Prompty do testowania E2E z agentami:

1. Wczuj się w hackera i bounty huntera, który próbuje zepsuć aplikacje i testuje edge cases, w celu wykrycia błędów i podatności. Użyj do tego celu Playwright MCP symulując atakującego korzystającego z przeglądarki. Nasza strona produkcyjna: https://example.com

2. Napisz testy E2E w Playwright dla pełnych happy path oraz edge cases. Pokryj wszystkie główne fukcjonalności i user flows z dokumentu PRD <ścieżka do pliku PRD>

3. Użyj Chrome DevTools MCP i zrób audyt performance aplikacji, przeanalizuj zarówno Lighthouse, Network, latency, lifecycle, renderowanie, użycie pamięci przeglądarki, wielkość przesyłanych plików, headers i cache, itd.

---

## Debuggowanie

### Napraw błędy i warningi w konsoli

Użyj Chrome DevTools MCP i przeanalizuj wszystkie błędy i warningi w consoli. Zrozum dokładnie z czego wynikają i je napraw nie zmieniając funkcjonalności aplikacji. Pamiętaj, że wszystkie testy muszą przechodzić po naprawieniu błędów.

### Naprawa błędu + test pokrywający ten błąd

Dostaję taki blad - popraw go prosze - sprawdź logi jakie obiekty są realnie przesyłane (dodaj logowanie do pliku i dodatkowe logi jeśli ich nie ma):

```
Błąd oceny
Nie możemy teraz dokończyć oceny.
Model zwrócił niepoprawną strukturę odpowiedzi. Spróbuj ponownie.
```

Dodaj test, który będzie weryfikował zgodność obiektów i struktury danych aby uniknąć tego błędu w przyszłości

### System logów do pliku

Stwórz helper function do logowania z obsługą poziomów logowania (debug, info, warn, error) i zapisaniem do pliku oraz rollback (np. na 10mb, 10000 linii). Użyj biblioteki do tego. Używaj tego systemu w trakcie debuggowania zmieniając poziom na "debug" np. przez zmienną środowiskową. Na produkcji system powinien być ustawiony na "error" lub kod powinien być całkowicie wyłączony aby nie wpływał na działanie aplikacji i performance.

Nigdy nie czytaj całego pliku z logami, może zawierać bardzo dużo danych. Używaj nażędzi typu bash grep do filtrowania i wyszukiwania w logach.

---

### Skrypt do opdalania komend logujący do pliku

> PROBLEM: kiedy agent odpala samemu komendy (np. `npm run build`) logi zapychają mu okno kontekstu, a często są bardzo duże i mu niepotrzebne.
> Zapisywanie pełnego logu do pliku oszczędza okno kontekstu oraz pozwala na łatwe debugowanie.

**PROMPT:**

Stwórz skrypt bash *(albo PowerShell, python, js)*, który odpala komendę bash/ps i loguje pełny output do pliku. Skrypt powinien mieć możliwość podania jako argument nazwy i ścieżki pliku logu oraz podawać jako output:
- head - pierwsze 10 linii logu
- tail - ostatnie 20 linii logu
- 10 linii przed błędem i 10 linii po błędzie (użyj regex/grep aby rozpoznać linie logów z błędem)
- ścieżkę do pełnego pliku z logami
- instrukcję dla agenta aby nigdy nie czytał całego pliku z logami, tylko używał grep do filtrowania i wyszukiwania w logach

Następnie dodaj do AGENTS.md instrukcję dla agentów, aby zawsze używali tego skryptu w przypadku komend, które produkują długi output (np. build, uruchomienie aplikacji, instalacja dependencji, instalacja pakietów, itd.)
