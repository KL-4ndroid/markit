import type { UserRole } from '@/hooks/useUserRole';

/** Retaining a foreign cache record never makes its current reader the owner. */
export function canReadCachedEntity(
  entity: { owner_id?: string | null },
  actorId: string | null | undefined,
  role: UserRole,
): boolean {
  if (!actorId || !entity.owner_id) return false;
  if (entity.owner_id === actorId) return !role.isStaff;
  return role.isStaff && role.ownerId === entity.owner_id && role.permissions?.can_view === true;
}
