create or replace function public.can_access_person(p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.people p
    where p.id = p_person_id
      and (
        public.is_admin_role(array['admin','owner'])
        or (
          public.is_admin_role(array['editor'])
          and (
            p.assigned_to = auth.uid()
            or p.created_by = auth.uid()
          )
        )
      )
  );
$$;

revoke all on function public.can_access_person(uuid) from public, anon;
grant execute on function public.can_access_person(uuid) to authenticated;

drop policy if exists "staff read people" on public.people;
drop policy if exists "staff insert people" on public.people;
drop policy if exists "staff update people" on public.people;

create policy "scoped read people" on public.people
  for select to authenticated
  using (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and (
        assigned_to = auth.uid()
        or created_by = auth.uid()
      )
    )
  );

create policy "scoped insert people" on public.people
  for insert to authenticated
  with check (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and created_by = auth.uid()
      and updated_by = auth.uid()
    )
  );

create policy "scoped update people" on public.people
  for update to authenticated
  using (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and (
        assigned_to = auth.uid()
        or created_by = auth.uid()
      )
    )
  )
  with check (
    public.is_admin_role(array['admin','owner'])
    or (
      public.is_admin_role(array['editor'])
      and (
        assigned_to = auth.uid()
        or created_by = auth.uid()
      )
    )
  );

drop policy if exists "staff read person roles" on public.person_roles;
drop policy if exists "staff insert person roles" on public.person_roles;
drop policy if exists "staff update person roles" on public.person_roles;
drop policy if exists "staff delete person roles" on public.person_roles;

create policy "scoped read person roles" on public.person_roles
  for select to authenticated
  using (public.can_access_person(person_id));

create policy "scoped insert person roles" on public.person_roles
  for insert to authenticated
  with check (public.can_access_person(person_id));

create policy "scoped update person roles" on public.person_roles
  for update to authenticated
  using (public.can_access_person(person_id))
  with check (public.can_access_person(person_id));

create policy "scoped delete person roles" on public.person_roles
  for delete to authenticated
  using (public.can_access_person(person_id));
