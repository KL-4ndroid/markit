import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(projectRoot, 'out');

const requiredFiles = [
  'index.html',
  'join/index.html',
  'markets/index.html',
  'markets/detail/index.html',
  'products/index.html',
  'products/detail/index.html',
  'manifest.json',
  'fonts/report/NotoSansTC-VariableFont_wght.ttf',
  'icons/icon-192x192.png',
  'logo-alpha.png',
];

const forbiddenPaths = [
  'api',
  'debug/sales-photo-evidence',
  'mobile-runtime-smoke',
  'markets/[id]',
  'products/[id]',
];

const forbiddenBundlePatterns = [
  { pattern: '@aws-sdk/client-s3', label: 'AWS SDK package name' },
  { pattern: 'R2_SECRET_ACCESS_KEY', label: 'R2 secret environment name' },
  { pattern: 'R2_ACCESS_KEY_ID', label: 'R2 access-key environment name' },
  { pattern: 'R2_ACCOUNT_ID', label: 'R2 account environment name' },
  { pattern: 'R2_BUCKET_NAME', label: 'R2 bucket environment name' },
  { pattern: 'SUPABASE_SECRET_KEY', label: 'Supabase server secret environment name' },
  { pattern: 'SUPABASE_SERVICE_ROLE_KEY', label: 'legacy Supabase service-role environment name' },
  { pattern: 'sb_secret_', label: 'Supabase server secret key marker' },
  { pattern: 'bff_claim_sale_photo_evidence_upload', label: 'server mutation RPC marker' },
];

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.txt', '.webmanifest', '.xml']);
const runtimeMarkupExtensions = new Set(['.css', '.html', '.json', '.txt', '.webmanifest', '.xml']);
const forbiddenRuntimeMarkupPatterns = [
  { pattern: '/_next/image', label: 'Next Image runtime endpoint' },
];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const failures = [];

if (!existsSync(outputRoot)) {
  failures.push('Missing out/ directory. Run the mobile build first.');
} else {
  for (const path of requiredFiles) {
    if (!existsSync(join(outputRoot, path))) failures.push(`Missing required artifact: out/${path}`);
  }

  for (const path of forbiddenPaths) {
    if (existsSync(join(outputRoot, path))) failures.push(`Forbidden mobile artifact exists: out/${path}`);
  }

  const files = walk(outputRoot);
  const textFiles = files.filter(path => textExtensions.has(extname(path).toLowerCase()));
  for (const path of textFiles) {
    const source = readFileSync(path, 'utf8');
    for (const { pattern, label } of forbiddenBundlePatterns) {
      if (source.includes(pattern)) {
        failures.push(`${label} found in out/${relative(outputRoot, path).replaceAll('\\', '/')}`);
      }
    }

    // The Next client library contains its default image endpoint as dormant
    // implementation text even when images.unoptimized is enabled. What would
    // make the export depend on a Next server is an emitted runtime URL in the
    // static markup/data/CSS, so check those deployable references separately.
    if (runtimeMarkupExtensions.has(extname(path).toLowerCase())) {
      for (const { pattern, label } of forbiddenRuntimeMarkupPatterns) {
        if (source.includes(pattern)) {
          failures.push(`${label} found in out/${relative(outputRoot, path).replaceAll('\\', '/')}`);
        }
      }
    }
  }

  const totalBytes = files.reduce((total, path) => total + statSync(path).size, 0);
  console.log(`Mobile static artifact: ${files.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log('PASS mobile static output boundary and asset verification');
