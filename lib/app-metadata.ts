import packageJson from '@/package.json';

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version;
const appBuildTime = process.env.NEXT_PUBLIC_APP_BUILD_TIME || '';
const appCommitSha = process.env.NEXT_PUBLIC_APP_COMMIT_SHA || '';
const appVersionLabel = appCommitSha ? `${appVersion} (${appCommitSha})` : appVersion;

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '未知';
  }

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Taipei',
  }).format(date);
}

export const APP_METADATA = {
  name: 'Féria',
  displayName: 'Féria - 出攤筆記',
  version: appVersion,
  commitSha: appCommitSha,
  versionLabel: appVersionLabel,
  buildTime: appBuildTime,
  lastUpdatedLabel: formatDateTime(appBuildTime),
};
