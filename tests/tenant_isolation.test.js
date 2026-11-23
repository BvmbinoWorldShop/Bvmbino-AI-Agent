import test from 'node:test';
import assert from 'node:assert/strict';
import { signToken, JWT_SECRET } from '../api/_lib/auth.js';
import memoryHandler from '../api/memory.js';
import {
  MEMORY_TIERS,
  loadPersistentMemory,
  addMemoryItem,
  updateMemoryItem,
  supersedeMemoryItem,
  deleteMemoryItem,
  retrieveRelevantMemory,
  exportMemoryBackup,
  importMemoryBackup,
  resetPersistentMemory
} from '../api/_lib/memory.js';
import {
  addRecord,
  deleteRecord,
  getFinancialSummary,
  resetLedger
} from '../api/_lib/business_records.js';

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    }
  };
  return res;
}

const tenantA = 'tenant_corp_alpha';
const tenantB = 'tenant_corp_beta';

const tokenA = signToken({ sub: 'user_alpha', tenantId: tenantA });
const tokenB = signToken({ sub: 'user_beta', tenantId: tenantB });
const tokenAdmin = signToken({ sub: 'superadmin', role: 'admin' });

test('Tenant Isolation: Memory store partitions facts, assumptions, and targets per tenant', () => {
  resetPersistentMemory(tenantA);
  resetPersistentMemory(tenantB);

  // Client A writes proprietary strategic knowledge
  const factResA = addMemoryItem({
    text: 'Client A Q4 revenue goal is 500,000 EUR with Secret Partner X',
    type: MEMORY_TIERS.CONFIRMED_FACT,
    venture: 'FormationPro'
  }, tenantA);

  assert.ok(factResA.item.id);
  assert.equal(factResA.item.tenantId, tenantA);

  // Client B reads its own memory
  const memoryB = loadPersistentMemory(tenantB);
  assert.equal(memoryB.facts.length, 0, 'Client B must have zero facts from Client A');
  assert.equal(memoryB.items.length, 0, 'Client B must have zero items from Client A');
  assert.equal(memoryB.summaries.length, 0);

  // Client B performs semantic relevance retrieval for Secret Partner X
  const searchB = retrieveRelevantMemory({ query: 'Secret Partner X' }, tenantB);
  assert.equal(searchB.items.length, 0, 'Client B search must not reveal Client A data');

  // Client A retrieves its own memory
  const searchA = retrieveRelevantMemory({ query: 'Secret Partner X' }, tenantA);
  assert.equal(searchA.items.length, 1, 'Client A can find its own secret');
  assert.equal(searchA.items[0].id, factResA.item.id);
});

test('Tenant Isolation: Mutation operations reject cross-tenant manipulation', () => {
  resetPersistentMemory(tenantA);
  resetPersistentMemory(tenantB);

  const factResA = addMemoryItem({
    text: 'Client A exclusive supply agreement signed',
    type: MEMORY_TIERS.CONFIRMED_FACT
  }, tenantA);
  const factA = factResA.item;

  // Client B attempts to mutate Client A fact within tenant B
  assert.throws(() => {
    updateMemoryItem(factA.id, { text: 'Malicious modification by B' }, tenantB);
  }, /not found/);

  // Client B attempts to supersede Client A item
  assert.throws(() => {
    supersedeMemoryItem(factA.id, 'Falsified replacement', {}, tenantB);
  }, /not found/);

  // Client B attempts to delete Client A item
  const deleteResult = deleteMemoryItem(factA.id, tenantB);
  assert.equal(deleteResult, false, 'Client B cannot delete Client A item');

  // Client A fact remains unchanged
  const memoryA = loadPersistentMemory(tenantA);
  assert.equal(memoryA.facts.length, 1);
  assert.equal(memoryA.facts[0].text, 'Client A exclusive supply agreement signed');
});

test('Tenant Isolation: Financial ledger partitions records and audited revenue calculations', () => {
  resetLedger(tenantA);
  resetLedger(tenantB);

  // Client A logs audited revenue records
  addRecord({
    venture: 'Purgo Clean',
    amount: 15000,
    currency: 'EUR',
    client: 'Hospital Nord',
    type: 'invoice',
    date: '2026-11-01',
    verificationStatus: 'verified',
    evidenceRef: 'INV-A-15000'
  }, tenantA);

  // Client B logs a draft record
  addRecord({
    venture: 'Keo Jus',
    amount: 1000,
    currency: 'EUR',
    client: 'Local Bistro',
    type: 'invoice',
    date: '2026-11-02',
    verificationStatus: 'pending_review'
  }, tenantB);

  // Summary checks
  const summaryA = getFinancialSummary('2026-11', null, tenantA);
  const summaryB = getFinancialSummary('2026-11', null, tenantB);

  assert.equal(summaryA.totalEur, 15000, 'Tenant A audited total must be 15,000 EUR');
  assert.equal(summaryA.recordCount, 1);
  assert.equal(summaryA.pendingEur, 0);

  assert.equal(summaryB.totalEur, 0, 'Tenant B must NOT include Tenant A revenue');
  assert.equal(summaryB.pendingEur, 1000, 'Tenant B pending drafts only');
  assert.equal(summaryB.recordCount, 0);
});

