# Szkolny plan

Responsywna aplikacja do przeglądania kalendarza i zarządzania wydarzeniami szkolnymi. Projekt korzysta z React, Vite, Bootstrap 5 i istniejących zależności z `package.json`.

## Struktura

```text
src/
├── App.jsx
├── main.jsx
├── App.css
├── index.css
├── features/
│   └── calendar/      # kalendarz, lista, formularz i zapytania do Supabase
└── shared/
    ├── layouts/       # wspólny układ desktop/mobile
    └── lib/           # formatowanie dat i klient Supabase
supabase/
└── migrations/        # schemat bazy, dane początkowe i polityki RLS
```

Układy, breakpointy, formularze, przyciski, karty i tabele wykorzystują Bootstrap 5. Własny CSS w `App.css` odpowiada głównie za wygląd kalendarza, kolory kategorii i elementy charakterystyczne dla projektu.

## Uruchomienie

```sh
npm install
npm run dev
```

Polecenia `npm run build` i `npm run lint` służą odpowiednio do budowania i sprawdzania projektu.

## Konfiguracja Supabase

1. Zależności Supabase są instalowane razem z pozostałymi przez `npm install`.
2. Skopiuj `.env.example` do `.env.local`. Wpisz adres projektu i klucz publishable z ustawień Supabase w zmiennych `VITE_SUPABASE_URL` oraz `VITE_SUPABASE_PUBLISHABLE_KEY`. `.env.local` jest ignorowany przez Git. Po zmianie zmiennych uruchom ponownie Vite.
3. W Supabase otwórz **SQL Editor** i wykonaj zawartość `supabase/migrations/20261014000000_school_calendar.sql`. Migracja tworzy tabele szkół, lat szkolnych, profili, kategorii, odbiorców i wydarzeń oraz polityki Row Level Security (RLS). Osiem przykładowych wydarzeń października 2026 trafia do bazy, nie do kodu frontendu.
4. Utwórz konto przez **Authentication → Users**. Publiczna rejestracja nie jest wymagana.
5. Przypisz konto do szkoły w SQL Editorze. Zastąp adres e-mail administratorem:

   ```sql
   insert into public.profiles (id, school_id, full_name, role)
   select auth_user.id, school.id, 'Anna Kowalska', 'admin'
   from auth.users auth_user
   cross join public.schools school
   where auth_user.email = 'admin@twoja-szkola.pl'
     and school.slug = 'sp24';
   ```

   Kolejnych użytkowników dodaj w ten sam sposób, zmieniając rolę na `viewer`. Nie dodawaj edycji profilu ani zmiany roli po stronie klienta.
6. Uruchom `npm run dev` i zaloguj się utworzonym kontem.

Frontend używa wyłącznie klucza publishable. Uprawnienia do dodawania, edycji i usuwania wymuszają polityki RLS w bazie; rola `admin` nie jest przyznawana na podstawie stanu interfejsu. Klucza `service_role` nie wolno umieszczać w aplikacji.

Jeśli nie ma konfiguracji lub użytkownik nie ma profilu w szkole, aplikacja wyświetla komunikat zamiast atrap danych. Trwałość zapisów zależy od poprawnego uruchomienia migracji w projekcie Supabase.
