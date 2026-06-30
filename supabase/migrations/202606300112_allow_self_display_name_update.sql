create or replace function public.enforce_profile_role_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  actor_role public.admin_role;
  active_owner_count integer;
begin
  actor_id := auth.uid();
  actor_role := public.current_admin_role();
  select count(*) from public.profiles where role = 'owner' and deleted_at is null into active_owner_count;

  if tg_op = 'INSERT' then
    if new.role = 'viewer' then
      return new;
    end if;
    if actor_role = 'owner' and new.role in ('viewer', 'editor', 'admin') then
      return new;
    end if;
    if actor_role = 'admin' and new.role in ('viewer', 'editor') then
      return new;
    end if;
    raise exception 'Insufficient permission to create profile role';
  end if;

  if tg_op = 'UPDATE'
    and actor_id = old.id
    and new.id is not distinct from old.id
    and new.email is not distinct from old.email
    and new.role is not distinct from old.role
    and new.created_at is not distinct from old.created_at
    and new.deleted_at is not distinct from old.deleted_at
    and new.last_login_at is not distinct from old.last_login_at
    and new.last_login_ip_hash is not distinct from old.last_login_ip_hash
    and new.last_login_user_agent is not distinct from old.last_login_user_agent
    and new.last_login_device is not distinct from old.last_login_device
  then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and actor_id = old.id
    and new.id is not distinct from old.id
    and new.email is not distinct from old.email
    and new.role is not distinct from old.role
    and new.display_name is not distinct from old.display_name
    and new.created_at is not distinct from old.created_at
    and new.deleted_at is not distinct from old.deleted_at
  then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if new.role = 'owner' then
      raise exception 'Owner role cannot be assigned from user management';
    end if;

    if old.role = 'owner' and actor_id = old.id then
      raise exception 'Owner cannot downgrade self';
    end if;

    if old.role = 'owner' and old.deleted_at is null and active_owner_count <= 1 then
      raise exception 'Cannot downgrade the last active owner';
    end if;

    if actor_role = 'owner' and old.role <> 'owner' then
      return new;
    end if;

    if actor_role = 'admin' and old.role in ('viewer', 'editor') and new.role in ('viewer', 'editor') then
      return new;
    end if;

    raise exception 'Insufficient permission to modify profile role';
  end if;

  if tg_op = 'UPDATE' and new.deleted_at is distinct from old.deleted_at then
    if old.deleted_at is null and new.deleted_at is not null and actor_id = old.id then
      raise exception 'User cannot disable self';
    end if;

    if old.role = 'owner' and old.deleted_at is null and new.deleted_at is not null and active_owner_count <= 1 then
      raise exception 'Cannot disable the last active owner';
    end if;

    if actor_role = 'owner' and old.role <> 'owner' then
      return new;
    end if;

    if actor_role = 'admin' and old.role in ('viewer', 'editor') then
      return new;
    end if;

    raise exception 'Insufficient permission to change profile status';
  end if;

  if tg_op = 'UPDATE' then
    if actor_role = 'owner' and old.role <> 'owner' then
      return new;
    end if;

    if actor_role = 'admin' and old.role in ('viewer', 'editor') then
      return new;
    end if;

    raise exception 'Insufficient permission to update profile';
  end if;

  return new;
end;
$$;
