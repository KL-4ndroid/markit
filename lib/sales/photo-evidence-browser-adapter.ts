import {
  classifySalesPhotoEvidenceBrowserAdapterReadiness,
  classifySalesPhotoEvidenceBrowserCaptureFailure,
  type SalesPhotoEvidenceBrowserAdapterReadinessDecision,
  type SalesPhotoEvidenceBrowserCapabilitySnapshot,
  type SalesPhotoEvidenceBrowserCaptureFailureReason,
  type SalesPhotoEvidenceBrowserCaptureFailureClassification,
} from '@/lib/sales/photo-evidence-browser-adapter-contract';
import {
  classifySalesPhotoEvidenceCompressionOutput,
  planSalesPhotoEvidenceCaptureCompression,
  type SalesPhotoEvidenceImageVariantPlan,
} from '@/lib/sales/photo-evidence-capture-compression';
import type { LocalPendingSalesPhotoEvidenceCreation } from '@/lib/sales/photo-evidence-pending-creation';
import {
  putPendingSalesPhotoEvidencePayload,
  type LocalPendingSalesPhotoEvidencePayload,
  type SalesPhotoEvidencePendingPayloadVariant,
} from '@/lib/sales/photo-evidence-pending-payload-storage';

export type SalesPhotoEvidenceDecodedImage = {
  width: number;
  height: number;
  drawable: CanvasImageSource;
  close?: () => void;
};

export type CaptureAndStoreSalesPhotoEvidenceInput = {
  queueItem: LocalPendingSalesPhotoEvidenceCreation;
  source?: SalesPhotoEvidenceCaptureSource;
  now?: string | number | Date;
};

export type SalesPhotoEvidenceCaptureSource = 'camera' | 'library';

export type CaptureAndStoreSalesPhotoEvidenceDependencies = {
  getCapabilitySnapshot?: () => SalesPhotoEvidenceBrowserCapabilitySnapshot;
  selectFile?: (source: SalesPhotoEvidenceCaptureSource) => Promise<File | null>;
  decodeImage?: (file: File) => Promise<SalesPhotoEvidenceDecodedImage>;
  renderVariant?: (
    decoded: SalesPhotoEvidenceDecodedImage,
    variant: SalesPhotoEvidenceImageVariantPlan
  ) => Promise<SalesPhotoEvidencePendingPayloadVariant>;
  storePayload?: typeof putPendingSalesPhotoEvidencePayload;
};

export type CaptureAndStoreSalesPhotoEvidenceResult =
  | {
      action: 'capture_stored_locally';
      payload: LocalPendingSalesPhotoEvidencePayload;
      readiness: SalesPhotoEvidenceBrowserAdapterReadinessDecision;
    }
  | {
      action: 'capture_failed';
      failure: SalesPhotoEvidenceBrowserCaptureFailureClassification;
      readiness?: SalesPhotoEvidenceBrowserAdapterReadinessDecision;
    };

function fail(
  reason: SalesPhotoEvidenceBrowserCaptureFailureReason,
  readiness?: SalesPhotoEvidenceBrowserAdapterReadinessDecision
): CaptureAndStoreSalesPhotoEvidenceResult {
  return {
    action: 'capture_failed',
    failure: classifySalesPhotoEvidenceBrowserCaptureFailure(reason),
    readiness,
  };
}

function defaultCapabilitySnapshot(): SalesPhotoEvidenceBrowserCapabilitySnapshot {
  const hasDocument = typeof document !== 'undefined';
  const input = hasDocument ? document.createElement('input') : null;
  const canvas = hasDocument ? document.createElement('canvas') : null;

  return {
    secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    mediaCaptureAvailable: !!input && 'files' in input,
    imageProcessingAvailable: !!canvas && typeof canvas.getContext === 'function' && typeof canvas.toBlob === 'function',
  };
}

function selectFileWithInput(source: SalesPhotoEvidenceCaptureSource): Promise<File | null> {
  if (typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.setAttribute('capture', 'environment');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';

    const cleanup = () => {
      input.removeEventListener('change', handleChange);
      input.remove();
    };

    const handleChange = () => {
      const file = input.files?.[0] ?? null;
      cleanup();
      resolve(file);
    };

    input.addEventListener('change', handleChange, { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

function loadImageElement(file: File): Promise<SalesPhotoEvidenceDecodedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
        drawable: image,
        close: () => URL.revokeObjectURL(url),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image decode failed'));
    };
    image.src = url;
  });
}

