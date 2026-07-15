import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const indexPage = read('app/settings/page.tsx');
const accountPage = read('app/settings/account/page.tsx');
const accountPanel = read('components/settings/AccountSyncPanel.tsx');
const teamPage = read('app/settings/team/page.tsx');
const salesPage = read('app/settings/sales/page.tsx');
const dataPage = read('app/settings/data/page.tsx');
const appPage = read('app/settings/app/page.tsx');
const staffManagement = read('components/settings/StaffManagement.tsx');
const canonicalizationPanel = read('components/settings/DataCanonicalizationPanel.tsx');
const pwaInstall = read('components/PWAInstallButton.tsx');
const legacyStaffPage = read('app/staff/page.tsx');

assert.match(indexPage, /title="更多"/);
assert.match(indexPage, /getSettingsDestinationGroups\(isStaff\)/);
assert.doesNotMatch(indexPage, /StaffManagement|DataCanonicalizationPanel|OwnerBrandSettingsCard|SalesPhotoEvidenceSettingsCard|PWAInstallButton/);

assert.match(accountPage, /<AccountSyncPanel \/>/);
assert.match(accountPanel, /useSyncContext\(\)/);
assert.match(accountPanel, /isSignOutBlockedByLocalChanges/);
assert.match(accountPanel, /<ConfirmDialog/);

assert.match(teamPage, /StaffManagement = dynamic/);
assert.match(teamPage, /<StaffPermissionCard/);
assert.match(teamPage, /clearLocalAppData/);
assert.match(salesPage, /OwnerBrandSettingsCard = dynamic/);
assert.match(salesPage, /SalesPhotoEvidenceSettingsCard = dynamic/);
assert.match(salesPage, /<InteractionSettingsPanel \/>/);
assert.match(dataPage, /DataCanonicalizationPanel = dynamic/);
assert.match(dataPage, /confirmationText="DELETE"/);
assert.match(appPage, /PWAInstallButton = dynamic/);
assert.match(pwaInstall, /<AppDialog/);
assert.match(legacyStaffPage, /router\.replace\('\/settings\/team'\)/);

for (const source of [accountPanel, teamPage, dataPage, staffManagement, canonicalizationPanel]) {
  assert.doesNotMatch(source, /window\.confirm\(|\bconfirm\(|\bprompt\(/);
}

console.log('PASS settings information architecture and interaction consistency');
