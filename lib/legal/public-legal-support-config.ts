export type PublicLegalSupportEnv = Record<string, string | undefined>;

export type PublicLegalSupportConfig = {
  supportEmail: string | null;
  effectiveDate: string | null;
  operatorName: string | null;
  operatorRepresentative: string | null;
  operatorAddress: string | null;
  supportContactReady: boolean;
  operatorIdentityReady: boolean;
  policyPublicationReady: boolean;
};

const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const PLACEHOLDER_PATTERN = /(?:your[-_ ]|example|placeholder|change[-_ ]?me|待填|尚未設定)/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

function value(env: PublicLegalSupportEnv, name: string): string {
  return env[name]?.trim() ?? '';
}

function boundedPublicText(input: string, minimumLength: number, maximumLength: number): string | null {
  if (
    input.length < minimumLength
    || input.length > maximumLength
    || CONTROL_CHARACTER_PATTERN.test(input)
    || PLACEHOLDER_PATTERN.test(input)
  ) {
    return null;
  }
  return input;
}

export function normalizePublicSupportEmail(input: string | undefined): string | null {
  const candidate = input?.trim() ?? '';
  if (
    candidate.length < 6
    || candidate.length > 254
    || CONTROL_CHARACTER_PATTERN.test(candidate)
    || PLACEHOLDER_PATTERN.test(candidate)
    || !EMAIL_PATTERN.test(candidate)
  ) {
    return null;
  }
  return candidate.toLowerCase();
}

export function isValidIsoCalendarDate(input: string | undefined): boolean {
  const candidate = input?.trim() ?? '';
  const match = ISO_DATE_PATTERN.exec(candidate);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2020
    && year <= 2100
    && date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function resolvePublicLegalSupportConfig(
  env: PublicLegalSupportEnv,
): PublicLegalSupportConfig {
  const supportEmail = normalizePublicSupportEmail(env.NEXT_PUBLIC_SUPPORT_EMAIL);
  const effectiveDateValue = value(env, 'NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE');
  const effectiveDate = isValidIsoCalendarDate(effectiveDateValue) ? effectiveDateValue : null;
  const operatorName = boundedPublicText(
    value(env, 'NEXT_PUBLIC_SERVICE_OPERATOR_NAME'),
    2,
    120,
  );
  const operatorRepresentative = boundedPublicText(
    value(env, 'NEXT_PUBLIC_SERVICE_OPERATOR_REPRESENTATIVE'),
    2,
    80,
  );
  const operatorAddress = boundedPublicText(
    value(env, 'NEXT_PUBLIC_SERVICE_OPERATOR_ADDRESS'),
    6,
    240,
  );
  const supportContactReady = supportEmail !== null;
  const operatorIdentityReady = operatorName !== null
    && operatorRepresentative !== null
    && operatorAddress !== null;
  const legalApprovalReady = isValidIsoCalendarDate(env.LEGAL_POLICY_APPROVED_DATE);

  return {
    supportEmail,
    effectiveDate,
    operatorName,
    operatorRepresentative,
    operatorAddress,
    supportContactReady,
    operatorIdentityReady,
    policyPublicationReady: supportContactReady
      && operatorIdentityReady
      && effectiveDate !== null
      && legalApprovalReady,
  };
}

export function buildSupportMailto(
  supportEmail: string | null,
  topic: string,
): string | null {
  if (!supportEmail) return null;
  const boundedTopic = boundedPublicText(topic.trim(), 1, 80);
  if (!boundedTopic) return `mailto:${supportEmail}`;
  return `mailto:${supportEmail}?subject=${encodeURIComponent(`[Feria support] ${boundedTopic}`)}`;
}
