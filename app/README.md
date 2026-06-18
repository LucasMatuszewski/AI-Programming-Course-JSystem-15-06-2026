# Asystent reklamacji rowerów - PoC

PoC aplikacji Next.js do wstępnej oceny reklamacji rowerów na podstawie formularza, opisu okoliczności i zdjęć uszkodzenia. Aplikacja zapisuje zgłoszenia w SQLite, przechowuje zdjęcia lokalnie, pokazuje decyzję AI, umożliwia doprecyzowanie, chat po odmowie i panel obsługi.

## Uruchomienie lokalne

1. Skopiuj env:

```powershell
Copy-Item .env.example .env
```

2. Ustaw wartości w `.env`, minimum:

```env
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="dev-secret-change-me"
UPLOAD_DIR="./data/uploads"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="change-me-local-only"
```

3. Przygotuj bazę i konto pracownika:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
```

4. Uruchom aplikację:

```powershell
npm.cmd run dev
```

Widoki:
- `/` - formularz klienta, decyzja, doprecyzowanie i chat po odmowie.
- `/service` - panel obsługi PoC.

## Weryfikacja

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

Playwright wymaga pobranego Chromium:

```powershell
npx.cmd playwright install chromium
```

Jeśli lokalny system zgłasza problem certyfikatu, jednorazowo pobierz przeglądarkę z:

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED='0'; npx.cmd playwright install chromium
```

## Zakres PoC

- Wspierany typ sprzętu: rower.
- Wymagane dane: marka, model, opis problemu, okoliczności uszkodzenia, 1-5 zdjęć.
- Decyzje: podlega reklamacji, nie podlega reklamacji, wymaga doprecyzowania.
- Chat jest dostępny po wstępnej odmowie.
- Panel obsługi pokazuje zgłoszenia, status, typ uszkodzenia i uzasadnienie AI.

## Ograniczenia

- Decyzja AI jest wstępna i nie jest finalną decyzją prawną.
- Aktualny adapter oceny działa jako PoC z lokalną heurystyką i mockowalnym kontraktem pod OpenAI/Vercel AI SDK.
- SQLite i lokalny filesystem są dobre dla lokalnego demo. Na Vercel nie są produkcyjnie trwałe; przed realnym pilotażem trzeba przejść na hostowaną bazę i object storage.
