create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  label text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint school_year_dates_valid check (end_date >= start_date),
  constraint school_year_school_label_unique unique (school_id, label)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'viewer' check (role in ('viewer', 'admin')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table public.audiences (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  category_id uuid not null references public.categories(id),
  audience_id uuid not null references public.audiences(id),
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  all_day boolean not null default false,
  location text not null check (length(trim(location)) > 0),
  organizer text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_dates_valid check (end_date >= start_date),
  constraint event_times_valid check (
    all_day
    or start_date < end_date
    or (start_time is not null and end_time is not null and end_time > start_time)
  ),
  constraint event_year_matches_school check (school_id is not null and school_year_id is not null)
);

create index events_school_year_start_date_idx
  on public.events (school_year_id, start_date, start_time);
create index profiles_school_id_idx on public.profiles (school_id);

create or replace function public.validate_event_school_year()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.school_years school_year
    where school_year.id = new.school_year_id
      and school_year.school_id = new.school_id
  ) then
    raise exception 'Wybrany rok szkolny nie należy do tej szkoły.';
  end if;
  return new;
end;
$$;

create trigger validate_event_school_year_before_write
before insert or update of school_id, school_year_id on public.events
for each row execute function public.validate_event_school_year();

create or replace function public.set_event_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_event_updated_at_before_update
before update on public.events
for each row execute function public.set_event_updated_at();

create or replace function public.current_profile_school_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select profile.school_id
  from public.profiles profile
  where profile.id = (select auth.uid())
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.profiles profile
  where profile.id = (select auth.uid())
$$;

revoke all on function public.current_profile_school_id() from public;
revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_school_id() to authenticated;
grant execute on function public.current_profile_role() to authenticated;

alter table public.schools enable row level security;
alter table public.school_years enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.audiences enable row level security;
alter table public.events enable row level security;

create policy "Users can read their school"
  on public.schools for select to authenticated
  using (id = (select public.current_profile_school_id()));

create policy "Users can read their school years"
  on public.school_years for select to authenticated
  using (school_id = (select public.current_profile_school_id()));

create policy "Users can read profiles in their school"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (
      school_id = (select public.current_profile_school_id())
      and (select public.current_profile_role()) = 'admin'
    )
  );

create policy "Authenticated users can read categories"
  on public.categories for select to authenticated
  using (true);

create policy "Authenticated users can read audiences"
  on public.audiences for select to authenticated
  using (true);

create policy "Users can read events from their school"
  on public.events for select to authenticated
  using (school_id = (select public.current_profile_school_id()));

create policy "School admins can create events"
  on public.events for insert to authenticated
  with check (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'admin'
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );

create policy "School admins can update events"
  on public.events for update to authenticated
  using (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'admin'
  )
  with check (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'admin'
    and updated_by = (select auth.uid())
  );

create policy "School admins can delete events"
  on public.events for delete to authenticated
  using (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'admin'
  );

grant select on public.schools, public.school_years, public.profiles,
  public.categories, public.audiences, public.events to authenticated;
grant insert, update, delete on public.events to authenticated;

insert into public.schools (name, slug)
values ('Szkoła Podstawowa nr 24 im. Marii Skłodowskiej-Curie', 'sp24')
on conflict (slug) do update set name = excluded.name;

insert into public.school_years (school_id, label, start_date, end_date)
select school.id, '2026/2027', date '2026-09-01', date '2027-08-31'
from public.schools school
where school.slug = 'sp24'
on conflict (school_id, label) do nothing;

insert into public.categories (name, slug)
values
  ('Organizacja', 'organization'),
  ('Spotkania', 'meeting'),
  ('Uroczystości', 'ceremony'),
  ('Wycieczki', 'trip')
on conflict (name) do update set slug = excluded.slug;

insert into public.audiences (name)
values
  ('Cała szkoła'),
  ('Nauczyciele'),
  ('Rodzice klas I–VIII'),
  ('Klasy VI'),
  ('Klasy I i rodzice'),
  ('Samorząd uczniowski')
on conflict (name) do nothing;

insert into public.events (
  school_id, school_year_id, title, description, category_id, audience_id,
  start_date, end_date, start_time, end_time, all_day, location, organizer,
  created_by, updated_by
)
select
  school.id,
  school_year.id,
  seed.title,
  seed.description,
  category.id,
  audience.id,
  seed.start_date,
  seed.end_date,
  seed.start_time,
  seed.end_time,
  false,
  seed.location,
  seed.organizer,
  null,
  null
from public.schools school
join public.school_years school_year
  on school_year.school_id = school.id and school_year.label = '2026/2027'
cross join (
  values
    ('Rada pedagogiczna', '', 'Spotkania', 'Nauczyciele', date '2026-10-01', time '15:00', time '16:30', 'Sala nauczycielska', 'Anna Kowalska'),
    ('Zebrania z rodzicami', '', 'Spotkania', 'Rodzice klas I–VIII', date '2026-10-08', time '17:00', time '18:30', 'Sale lekcyjne', 'Anna Kowalska'),
    ('Próbna ewakuacja', '', 'Organizacja', 'Cała szkoła', date '2026-10-12', time '10:00', time '10:30', 'Teren szkoły', 'Anna Kowalska'),
    ('Dzień Edukacji Narodowej', 'Uroczysty apel dla społeczności szkoły. Zapraszamy uczniów i nauczycieli. Zbiórka klas w auli o godz. 08:50.', 'Uroczystości', 'Cała szkoła', date '2026-10-14', time '09:00', time '10:30', 'Aula szkolna', 'Anna Kowalska'),
    ('Wycieczka do Centrum Nauki', '', 'Wycieczki', 'Klasy VI', date '2026-10-16', time '08:00', time '15:00', 'Centrum Nauki Kopernik', 'Anna Kowalska'),
    ('Konsultacje dla rodziców', '', 'Spotkania', 'Rodzice klas I–VIII', date '2026-10-20', time '16:00', time '18:00', 'Sale lekcyjne', 'Anna Kowalska'),
    ('Ślubowanie klas pierwszych', '', 'Uroczystości', 'Klasy I i rodzice', date '2026-10-23', time '10:00', time '11:00', 'Aula szkolna', 'Anna Kowalska'),
    ('Posiedzenie samorządu', '', 'Organizacja', 'Samorząd uczniowski', date '2026-10-29', time '14:00', time '15:00', 'Sala 12', 'Anna Kowalska')
) as seed(title, description, category, audience, start_date, start_time, end_time, location, organizer)
join public.categories category on category.name = seed.category
join public.audiences audience on audience.name = seed.audience
where school.slug = 'sp24'
  and not exists (
    select 1
    from public.events existing
    where existing.school_year_id = school_year.id
      and existing.title = seed.title
      and existing.start_date = seed.start_date
  );
