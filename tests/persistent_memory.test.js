import test from 'node:test';
import assert from 'node:assert/strict';
import memoryHandler from '../api/memory.js';
import {
  loadPersistentMemory,
  addPersistentFact,
  deletePersistentFact,
  formatPersistentMemoryForPrompt,
  resetPersistentMemory
} from '../api/_lib/memory.js';
import { signToken } from '../api/_lib/auth.js';

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

const validToken = signToken({ sub: 'Lataupe95', auth: 'elite', role: 'admin' });

test('Persistent Memory: stores and loads structured user memory without relying on browser seeds', () => {
  resetPersistentMemory();
  const mem = loadPersistentMemory();

  assert.equal(mem.version, 2);
  assert.equal(mem.profile.user, 'Boss');
  assert.ok(Array.isArray(mem.facts));
  assert.ok(mem.profile.activeVentures.includes('FormationPro'));
  assert.ok(mem.profile.activeVentures.includes('Purgo Clean'));
  assert.ok(mem.profile.activeVentures.includes('Keo Jus'));
  assert.ok(mem.profile.activeVentures.includes('Entreprise AI'));
});

test('Persistent Memory: supports adding and deduplicating verified facts', () => {
  resetPersistentMemory();

  const fact1 = addPersistentFact('Boss finalized the Q4 partnership terms with Accor Hotels Abidjan.');
  assert.ok(fact1.id.startsWith('fact_'));
  assert.equal(fact1.text, 'Boss finalized the Q4 partnership terms with Accor Hotels Abidjan.');

  // Try adding duplicate fact
  const fact2 = addPersistentFact('Boss finalized the Q4 partnership terms with Accor Hotels Abidjan.');
  assert.equal(fact2.id, fact1.id, 'Duplicate fact should return existing record without duplicating');

  const mem = loadPersistentMemory();
  const match = mem.facts.filter(f => f.text.includes('Accor Hotels Abidjan'));
  assert.equal(match.length, 1);

  const promptText = formatPersistentMemoryForPrompt();
  assert.ok(promptText.includes('Accor Hotels Abidjan'));

  // Delete fact
  const deleted = deletePersistentFact(fact1.id);
  assert.equal(deleted, true);

  const memAfter = loadPersistentMemory();
  assert.equal(memAfter.facts.some(f => f.id === fact1.id), false);
});

test('Persistent Memory API: requires strong authentication to read or mutate memory', async () => {
  const req = {
    method: 'GET',
    headers: {} // No token
  };
  const res = mockRes();

  await memoryHandler(req, res);

  assert.equal(res.statusCode, 403, 'Must reject unauthenticated memory access');
  assert.ok(res.body.error.includes('Unauthorized'));
});

test('Persistent Memory API: returns memory, ledger, and monthly summary with valid auth', async () => {
  const req = {
    method: 'GET',
    headers: {
      'x-app-token': validToken
    }
  };
  const res = mockRes();

  await memoryHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.memory);
  assert.ok(res.body.ledger);
  assert.ok(res.body.summary);
  assert.equal(typeof res.body.summary.totalEur, 'number');
});

test('Persistent Memory API: adds a verified record via POST action=add_record', async () => {
  const req = {
    method: 'POST',
    headers: {
      'x-app-token': validToken
    },
    body: {
      action: 'add_record',
      venture: 'Purgo Clean',
      amount: 4500,
      currency: 'EUR',
      client: 'Bureaux Saint-Lazare',
      description: 'Annual cleaning contract installment',
      verificationStatus: 'verified',
      evidenceRef: 'INV-2026-SL01'
    }
  };
  const res = mockRes();

  await memoryHandler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.record.amount, 4500);
  assert.equal(res.body.record.venture, 'PurgoClean');
  assert.equal(res.body.summary.totalEur >= 4500, true);
});
