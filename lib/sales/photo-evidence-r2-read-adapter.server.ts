import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SALES_PHOTO_EVIDENCE_MAX_FILE_SIZE_BYTES } from '@/lib/sales/photo-evidence-model';
import {
  createSalesPhotoEvidenceR2ServerConfigFromEnv,
  type SalesPhotoEvidenceR2ServerEnv,
} from '@/lib/sales/photo-evidence-r2-upload-adapter.server';

export type SalesPhotoEvidenceR2ReadResult =
  | {
      ok: true;
      body: Uint8Array;
      contentType: string;
    }
  | {
      ok: false;
      code: 'r2_read_failed';
      message: string;
    };

export type SalesPhotoEvidenceR2ReadAdapter = {
  readObject(input: { key: string }): Promise<SalesPhotoEvidenceR2ReadResult>;
};

export type SalesPhotoEvidenceR2GetObjectClient = {
  send(command: GetObjectCommand): Promise<{
    Body?: unknown;
    ContentType?: string;
    ContentLength?: number;
  }>;
};

export type CreateCloudflareR2SalesPhotoEvidenceReadAdapterInput = {
  env: SalesPhotoEvidenceR2ServerEnv;
  client?: SalesPhotoEvidenceR2GetObjectClient;
};

function assertAllowedBodySize(size: number): void {
  if (size <= 0 || size > SALES_PHOTO_EVIDENCE_MAX_FILE_SIZE_BYTES) {
    throw new Error('R2 response body size is outside the evidence limit.');
  }
}

async function bodyToUint8Array(body: unknown): Promise<Uint8Array> {
  if (body instanceof Uint8Array) {
    assertAllowedBodySize(body.byteLength);
    return body;
  }
  if (body instanceof Blob) {
    assertAllowedBodySize(body.size);
    return new Uint8Array(await body.arrayBuffer());
  }
  if (body && typeof body === 'object' && 'transformToByteArray' in body) {
    const transformed = await (body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
    assertAllowedBodySize(transformed.byteLength);
    return transformed;
  }
  if (body && typeof body === 'object' && Symbol.asyncIterator in body) {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
      if (typeof chunk === 'string') {
        const encoded = new TextEncoder().encode(chunk);
        total += encoded.byteLength;
        assertAllowedBodySize(total);
        chunks.push(encoded);
      } else {
        const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
        total += bytes.byteLength;
        assertAllowedBodySize(total);
        chunks.push(bytes);
      }
    }
    assertAllowedBodySize(total);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  throw new Error('Unsupported R2 response body.');
}

export function createCloudflareR2SalesPhotoEvidenceReadAdapter(
  input: CreateCloudflareR2SalesPhotoEvidenceReadAdapterInput
): SalesPhotoEvidenceR2ReadAdapter | null {
  const configResult = createSalesPhotoEvidenceR2ServerConfigFromEnv(input.env);
  if (!configResult.ok) return null;
  const { config } = configResult;

  const client = input.client ?? new S3Client({
    region: 'auto',
    endpoint: config.endpoint ?? `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async readObject({ key }) {
      try {
        const response = await client.send(new GetObjectCommand({
          Bucket: config.bucketName,
          Key: key,
        }));
        if (
          response.ContentType !== 'image/webp'
          && response.ContentType !== 'image/jpeg'
        ) {
          throw new Error('R2 response content type is outside the evidence contract.');
        }
        if (response.ContentLength !== undefined) {
          assertAllowedBodySize(response.ContentLength);
        }
        return {
          ok: true,
          body: await bodyToUint8Array(response.Body),
          contentType: response.ContentType,
        };
      } catch (error) {
        return {
          ok: false,
          code: 'r2_read_failed',
          message: 'Sales photo evidence R2 read failed.',
        };
      }
    },
  };
}
