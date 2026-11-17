import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addRecord,
  deleteRecord,
  getFinancialSummary,
  formatLedgerForPrompt,
  resetLedger
} from '../api/_lib/business_records.js';

test('Verified Ledger: strictly returns 0 and empty list when no records logged (zero fabrication)', () => {
  resetLedger();
  const summary = getFinancialSummary('2026-11');

  assert.equal(summary.recordCount, 0, 'Must have zero records');
  assert.equal(summary.totalEur, 0, 'Must have 0 EUR total');
  assert.equal(summary.totalFcfa, 0, 'Must have 0 FCFA total');
  assert.equal(summary.totalUsd, 0, 'Must have 0 USD total');

  const promptText = formatLedgerForPrompt('2026-11');
  assert.ok(promptText.includes('0 VERIFIED INVOICES / PAYMENTS LOGGED'), 'Prompt must disclose zero records');
  assert.ok(promptText.includes('€0.00'), 'Prompt must disclose 0.00 EUR');
  assert.ok(!promptText.includes('39,550'), 'Must never include fabricated revenue numbers');
  assert.ok(!promptText.includes('14,800'), 'Must never include fabricated venture numbers');
});

test('Verified Ledger: accurately calculates audited totals from logged business records', () => {
  resetLedger();

  // Log verified records across ventures
  const r1 = addRecord({
    venture: 'Purgo Clean',
    amount: 3200,
    currency: 'EUR',
    client: 'Coworking Opéra',
    type: 'invoice',
    date: '2026-11-05',
    description: 'Monthly office maintenance'
  });

  addRecord({
    venture: 'FormationPro',
    amount: 1800,
    currency: 'EUR',
    client: 'Cabinet Alpha',
    type: 'invoice',
    date: '2026-11-10',
    description: 'Executive leadership coaching cohort'
  });

  addRecord({
    venture: 'Keo Jus',
    amount: 1500000,
    currency: 'FCFA',
    client: 'Accor Hotels Abidjan',
    type: 'contract',
    date: '2026-11-12',
    description: 'Batch artisanal juice supply'
  });

  assert.ok(r1.id.startsWith('rec_'));
  assert.equal(r1.verified, true);

  const summary = getFinancialSummary('2026-11');
  assert.equal(summary.recordCount, 3);
  assert.equal(summary.totalEur, 5000, '3200 + 1800 = 5000 EUR');
  assert.equal(summary.totalFcfa, 1500000, 'Keo Jus FCFA total must be exact');

  // Verify breakdown per venture
  assert.equal(summary.byVenture.PurgoClean.totalEur, 3200);
  assert.equal(summary.byVenture.FormationPro.totalEur, 1800);
  assert.equal(summary.byVenture.KeoJus.totalFcfa, 1500000);

  const promptText = formatLedgerForPrompt('2026-11');
  assert.ok(promptText.includes('€5,000.00'), 'Prompt must show exact audited EUR');
  assert.ok(promptText.includes('1,500,000 FCFA'), 'Prompt must show exact audited FCFA');
  assert.ok(promptText.includes('Coworking Opéra'), 'Prompt must reference verified client');
});

test('Verified Ledger: validates input data and rejects negative or missing values', () => {
  resetLedger();

  assert.throws(() => {
    addRecord({ venture: '', amount: 100 });
  }, /venture and amount are required/);

  assert.throws(() => {
    addRecord({ venture: 'Purgo Clean', amount: -500 });
  }, /valid positive number/);

  assert.throws(() => {
    addRecord({ venture: 'Purgo Clean', amount: 500, currency: 'BITCOIN' });
  }, /Unsupported currency/);
});

test('Verified Ledger: supports record deletion and updates financial summary instantly', () => {
  resetLedger();
  const rec = addRecord({
    venture: 'Entreprise AI',
    amount: 2500,
    currency: 'EUR',
    client: 'Startup Hub',
    type: 'retainer',
    date: '2026-11-15'
  });

  let summary = getFinancialSummary('2026-11');
  assert.equal(summary.totalEur, 2500);

  const deleted = deleteRecord(rec.id);
  assert.equal(deleted, true);

  summary = getFinancialSummary('2026-11');
  assert.equal(summary.totalEur, 0);
  assert.equal(summary.recordCount, 0);
});
