const test = require('node:test');
const assert = require('node:assert/strict');
const { matchChannels } = require('../src/dispatch/router');

const maps = [
  { channelId: 'c1', code: '0325005' },
  { channelId: 'c2', code: '1061005' },
  { channelId: 'c3', code: '0325005' },
  { channelId: 'c4', code: '325' },
];

test('routes by whole-token dispatcher code', () => {
  const r = matchChannels(maps, '0325005 231 BRIDGE ST');
  assert.deepEqual(r.map((x) => x.channelId).sort(), ['c1', 'c3']);
});

test('same code can route to several channels, other codes stay out', () => {
  const r = matchChannels(maps, '1061005 #F2515222 at 330 WALNUT ST');
  assert.deepEqual(r, [{ channelId: 'c2', codes: ['1061005'] }]);
});

test('does not match partial tokens', () => {
  assert.deepEqual(matchChannels(maps, 'UNIT 3250 EN ROUTE'), []);
});

test('is case-insensitive and handles empty input', () => {
  assert.equal(matchChannels([{ channelId: 'x', code: 'abc1' }], 'call ABC1 now').length, 1);
  assert.deepEqual(matchChannels(maps, ''), []);
  assert.deepEqual(matchChannels([], 'anything'), []);
});

test('multi-word codes like "QRS 80" match as a phrase', () => {
  const m = [{ channelId: 'qrs', code: 'QRS 80' }];
  assert.equal(matchChannels(m, 'STUFF HAPPENED - QRS 80').length, 1);
  assert.equal(matchChannels(m, 'stuff\nqrs   80 now').length, 1);
  assert.deepEqual(matchChannels(m, 'QRS 800'), []);
  assert.deepEqual(matchChannels(m, 'XQRS 80'), []);
  assert.deepEqual(matchChannels(m, 'QRS and 80'), []);
});

test('a trailing * routes a whole code family to one channel', () => {
  const m = [{ channelId: 'um', code: '1056*' }];
  assert.equal(matchChannels(m, '1056013 EVENT: F2632631 56 General').length, 1);
  assert.equal(matchChannels(m, '1056005 231 BRIDGE ST').length, 1);
  assert.deepEqual(matchChannels(m, 'X1056013'), []);
  assert.deepEqual(matchChannels(m, '21056130'), []);
  assert.deepEqual(matchChannels(m, '1056'), [{ channelId: 'um', codes: ['1056*'] }]);
});

test('a * code only matches at the start of a line, not inside an address', () => {
  const m = [{ channelId: 'ch', code: '1004*' }];
  assert.deepEqual(matchChannels(m, '1041005 #F1 at 1004 BETHLEHEM PIKE'), []);
  assert.equal(matchChannels(m, '1004005 #F1 at 265 TOWNSHIP LINE RD').length, 1);
  assert.equal(matchChannels(m, 'Untitled E-Mail\n1004005 265 TOWNSHIP LINE RD').length, 1);
  assert.equal(matchChannels(m, '1004005').length, 1);
  assert.deepEqual(matchChannels(m, 'X1004005 265 TOWNSHIP LINE RD'), []);
});

test('a "NAT " code matches the call type only, not the notes', () => {
  const m = [
    { channelId: 'fire', code: 'NAT BUILDING FIRE' },
    { channelId: 'rescue', code: 'NAT RESCUE' },
    { channelId: 'alarm', code: 'NAT FIRE ALARM' },
  ];
  const t = (text, callType) => matchChannels(m, text, { callType }).map((r) => r.channelId);
  assert.deepEqual(t('1004005 x NAT: BUILDING FIRE NON-COMMERCIAL [F1]', 'BUILDING FIRE NON-COMMERCIAL [F1]'), ['fire']);
  assert.deepEqual(t('0329005 x', 'BUILDING FIRE COMMERCIAL [E3]'), ['fire']);
  assert.deepEqual(t('1043005 x', 'ELEVATOR EMERGENCY RESCUE [F2]'), ['rescue']);
  assert.deepEqual(t('1056013 x', 'VEHICLE ACCIDENT RESCUE [F1]'), ['rescue']);
  assert.deepEqual(t('1053005 x', 'FIRE ALARM [F3]'), ['alarm']);
  // "FIRE ALARM" only in the notes of a building fire must not hit the alarm channel
  assert.deepEqual(t('1015005 NOTES: FIRE ALARM GOING OFF', 'BUILDING FIRE COMMERCIAL [F1]'), ['fire']);
  assert.deepEqual(t('1015005 BUILDING FIRE', undefined), []);
  assert.deepEqual(t('x', 'GAS-ODOR/LEAK INSIDE COMMERCIAL BUILDING [F1]'), []);
});
