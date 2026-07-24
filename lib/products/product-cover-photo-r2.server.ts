import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function createClient(env: Record<string, string | undefined>) {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = env.R2_BUCKET_NAME?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    bucket,
    client: new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function putProductCoverPhotoObject(key: string, blob: Blob, env: Record<string, string | undefined> = process.env) {
  const r2 = createClient(env);
  if (!r2) return false;
  await r2.client.send(new PutObjectCommand({ Bucket: r2.bucket, Key: key, Body: new Uint8Array(await blob.arrayBuffer()), ContentType: blob.type, ContentLength: blob.size }));
  return true;
}

export async function deleteProductCoverPhotoObject(key: string | null | undefined, env: Record<string, string | undefined> = process.env) {
  if (!key) return true;
  const r2 = createClient(env);
  if (!r2) return false;
  await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }));
  return true;
}

export async function getProductCoverPhotoObject(key: string, maxBytes: number, env: Record<string, string | undefined> = process.env) {
  const r2 = createClient(env);
  if (!r2) return null;
  const result = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: key }));
  if (!result.Body || !result.ContentType || !['image/webp', 'image/jpeg'].includes(result.ContentType)) return null;
  if (result.ContentLength && result.ContentLength > maxBytes) return null;
  const body = await result.Body.transformToByteArray();
  if (body.byteLength < 1 || body.byteLength > maxBytes) return null;
  return { body, contentType: result.ContentType };
}
