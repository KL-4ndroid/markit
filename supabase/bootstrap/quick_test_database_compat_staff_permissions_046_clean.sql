-- BoothBook / Markit quick test database compatibility patch
-- Clean bootstrap version of migration 046_align_staff_permissions_with_role.
--
-- This preserves the intended 046 effects:
--   - permissions default includes infoLevel=0
--   - existing staff_relationships permissions align to role
--   - accept_invitation_and_bind returns viewer/L0 permissions
--
-- It avoids the archived function body's v_* variable names because some SQL
-- Editor bootstrap executions have parsed v_owner_id as a relation outside the
-- plpgsql body after earlier errors.

alter table public.staff_relationships
  alter column permissions set default
  '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb;

update public.staff_relationships
set permissions = jsonb_build_object(
      'can_view', true,
      'can_edit', (role in ('operator', 'manager')),
      'infoLevel', case
        when role = 'viewer' then 0
        when role in ('operator', 'manager') then 2
        else 0
      end
    )
where role in ('viewer', 'operator', 'manager');

create or replace function public.accept_invitation_and_bind(
  p_token text,
  p_staff_id uuid
)
returns table (
  success boolean,
  message text,
  relationship_id uuid
)
language plpgsql
security definer
set search_path = public
as $accept_invitation_and_bind$
declare
  invitation_owner_id uuid;
  invitation_expires_at timestamptz;
  accepted_relationship_id uuid;
  authenticated_staff_id uuid;
  authenticated_staff_email text;
  existing_owner_count integer;
begin
  authenticated_staff_id := auth.uid();

  if authenticated_staff_id is null then
    return query select false, 'Authentication required'::text, null::uuid;
    return;
  end if;

  if p_staff_id is not null and p_staff_id <> authenticated_staff_id then
    return query select false, 'Authenticated user does not match staff id'::text, null::uuid;
    return;
  end if;

  if p_token is null or length(trim(p_token)) < 16 then
    return query select false, 'Invalid invitation token'::text, null::uuid;
    return;
  end if;

  select si.owner_id, si.expires_at
  into invitation_owner_id, invitation_expires_at
  from public.staff_invitations si
  where si.token = p_token;

  if not found then
    return query select false, 'Invalid invitation token'::text, null::uuid;
    return;
  end if;

  if invitation_expires_at < now() then
    return query select false, 'Invitation has expired'::text, null::uuid;
    return;
  end if;

  if invitation_owner_id = authenticated_staff_id then
    return query select false, 'Owner cannot accept their own invitation'::text, null::uuid;
    return;
  end if;

  select count(*)
  into existing_owner_count
  from public.staff_relationships sr
  where sr.staff_id = authenticated_staff_id
    and sr.status in ('pending', 'active');

  if existing_owner_count > 0 then
    return query select false, 'This user is already bound to an owner'::text, null::uuid;
    return;
  end if;

  select u.email
  into authenticated_staff_email
  from auth.users u
  where u.id = authenticated_staff_id;

  insert into public.staff_relationships (
    owner_id,
    staff_id,
    staff_email,
    status,
    accepted_at,
    permissions
  )
  values (
    invitation_owner_id,
    authenticated_staff_id,
    authenticated_staff_email,
    'active',
    now(),
    '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb
  )
  on conflict (owner_id, staff_id)
  do update set
    staff_email = excluded.staff_email,
    status = 'active',
    accepted_at = now(),
    permissions = excluded.permissions,
    updated_at = now()
  returning id into accepted_relationship_id;

  insert into public.market_members (
    market_id,
    user_id,
    role,
    joined_at
  )
  select
    m.id,
    authenticated_staff_id,
    'staff',
    now()
  from public.markets m
  where m.owner_id = invitation_owner_id
    and m.status in ('ongoing', 'registered', 'accepted', 'paid')
    and not exists (
      select 1
      from public.market_members mm
      where mm.market_id = m.id
        and mm.user_id = authenticated_staff_id
    );

  delete from public.staff_invitations si
  where si.token = p_token;

  return query select true, 'Invitation accepted'::text, accepted_relationship_id;
end;
$accept_invitation_and_bind$;

revoke all on function public.accept_invitation_and_bind(text, uuid) from public, anon;
grant execute on function public.accept_invitation_and_bind(text, uuid) to authenticated;
