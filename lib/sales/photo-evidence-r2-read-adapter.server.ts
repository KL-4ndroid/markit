import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
  send(command: GetObjectCommand): Promise<{ Body?: unknown; ContentType?: string }>;
};

export type CreateCloudflareR2SalesPhotoEvidenceReadAdapterInput = {
  env: SalesPhotoEvidenceR2ServerEnv;
  client?: SalesPhotoEvidenceR2GetObjectClient;
};

async function bodyToUint8Array(body: unknown): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  if (body instanceof Blob) return new Uint8Array(await body.arrayBuffer());
  if (body && typeof body === 'object' && 'transformToByteArray' in body) {
    const transformed = await (body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
    return transformed;
  }
  if (body && typeof body === 'object' && Symbol.asyncIterator in body) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
      if (typeof chunk === 'string') {
        chunks.push(new TextEncoder().encode(chunk));
      } else {
        chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
      }
    }
    const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
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
        return {
          ok: true,
          body: await bodyToUint8Array(response.Body),
          contentType: response.ContentType ?? 'application/octet-stream',
        };
      } catch (error) {
        return {
          ok: false,
          code: 'r2_read_failed',
          message: error instanceof Error ? error.message : 'R2 read failed.',
        };
      }
    },
  };
}
