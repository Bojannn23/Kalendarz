create or replace function public.validate_event_school_year()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  school_year_start date;
  school_year_end date;
begin
  select school_year.start_date, school_year.end_date
  into school_year_start, school_year_end
  from public.school_years school_year
  where school_year.id = new.school_year_id
    and school_year.school_id = new.school_id;

  if not found then
    raise exception 'Wybrany rok szkolny nie należy do tej szkoły.';
  end if;

  if new.start_date < school_year_start or new.end_date > school_year_end then
    raise exception 'Daty wydarzenia muszą mieścić się w roku szkolnym przypisanym do szkoły.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_event_school_year_before_write on public.events;

create trigger validate_event_school_year_before_write
before insert or update of school_id, school_year_id, start_date, end_date on public.events
for each row execute function public.validate_event_school_year();
