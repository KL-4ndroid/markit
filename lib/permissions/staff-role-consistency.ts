import type { StaffRole } from '@/types/staff';

/** Read-only diagnostic. Never derives effective access or repairs stored permissions. */
export function staffRolePermissionsMatch(role: StaffRole | null | undefined, permissions: unknown): boolean {
  if (role !== 'viewer' && role !== 'operator' && role !== 'manager') return false;
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) return false;
  const value = permissions as Record<string, unknown>;
  return value.can_view === true
    && value.can_edit === (role !== 'viewer')
    && value.infoLevel === (role === 'viewer' ? 0 : 2);
}
