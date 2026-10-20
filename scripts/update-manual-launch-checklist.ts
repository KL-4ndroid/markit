import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  MANUAL_LAUNCH_CHECKLIST_OUTPUT_PATH,
  renderManualLaunchChecklist,
  summarizeManualLaunchChecklist,
} from '../lib/deployment/manual-launch-checklist';
import { parseLaunchExecutionPlan } from '../lib/deployment/launch-execution-plan';
import {
  MANUAL_LAUNCH_ITEM_STATUS_PATH,
  parseManualLaunchItemStatusDocument,
} from '../lib/deployment/manual-launch-item-status';
import { parseNativeExternalAccountReadiness } from '../lib/deployment/native-external-account-readiness';
import { parseNativeLaunchGateDocument } from '../lib/deployment/native-launch-gate';
import { parseWebLaunchGateDocument } from '../lib/deployment/web-launch-gate';

const PLAN_PATH = 'docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json';
const WEB_GATES_PATH = 'docs/WEB_LAUNCH_GATES_2026_08_01.json';
const NATIVE_GATES_PATH = 'docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json';
const EXTERNAL_PATH = 'docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.json';

class ManualChecklistCliError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as unknown;
}

function main(): void {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
      throw new ManualChecklistCliError('argument_invalid');
    }
    const web = parseWebLaunchGateDocument(readJson(WEB_GATES_PATH));
    const native = parseNativeLaunchGateDocument(readJson(NATIVE_GATES_PATH));
    const plan = parseLaunchExecutionPlan(readJson(PLAN_PATH), web, native);
    const external = parseNativeExternalAccountReadiness(readJson(EXTERNAL_PATH));
    const itemStatus = parseManualLaunchItemStatusDocument(readJson(MANUAL_LAUNCH_ITEM_STATUS_PATH));
    const rendered = renderManualLaunchChecklist(plan, external, itemStatus);
    const summary = summarizeManualLaunchChecklist(plan, external, itemStatus);
    const outputPath = resolve(MANUAL_LAUNCH_CHECKLIST_OUTPUT_PATH);

    if (args[0] === '--check') {
      let current: string;
      try {
        current = readFileSync(outputPath, 'utf8');
      } catch {
        throw new ManualChecklistCliError('checklist_missing');
      }
      if (current !== rendered) throw new ManualChecklistCliError('checklist_out_of_date');
    } else {
      writeFileSync(outputPath, rendered, 'utf8');
    }

    process.stdout.write(`${JSON.stringify({
      ok: true,
      mode: args[0] === '--check' ? 'check' : 'update',
      output: MANUAL_LAUNCH_CHECKLIST_OUTPUT_PATH,
      summary,
    })}\n`);
    process.exitCode = 0;
  } catch (error) {
    const code = error instanceof ManualChecklistCliError
      ? error.code
      : 'manual_launch_checklist_failed';
    process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
    process.exitCode = 1;
  }
}

main();
