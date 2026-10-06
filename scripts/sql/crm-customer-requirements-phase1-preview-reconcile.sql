begin;

drop policy if exists "authenticated read people activities" on public.people_activities;
drop policy if exists "staff read people activities" on public.people_activities;
drop policy if exists "staff insert people activities" on public.people_activities;
drop policy if exists "staff update people activities" on public.people_activities;
drop policy if exists "scoped read people activities" on public.people_activities;
drop policy if exists "scoped insert people activities" on public.people_activities;
drop policy if exists "scoped update people activities" on public.people_activities;

create policy "scoped read people activities" on public.people_activities for select to authenticated
  using (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id));
create policy "scoped insert people activities" on public.people_activities for insert to authenticated
  with check (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id) and created_by=auth.uid());
create policy "scoped update people activities" on public.people_activities for update to authenticated
  using (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id))
  with check (public.is_admin_role(array['editor','admin','owner']) and public.can_access_person(person_id));

insert into supabase_migrations.schema_migrations(version, name, statements)
values ('202608020201', 'crm_customer_requirements_phase_1', array[]::text[])
on conflict (version) do update set name=excluded.name;

commit;
