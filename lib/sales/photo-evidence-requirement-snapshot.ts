/** Immutable sale-time policy. Absence (including old clients) means unknown. */
export type SalesPhotoEvidenceRequirementSnapshot = {
  version: 1;
  required: boolean;
  ownerId: string;
  marketId: string;
  capturedByStaffId: string | null;
  saleCompletedAt: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readSalesPhotoEvidenceRequirementSnapshot(
  value: unknown
): SalesPhotoEvidenceRequirementSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.version !== 1 || typeof row.required !== 'boolean'
    || typeof row.ownerId !== 'string' || !UUID.test(row.ownerId)
    || typeof row.marketId !== 'string' || !UUID.test(row.marketId)
    || (row.capturedByStaffId !== null && (typeof row.capturedByStaffId !== 'string' || !UUID.test(row.capturedByStaffId)))
    || typeof row.saleCompletedAt !== 'string' || !Number.isFinite(Date.parse(row.saleCompletedAt))) return null;
  return {
    version: 1, required: row.required, ownerId: row.ownerId, marketId: row.marketId,
    capturedByStaffId: row.capturedByStaffId as string | null,
    saleCompletedAt: new Date(row.saleCompletedAt).toISOString(),
  };
}
