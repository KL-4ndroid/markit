import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import {
  validateSalesPhotoEvidenceR2ServerConfig,
  validateSalesPhotoEvidenceR2UploadObjectInput,
  type SalesPhotoEvidenceR2ServerConfig,
  type SalesPhotoEvidenceR2UploadAdapter,
  type SalesPhotoEvidenceR2UploadObjectBody,
} from '@/lib/sales/photo-evidence-r2-upload-adapter';

export type SalesPhotoEvidenceR2ServerEnv = Record<string, string | undefined>;

export type SalesPhotoEvidenceR2PutObjectClient = {
  send(command: PutObjectCommand): Promise<{ ETag?: string }>;
};

export type CreateCloudflareR2SalesPhotoEvidenceUploadAdapterInput = {
  config: SalesPhotoEvidenceR2ServerConfig;
  client?: SalesPhotoEvidenceR2PutObjectClient;
};

function getR2Endpoint(config: SalesPhotoEvidenceR2ServerConfig): string {
  return config.endpoint ?? `https://${config.accountId}.r2.cloudflarestorage.com`;
}

function createDefaultR2Client(config: SalesPhotoEvidenceR2ServerConfig): SalesPhotoEvidenceR2PutObjectClient {
  return new S3Client({
    region: 'auto',
    endpoint: getR2Endpoint(config),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

async function toUint8Array(body: SalesPhotoEvidenceR2UploadObjectBody): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  return new Uint8Array(await body.arrayBuffer());
}

export function createSalesPhotoEvidenceR2ServerConfigFromEnv(
  env: SalesPhotoEvidenceR2ServerEnv
): ReturnType<typeof validateSalesPhotoEvidenceR2ServerConfig> {
  return validateSalesPhotoEvidenceR2ServerConfig({
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    endpoint: env.R2_ENDPOINT,
  });
}

export function createCloudflareR2SalesPhotoEvidenceUploadAdapter(
  input: CreateCloudflareR2SalesPhotoEvidenceUploadAdapterInput
): SalesPhotoEvidenceR2UploadAdapter {
  const client = input.client ?? createDefaultR2Client(input.config);

  return {
    async uploadObject(uploadInput) {
      const invalid = validateSalesPhotoEvidenceR2UploadObjectInput(uploadInput);
      if (invalid) return invalid;

      try {
        const result = await client.send(new PutObjectCommand({
          Bucket: input.config.bucketName,
          Key: uploadInput.key,
          Body: await toUint8Array(uploadInput.body),
          ContentType: uploadInput.contentType,
          ContentLength: uploadInput.contentLength,
        }));

        return {
          ok: true,
          key: uploadInput.key,
          etag: result.ETag,
        };
      } catch (error) {
        return {
          ok: false,
          key: uploadInput.key,
          code: 'r2_upload_failed',
          message: 'Sales photo evidence R2 upload failed.',
        };
      }
    },
  };
}
