drop policy if exists "Authenticated users can read categories" on public.categories;

create policy "Authenticated users can read categories"
  on public.categories for select to authenticated
  using (true);
