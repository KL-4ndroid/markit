-- BoothBook / Markit quick test database compatibility patch
-- Clean bootstrap version of migration 043_staff_role_foundation.

alter table public.staff_relationships
  add column if not exists role text not null default 'viewer';

do $staff_role_check$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'staff_relationships_role_check'
  ) then
    alter table public.staff_relationships
      add constraint staff_relationships_role_check
      check (role in ('viewer', 'operator', 'manager'));
  end if;
end;
$staff_role_check$;

update public.staff_relationships
set role = case
  when coalesce((permissions->>'can_edit')::boolean, false) = true then 'operator'
  else 'viewer'
end;

create or replace function public.update_staff_role(
  p_relationship_id uuid,
  p_role text
)
returns public.staff_relationships
language plpgsql
security definer
set search_path = public
as $update_staff_role$
declare
  relationship_owner_id uuid;
  relationship_staff_id uuid;
  relationship_status text;
  updated_relationship public.staff_relationships%rowtype;
begin
  if p_role not in ('viewer', 'operator', 'manager') then
    raise exception 'Invalid role: %. Must be viewer, operator, or manager.', p_role
      using errcode = '22023';
  end if;

  select sr.owner_id, sr.staff_id, sr.status
  into relationship_owner_id, relationship_staff_id, relationship_status
  from public.staff_relationships sr
  where sr.id = p_relationship_id;

  if not found then
    raise exception 'Staff relationship not found: %', p_relationship_id
      using errcode = 'P0002';
  end if;

  if relationship_owner_id <> auth.uid() then
    raise exception 'Not authorized: you are not the owner of this staff relationship.'
      using errcode = '42501';
  end if;

  if relationship_status <> 'active' then
    raise exception 'Cannot change role for % relationship; only active relationships are editable.', relationship_status
      using errcode = 'P0001';
  end if;

  if relationship_staff_id = auth.uid() then
    raise exception 'Not authorized: staff cannot change their own role.'
      using errcode = '42501';
  end if;

  update public.staff_relationships
     set role = p_role,
         permissions = jsonb_build_object(
           'can_view', true,
           'can_edit', (p_role in ('operator', 'manager')),
           'infoLevel', case
                          when p_role = 'viewer' then 0
                          when p_role in ('operator', 'manager') then 2
                        end
         )
   where id = p_relationship_id
   returning * into updated_relationship;

  return updated_relationship;
end;
$update_staff_role$;

revoke execute on function public.update_staff_role(uuid, text) from public, anon;
grant execute on function public.update_staff_role(uuid, text) to authenticated;
