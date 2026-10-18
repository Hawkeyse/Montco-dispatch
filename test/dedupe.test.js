const test = require('node:test');
const assert = require('node:assert/strict');
const { claim, isReclaimable } = require('../src/dispatch/dedupe');

function fakeModel() {
  const docs = [];
  let id = 0;
  const match = (d, q) => Object.entries(q).every(([k, v]) => d[k] === v);
  return {
    docs,
    async create(d) {
      if (docs.some((x) => x.provider === d.provider && x.messageId === d.messageId)) {
        const e = new Error('duplicate key'); e.code = 11000; throw e;
      }
      const doc = { _id: ++id, status: 'processing', attempts: 1, deliveredChannels: [], updatedAt: new Date(), ...d };
      docs.push(doc);
      return doc;
    },
    async findOne(q) { return docs.find((d) => match(d, q)) ?? null; },
    async findOneAndUpdate(q, u) {
      const d = docs.find((x) => match(x, q));
      if (!d) return null;
      Object.assign(d, u.$set);
      d.attempts += u.$inc.attempts;
      d.updatedAt = new Date();
      return d;
    },
  };
}

test('first claim wins, duplicate is rejected', async () => {
  const M = fakeModel();
  assert.ok(await claim(M, 'gmail', 'm1'));
  assert.equal(await claim(M, 'gmail', 'm1'), null);
  assert.ok(await claim(M, 'gmail', 'm2'));
});

test('sent and ignored emails are never reclaimed', async () => {
  const M = fakeModel();
  await claim(M, 'gmail', 'm1');
  M.docs[0].status = 'sent';
  assert.equal(await claim(M, 'gmail', 'm1'), null);
  M.docs[0].status = 'ignored';
  assert.equal(await claim(M, 'gmail', 'm1'), null);
});

test('failed emails are retried, up to the attempt cap', async () => {
  const M = fakeModel();
  await claim(M, 'gmail', 'm1');
  M.docs[0].status = 'failed';
  const again = await claim(M, 'gmail', 'm1');
  assert.equal(again.attempts, 2);
  assert.equal(again.status, 'processing');
  M.docs[0].status = 'failed';
  M.docs[0].attempts = 5;
  assert.equal(await claim(M, 'gmail', 'm1'), null);
});

test('stale processing claims (crash mid-send) can be taken over', () => {
  const now = Date.now();
  assert.equal(isReclaimable({ status: 'processing', attempts: 1, updatedAt: new Date(now - 10_000) }, now), false);
  assert.equal(isReclaimable({ status: 'processing', attempts: 1, updatedAt: new Date(now - 10 * 60_000) }, now), true);
});
