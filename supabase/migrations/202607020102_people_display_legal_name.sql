alter table public.people
  add column if not exists display_name text,
  add column if not exists legal_name text;

update public.people
set display_name = coalesce(nullif(trim(display_name), ''), nullif(trim(name), ''), '未命名客戶')
where display_name is null or trim(display_name) = '';

alter table public.people
  alter column display_name set not null;

create or replace function public.sync_people_display_name()
returns trigger
language plpgsql
as $$
begin
  new.display_name := nullif(trim(new.display_name), '');
  if new.display_name is null then
    new.display_name := nullif(trim(new.name), '');
  end if;
  if new.display_name is null then
    raise exception 'display_name is required';
  end if;

  new.legal_name := nullif(trim(new.legal_name), '');
  new.name := new.display_name;
  return new;
end;
$$;

drop trigger if exists people_sync_display_name on public.people;
create trigger people_sync_display_name before insert or update on public.people
for each row execute function public.sync_people_display_name();

create index if not exists people_display_name_idx
  on public.people(display_name);

create index if not exists people_legal_name_idx
  on public.people(legal_name);
