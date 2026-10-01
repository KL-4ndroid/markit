import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import { parse } from 'dotenv';

import {
  formatWebProductionConfigReport,
  resolveWebBuildMetadata,
  validatePaidWebProductionConfig,
  type WebProductionConfigEnv,
} from '../lib/deployment/web-production-config';

type CliOptions = {
  envFile: string | null;
  json: boolean;
};

function parseOptions(args: readonly string[]): CliOptions {
  let envFile: string | null = null;
  let json = false;

  for (const arg of args) {
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg.startsWith('--env-file=')) {
      const candidate = arg.slice('--env-file='.length).trim();
      if (!candidate || envFile) throw new Error('invalid_env_file_argument');
      envFile = candidate;
      continue;
    }
    throw new Error('unknown_argument');
  }

  return { envFile, json };
}

function loadEnvironment(options: CliOptions): WebProductionConfigEnv {
  if (!options.envFile) return process.env;
  const fromFile = parse(readFileSync(resolve(options.envFile)));
  return { ...fromFile, ...process.env };
}

function readPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
    version?: unknown;
  };
  return typeof packageJson.version === 'string' ? packageJson.version : '';
}

function readGitCommitSha(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: resolve('.'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

try {
  const options = parseOptions(process.argv.slice(2));
  const env = loadEnvironment(options);
  const buildMetadata = resolveWebBuildMetadata({
    env,
    packageVersion: readPackageVersion(),
    gitCommitSha: readGitCommitSha(),
    nowMs: Date.now(),
  });
  const report = validatePaidWebProductionConfig(env, { buildMetadata });
  process.stdout.write(`${options.json ? JSON.stringify(report, null, 2) : formatWebProductionConfigReport(report)}\n`);
  process.exitCode = report.ready ? 0 : 1;
} catch (error) {
  const code = error instanceof Error ? error.message : 'configuration_check_failed';
  process.stderr.write(`Production configuration check could not run: ${code}\n`);
  process.exitCode = 2;
}
