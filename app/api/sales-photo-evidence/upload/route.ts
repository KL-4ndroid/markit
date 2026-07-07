import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DISABLED_RESPONSE_BODY = Object.freeze({
  ok: false,
  code: 'sales_photo_evidence_upload_disabled',
  message: 'Sales photo evidence upload is not enabled yet.',
});

function disabledUploadResponse(): NextResponse {
  return NextResponse.json(DISABLED_RESPONSE_BODY, {
    status: 501,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(): Promise<NextResponse> {
  return disabledUploadResponse();
}

export async function POST(): Promise<NextResponse> {
  return disabledUploadResponse();
}

export async function PUT(): Promise<NextResponse> {
  return disabledUploadResponse();
}

export async function PATCH(): Promise<NextResponse> {
  return disabledUploadResponse();
}

export async function DELETE(): Promise<NextResponse> {
  return disabledUploadResponse();
}
