import { notFound } from 'next/navigation';
import { SalesPhotoEvidenceTestWorkbench } from '@/components/markets/SalesPhotoEvidenceTestWorkbench';

// The `.web.tsx` route extension keeps this server-only diagnostic out of mobile static exports.
export const dynamic = 'force-dynamic';

function isTestPageEnabled(): boolean {
  const deploymentEnv = (process.env.VERCEL_ENV ?? process.env.APP_ENV ?? process.env.NODE_ENV)?.toLowerCase();

  if (process.env.NODE_ENV !== 'production') return true;
  if (deploymentEnv === 'production') return false;

  return (
    (deploymentEnv === 'staging' || deploymentEnv === 'preview') &&
    process.env.SALES_PHOTO_EVIDENCE_TEST_PAGE_ENABLED === '1'
  );
}

export default function SalesPhotoEvidenceTestPage() {
  if (!isTestPageEnabled()) notFound();

  return (
    <SalesPhotoEvidenceTestWorkbench
      routeReadiness={{
        metadataClaim: process.env.SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED === '1',
        r2Upload: process.env.SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED === '1',
        imageRead: process.env.SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ENABLED === '1',
        r2Configured: Boolean(
          process.env.R2_ACCOUNT_ID &&
          process.env.R2_ACCESS_KEY_ID &&
          process.env.R2_SECRET_ACCESS_KEY &&
          process.env.R2_BUCKET_NAME
        ),
      }}
    />
  );
}
