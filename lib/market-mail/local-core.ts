import {
  BRIDGE_SCHEMA_VERSION,
  CORE_VERSION,
  ENGINE_CONTRACT_VERSION,
  capabilities,
  gmailDryRun,
  intakeGmailMessage,
  parseGmailMessage,
  type GmailDryRunRequest,
  type GmailDryRunResponse,
  type GmailMessageEnvelope,
  type IntakeResponse,
  type ParseResult,
} from '@market-mail/core';

export const MARKIT_MARKET_MAIL_CONTRACT_VERSION = '1.0' as const;

function assertCompatibleCore(): void {
  if (ENGINE_CONTRACT_VERSION !== MARKIT_MARKET_MAIL_CONTRACT_VERSION) {
    throw new Error(
      `Unsupported @market-mail/core contract ${ENGINE_CONTRACT_VERSION}; expected ${MARKIT_MARKET_MAIL_CONTRACT_VERSION}.`,
    );
  }
  if (BRIDGE_SCHEMA_VERSION !== '1.0') {
    throw new Error(`Unsupported Market Mail bridge schema ${BRIDGE_SCHEMA_VERSION}.`);
  }

  const runtime = capabilities();
  if (runtime.network_required !== false) {
    throw new Error('@market-mail/core must remain local and network-free inside Markit.');
  }
  if (runtime.raw_email_persistence_required !== false) {
    throw new Error('@market-mail/core must not require raw email persistence.');
  }
  if (runtime.gmail_input.format !== 'users.messages.get(format=full)') {
    throw new Error(`Unsupported Gmail input format: ${runtime.gmail_input.format}.`);
  }
}

export function getMarketMailRuntimeInfo() {
  assertCompatibleCore();
  return {
    coreVersion: CORE_VERSION,
    engineContractVersion: ENGINE_CONTRACT_VERSION,
    bridgeSchemaVersion: BRIDGE_SCHEMA_VERSION,
    capabilities: capabilities(),
  } as const;
}

export function parseLocalGmailMessage(message: GmailMessageEnvelope): ParseResult {
  assertCompatibleCore();
  return parseGmailMessage(message);
}

export function intakeLocalGmailMessage(input: {
  account_key: string;
  message: GmailMessageEnvelope;
  already_processed?: boolean;
  resolution_status?: Parameters<typeof intakeGmailMessage>[0]['resolution_status'];
  resolved_market_id?: string | null;
}): IntakeResponse {
  assertCompatibleCore();
  return intakeGmailMessage(input);
}

export function dryRunLocalGmailBatch(request: GmailDryRunRequest): GmailDryRunResponse {
  assertCompatibleCore();
  return gmailDryRun(request);
}

export type {
  GmailDryRunRequest,
  GmailDryRunResponse,
  GmailMessageEnvelope,
  IntakeResponse,
  ParseResult,
};