test('Tenant Isolation: API rejects cross-tenant spoofing and enforces 403 Forbidden', async () => {
  resetPersistentMemory(tenantA);
  resetPersistentMemory(tenantB);

  // 1. Client B attempts to read Tenant A memory via query parameter
  const reqGet = {
    method: 'GET',
    headers: { 'x-app-token': tokenB },
    query: { tenantId: tenantA }
  };
  const resGet = mockRes();
  await memoryHandler(reqGet, resGet);

  assert.equal(resGet.statusCode, 403, 'Cross-tenant GET must return 403 Forbidden');
  assert.ok(resGet.body.error.includes('Cross-tenant access denied'));

  // 2. Client B attempts to write into Tenant A via POST body spoofing
  const reqPost = {
    method: 'POST',
    headers: { 'x-app-token': tokenB },
    body: {
      action: 'add_fact',
      tenantId: tenantA,
      text: 'Injected hostile fact into Tenant A'
    }
  };
  const resPost = mockRes();
  await memoryHandler(reqPost, resPost);

  assert.equal(resPost.statusCode, 403, 'Cross-tenant POST must return 403 Forbidden');
  assert.ok(resPost.body.error.includes('Cross-tenant access denied'));

  // 3. Admin token CAN access Tenant A for authorized support/auditing
  const reqAdmin = {
    method: 'GET',
    headers: { 'x-app-token': tokenAdmin },
    query: { tenantId: tenantA }
  };
  const resAdmin = mockRes();
  await memoryHandler(reqAdmin, resAdmin);

  assert.equal(resAdmin.statusCode, 200, 'Admin can inspect requested tenant');
  assert.equal(resAdmin.body.tenantId, tenantA);
});

test('Tenant Isolation: Export and import backups strictly preserve partition boundaries', () => {
  resetPersistentMemory(tenantA);
  resetPersistentMemory(tenantB);

  addMemoryItem({ text: 'Alpha Secret Strategy 2027', type: MEMORY_TIERS.CONFIRMED_FACT }, tenantA);
  addMemoryItem({ text: 'Beta Public Target', type: MEMORY_TIERS.TARGET }, tenantB);

  const backupA = exportMemoryBackup(tenantA);
  const backupB = exportMemoryBackup(tenantB);

  assert.equal(backupA.tenantId, tenantA);
  assert.equal(backupA.memoryItems.filter(i => i.type === MEMORY_TIERS.CONFIRMED_FACT).length, 1);
  assert.equal(backupA.memoryItems.find(i => i.type === MEMORY_TIERS.CONFIRMED_FACT).text, 'Alpha Secret Strategy 2027');

  assert.equal(backupB.tenantId, tenantB);
  assert.equal(backupB.memoryItems.filter(i => i.type === MEMORY_TIERS.TARGET).length, 1);
  assert.equal(backupB.memoryItems.find(i => i.type === MEMORY_TIERS.TARGET).text, 'Beta Public Target');
  assert.equal(backupB.memoryItems.filter(i => i.type === MEMORY_TIERS.CONFIRMED_FACT).length, 0);

  // Import into Tenant B does not affect Tenant A
  importMemoryBackup({
    memoryItems: [{ id: 'imported_beta_1', text: 'Beta New Knowledge', type: MEMORY_TIERS.CONFIRMED_FACT, confidence: 1.0, tags: [] }],
    summaries: [],
    ledgerRecords: []
  }, 'replace', tenantB);

  const finalMemoryA = loadPersistentMemory(tenantA);
  const finalMemoryB = loadPersistentMemory(tenantB);

  assert.equal(finalMemoryA.items.length, 1, 'Tenant A remains completely untouched');
  assert.equal(finalMemoryA.items[0].text, 'Alpha Secret Strategy 2027');
  assert.equal(finalMemoryB.items.length, 1);
  assert.equal(finalMemoryB.items[0].text, 'Beta New Knowledge');
});
