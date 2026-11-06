alter table public.events
  add column if not exists is_private boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set role = 'teacher'
where role = 'viewer';

alter table public.profiles
  alter column role set default 'teacher',
  add constraint profiles_role_check check (role in ('teacher', 'admin'));
