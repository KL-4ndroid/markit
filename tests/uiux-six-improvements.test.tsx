import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildTodayViewModel, summarizeTodayMarkets } from '../lib/home/today-view-model';
import { marketRegistrationPresentation } from '../lib/markets/market-registration-presentation';
import { journalExcerpt } from '../lib/markets/journal-reading';
import { staffAccessPresentation, staffRoleWorkDetails } from '../lib/permissions/staff-access-presentation';
import { MarketRegistrationPanel } from '../components/markets/MarketRegistrationPanel';
import { JournalReadingBody } from '../components/markets/JournalReadingBody';
import { StaffPermissionCard } from '../components/staff/StaffPermissionCard';
import type { Market } from '../types/db';
import type { StaffRole } from '../types/staff';

const market = (id: string, overrides: Partial<Market> = {}): Market => ({ id, name: id, location: '測試', status: 'paid', startDate: '2026-10-25', endDate: '2026-10-25', operatingStartTime: '10:00', operatingEndTime: '18:00', registrationFee: 0, boothCost: 0, createdAt: 1, updatedAt: 1, ...overrides });
const view = buildTodayViewModel([
  market('live'), market('pending', { status: 'registered' }),
  market('accepted', { status: 'accepted' }), market('delayed', { status: 'postponed' }),
  market('closed', { status: 'completed' }), market('cancelled', { status: 'cancelled' }),
  market('deleted', { isDeleted: true }), market('skipped', { sessionOrigin: 'schedule', scheduleOccurrenceState: 'skipped' }),
], new Date(2026, 9, 25, 13));
assert.deepEqual(summarizeTodayMarkets(view.todayMarkets), { total: 5, operating: 1, preparing: 3, ended: 1 });
assert.deepEqual(view.todayMarkets.map(item => item.phaseLabel), ['營業中', '等待錄取', '待繳費', '已延期', '整場已結束']);
assert.equal(view.primaryMarket?.market.id, 'live');
assert.equal(buildTodayViewModel([market('fixed', { status: 'registered', sessionOrigin: 'schedule' })], new Date(2026, 9, 25, 9)).primaryMarket?.phaseLabel, '固定場次待開始');
assert.equal(buildTodayViewModel([market('missing', { operatingEndTime: undefined })], new Date(2026, 9, 25, 9)).primaryMarket?.phaseLabel, '營業時間待確認');
const allClosed = buildTodayViewModel([market('early', { status: 'completed', operatingEndTime: '12:00' }), market('recent', { status: 'completed', operatingEndTime: '18:00' })], new Date(2026, 9, 25, 20));
assert.equal(allClosed.primaryMarket?.market.id, 'recent');
assert.equal(summarizeTodayMarkets(allClosed.todayMarkets).total, 2);
assert.equal(marketRegistrationPresentation('registered').nextStatus, 'accepted');
assert.equal(marketRegistrationPresentation('accepted').nextStatus, 'paid');
for (const status of ['paid', 'ongoing', 'completed', 'postponed', 'cancelled'] as const) assert.equal(marketRegistrationPresentation(status).nextStatus, undefined);
for (const status of ['ongoing', 'completed'] as const) assert.notEqual(marketRegistrationPresentation(status).label, '已繳費');
const registeredHtml = renderToStaticMarkup(<MarketRegistrationPanel status="accepted" onChange={() => { throw new Error('render must not write'); }} />);
assert.match(registeredHtml, /尚未記錄已繳費/);
assert.match(registeredHtml, /標記已繳費/);
assert.match(registeredHtml, /更正／其他狀態/);
assert.doesNotMatch(registeredHtml, /<details[^>]*open/);
const busyHtml = renderToStaticMarkup(<MarketRegistrationPanel status="registered" busy onChange={() => {}} />);
assert.equal((busyHtml.match(/disabled=""/g) ?? []).length, 7);

assert.deepEqual(journalExcerpt('停車不方便'), { text: '停車不方便', truncated: false });
const longBody = '前'.repeat(250) + '停車要提早到' + '後'.repeat(250);
const found = journalExcerpt(longBody, '停車');
assert.equal(found.truncated, true);
assert.ok(found.text.includes('停車要提早到'));
assert.ok(found.text.startsWith('…'));
assert.ok(!found.text.includes('前'.repeat(161)));
assert.equal(journalExcerpt('🙂'.repeat(200)).text.includes('\uFFFD'), false);
assert.equal(journalExcerpt('one\ntwo\nthree\nfour\nfive\nsix').truncated, true);
assert.match(journalExcerpt('前'.repeat(200) + 'PARKING area', 'parking').text, /PARKING/);
const readingHtml = renderToStaticMarkup(<JournalReadingBody body={longBody} query="停車" />);
assert.match(readingHtml, /展開全文/);
assert.match(readingHtml, /aria-expanded="false"/);
assert.doesNotMatch(readingHtml, /textarea/);
assert.doesNotMatch(renderToStaticMarkup(<JournalReadingBody body="短心得" />), /展開全文/);

const active = { role: 'viewer' as const, status: 'active' as const, canView: true, teamAllowed: true };
assert.equal(staffAccessPresentation(active).title, '僅供查看');
assert.match(staffAccessPresentation(active).summary, /不能記錄/);
assert.match(staffAccessPresentation({ ...active, role: 'operator' }).summary, /記錄成交/);
assert.match(staffAccessPresentation({ ...active, role: 'manager' }).summary, /開放欄位/);
assert.equal(staffAccessPresentation({ ...active, status: 'suspended_by_plan' }).title, '存取已暫停');
assert.equal(staffAccessPresentation({ ...active, status: 'pending' }).title, '等待接受邀請');
assert.equal(staffAccessPresentation({ ...active, status: 'revoked' }).title, '已移除存取權');
assert.equal(staffAccessPresentation({ ...active, simulationActive: true }).title, '目前為模擬顯示');
assert.equal(staffAccessPresentation({ ...active, teamAllowed: false, blockReason: 'stale_capability' }).title, '存取資格尚未確認');
assert.equal(staffAccessPresentation({ ...active, teamAllowed: false, blockReason: 'plan_required' }).title, '團隊存取未開放');
assert.equal(staffAccessPresentation({ ...active, canView: false }).title, '權限需要確認');
assert.equal(staffAccessPresentation({ ...active, role: 'unexpected' as StaffRole }).title, '權限需要確認');
assert.match(staffRoleWorkDetails('unexpected' as StaffRole).join(), /角色尚未確認/);
assert.doesNotMatch(staffRoleWorkDetails('viewer').join(), /營業開放時記錄/);
const viewerHtml = renderToStaticMarkup(<StaffPermissionCard staffRole="viewer" authorizationFresh />);
assert.match(viewerHtml, /不能記錄或修改/);
assert.doesNotMatch(viewerHtml, /fresh role|field note|checklist|下一階段/);
assert.match(renderToStaticMarkup(<StaffPermissionCard staffRole="operator" />), /存取資格尚未確認/);
console.log('PASS six UIUX improvements: shared counts, honest registration, reading excerpts, role/access distinctions and accessible markup');
