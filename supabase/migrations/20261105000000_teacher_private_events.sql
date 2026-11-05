alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set role = 'teacher'
where role = 'viewer';

alter table public.profiles
  alter column role set default 'teacher',
  add constraint profiles_role_check check (role in ('teacher', 'admin'));

alter table public.events
  add column is_private boolean not null default false;

drop policy if exists "Users can read events from their school" on public.events;
drop policy if exists "School admins can create events" on public.events;
drop policy if exists "School admins can update events" on public.events;
drop policy if exists "School admins can delete events" on public.events;

create policy "Users can read school events and their own private events"
  on public.events for select to authenticated
  using (
    school_id = (select public.current_profile_school_id())
    and (not is_private or created_by = (select auth.uid()))
  );

create policy "School admins can create public events"
  on public.events for insert to authenticated
  with check (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'admin'
    and not is_private
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );

create policy "Teachers can create private events"
  on public.events for insert to authenticated
  with check (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'teacher'
    and is_private
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );

create policy "School admins can update public events"
  on public.events for update to authenticated
  using (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'admin'
    and not is_private
  )
  with check (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'admin'
    and not is_private
    and updated_by = (select auth.uid())
  );

create policy "Teachers can update their private events"
  on public.events for update to authenticated
  using (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'teacher'
    and is_private
    and created_by = (select auth.uid())
  )
  with check (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'teacher'
    and is_private
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );

create policy "School admins can delete public events"
  on public.events for delete to authenticated
  using (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'admin'
    and not is_private
  );

create policy "Teachers can delete their private events"
  on public.events for delete to authenticated
  using (
    school_id = (select public.current_profile_school_id())
    and (select public.current_profile_role()) = 'teacher'
    and is_private
    and created_by = (select auth.uid())
  );