async function decodeImageFile(file: File): Promise<SalesPhotoEvidenceDecodedImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      drawable: bitmap,
      close: () => bitmap.close(),
    };
  }

  if (typeof Image !== 'undefined' && typeof URL !== 'undefined') {
    return loadImageElement(file);
  }

  throw new Error('Image decode is unavailable');
}

function scaledDimensions(width: number, height: number, maxEdgePx: number): { width: number; height: number } {
  const largest = Math.max(width, height);
  if (largest <= maxEdgePx) return { width, height };

  const ratio = maxEdgePx / largest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), mimeType, quality);
  });
}

async function hashBlob(blob: Blob): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto is unavailable');
  }

  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
}

async function renderCanvasVariant(
  decoded: SalesPhotoEvidenceDecodedImage,
  variant: SalesPhotoEvidenceImageVariantPlan
): Promise<SalesPhotoEvidencePendingPayloadVariant> {
  if (typeof document === 'undefined') {
    throw new Error('Canvas rendering is unavailable');
  }

  const size = scaledDimensions(decoded.width, decoded.height, variant.maxEdgePx);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable');

  context.drawImage(decoded.drawable, 0, 0, size.width, size.height);

  let quality = variant.startQuality;
  while (quality >= variant.minQuality) {
    const blob = await canvasToBlob(canvas, variant.mimeType, quality);
    if (blob) {
      const output = {
        blob,
        mimeType: blob.type || variant.mimeType,
        fileSizeBytes: blob.size,
        width: size.width,
        height: size.height,
        contentHash: await hashBlob(blob),
      };
      const decision = classifySalesPhotoEvidenceCompressionOutput(output);
      if (decision.accepted) return output;
    }

    quality = Math.round((quality - 0.08) * 100) / 100;
  }

  throw new Error(`Unable to render ${variant.kind} within policy`);
}

async function renderImageWithFallback(
  decoded: SalesPhotoEvidenceDecodedImage,
  renderVariant: NonNullable<CaptureAndStoreSalesPhotoEvidenceDependencies['renderVariant']>,
  primary: SalesPhotoEvidenceImageVariantPlan,
  fallback: SalesPhotoEvidenceImageVariantPlan
): Promise<SalesPhotoEvidencePendingPayloadVariant> {
  try {
    return await renderVariant(decoded, primary);
  } catch {
    return renderVariant(decoded, fallback);
  }
}

export async function captureAndStoreSalesPhotoEvidenceWithFileInput(
  input: CaptureAndStoreSalesPhotoEvidenceInput,
  dependencies: CaptureAndStoreSalesPhotoEvidenceDependencies = {}
): Promise<CaptureAndStoreSalesPhotoEvidenceResult> {
  const getCapabilitySnapshot = dependencies.getCapabilitySnapshot ?? defaultCapabilitySnapshot;
  const readiness = classifySalesPhotoEvidenceBrowserAdapterReadiness(getCapabilitySnapshot());

  if (!readiness.ready) {
    return fail('adapter_unavailable', readiness);
  }

  const selectFile = dependencies.selectFile ?? selectFileWithInput;
  const decodeImage = dependencies.decodeImage ?? decodeImageFile;
  const renderVariant = dependencies.renderVariant ?? renderCanvasVariant;
  const storePayload = dependencies.storePayload ?? putPendingSalesPhotoEvidencePayload;

  let decoded: SalesPhotoEvidenceDecodedImage | null = null;

  try {
    const file = await selectFile(input.source ?? 'camera');
    if (!file) return fail('capture_cancelled', readiness);

    decoded = await decodeImage(file);
    const captureDecision = planSalesPhotoEvidenceCaptureCompression({
      mimeType: file.type,
      fileSizeBytes: file.size,
      width: decoded.width,
      height: decoded.height,
    });

    if (captureDecision.action !== 'prepare_compression') {
      return fail('output_policy_rejected', readiness);
    }

    const image = await renderImageWithFallback(
      decoded,
      renderVariant,
      captureDecision.plan.primary,
      captureDecision.plan.fallback
    );
    const thumbnail = await renderImageWithFallback(
      decoded,
      renderVariant,
      captureDecision.plan.thumbnail,
      { ...captureDecision.plan.thumbnail, mimeType: 'image/jpeg' }
    );

    const payload = await storePayload({
      queueItem: input.queueItem,
      image,
      thumbnail,
      now: input.now,
    });

    return {
      action: 'capture_stored_locally',
      payload,
      readiness,
    };
  } catch {
    return fail(decoded ? 'compression_failed' : 'source_decode_failed', readiness);
  } finally {
    decoded?.close?.();
  }
}
