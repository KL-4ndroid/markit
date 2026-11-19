import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getClipboardPort,
  getDeepLinkPort,
  getExternalLinkPort,
  getSharePort,
  installInteractionPorts,
} from '../lib/platform/interaction-capabilities';
import { generateInvitationUrl } from '../lib/supabase/staff-invitations';

const projectRoot = join(__dirname, '..');
const readProjectFile = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

console.log('\n=== Platform interaction boundaries ===');

async function main(): Promise<void> {
  const calls: string[] = [];
  const deepLinkListeners: Array<(url: string) => void> = [];
  const restore = installInteractionPorts({
    clipboard: { writeText: async value => { calls.push(`copy:${value}`); } },
    share: { share: async input => { calls.push(`share:${input.url}`); return 'shared'; } },
    externalLinks: { open: async url => { calls.push(`open:${url}`); return true; } },
    deepLinks: {
      createAppUrl: path => `feria://app${path}`,
      getInitialUrl: async () => 'feria://app/join?token=initial',
      getCurrentUrl: async () => 'feria://app/markets',
      subscribe(listener) { deepLinkListeners.push(listener); return () => { deepLinkListeners.length = 0; }; },
    },
  });

  try {
    const invitationUrl = generateInvitationUrl('a token');
    assert.equal(invitationUrl, 'feria://app/join?token=a%20token');
    await getClipboardPort().writeText(invitationUrl);
    assert.equal(await getSharePort().share({ url: invitationUrl }), 'shared');
    assert.equal(await getExternalLinkPort().open('https://example.com'), true);
    assert.equal(await getDeepLinkPort().getInitialUrl(), 'feria://app/join?token=initial');
    const unsubscribe = getDeepLinkPort().subscribe(url => calls.push(`deep:${url}`));
    assert.equal(typeof deepLinkListeners[0], 'function');
    deepLinkListeners[0]('feria://app/join?token=next');
    unsubscribe();
  } finally {
    restore();
  }

  assert.deepEqual(calls, [
    'copy:feria://app/join?token=a%20token',
    'share:feria://app/join?token=a%20token',
    'open:https://example.com',
    'deep:feria://app/join?token=next',
  ]);
  console.log('PASS interaction ports support native installation and deep-link delivery');

  const invitationsSource = readProjectFile('lib/supabase/staff-invitations.ts');
  const staffSource = readProjectFile('components/settings/StaffManagement.tsx');
  assert.match(invitationsSource, /getDeepLinkPort\(\)\.createAppUrl/);
  assert.doesNotMatch(invitationsSource, /window\.location\.origin/);
  assert.match(staffSource, /getClipboardPort\(\)\.writeText/);
  assert.doesNotMatch(staffSource, /navigator\.clipboard/);
  console.log('PASS invitation generation and copy UI no longer depend on browser globals');
}

void main();
