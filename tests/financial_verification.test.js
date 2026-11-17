import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINANCIAL_VERIFICATION_STATES,
  addRecord,
  updateRecordVerification,
  getFinancialSummary,
  resetLedger
} from '../api/_lib/business_records.js';
import healthHandler from '../api/health.js';
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
    }
  };
  return res;
}

test('Financial Verification States: differentiates verified, reconciled, pending, and disputed records', () => {
  resetLedger();

  // 1. Confirmed Verified Invoice
  const recVerified = addRecord({
    venture: 'FormationPro',
    amount: 3500,
    currency: 'EUR',
    client: 'Société Générale',
    verificationStatus: FINANCIAL_VERIFICATION_STATES.VERIFIED,
    evidenceRef: 'INV-2026-088',
    date: '2026-11-04'
  });
  assert.equal(recVerified.verificationStatus, 'verified');
  assert.equal(recVerified.verified, true);
  assert.ok(recVerified.verifiedAt);
  assert.equal(recVerified.evidenceRef, 'INV-2026-088');

  // 2. Bank Reconciled Cash Settlement
  const recReconciled = addRecord({
    venture: 'Purgo Clean',
    amount: 4200,
    currency: 'EUR',
    client: 'Campus Clichy',
    verificationStatus: FINANCIAL_VERIFICATION_STATES.RECONCILED,
    evidenceRef: 'STRIPE_CH_9941',
    date: '2026-11-06'
  });
  assert.equal(recReconciled.verificationStatus, 'reconciled');
  assert.equal(recReconciled.verified, true);
  assert.ok(recReconciled.reconciledAt);

  // 3. Draft / Pending Proposal (NOT BOOKED)
  const recPending = addRecord({
    venture: 'Entreprise AI',
    amount: 12000,
    currency: 'EUR',
    client: 'Logistics SA',
    verificationStatus: FINANCIAL_VERIFICATION_STATES.PENDING_REVIEW,
    date: '2026-11-08'
  });
  assert.equal(recPending.verificationStatus, 'pending_review');
  assert.equal(recPending.verified, false, 'Pending draft must not be considered audited ground truth');
  assert.equal(recPending.verifiedAt, null);

  // 4. Disputed invoice
  const recDisputed = addRecord({
    venture: 'Keo Jus',
    amount: 800,
    currency: 'EUR',
    client: 'Disputed Reseller',
    verificationStatus: FINANCIAL_VERIFICATION_STATES.DISPUTED,
    date: '2026-11-10'
  });
  assert.equal(recDisputed.verificationStatus, 'disputed');
  assert.equal(recDisputed.verified, false);

  // Summary audit check
  const summary = getFinancialSummary('2026-11');

  // Realized Total = 3500 (Verified) + 4200 (Reconciled) = 7700 EUR
  assert.equal(summary.totalEur, 7700, 'Only verified and reconciled records count toward total booked revenue');
  assert.equal(summary.reconciledEur, 4200, 'Reconciled amount must strictly reflect reconciled records');
  assert.equal(summary.pendingEur, 12000, 'Pending drafts tracked separately and never fabricated as realized');
  assert.equal(summary.disputedEur, 800);
  assert.equal(summary.recordCount, 2, 'recordCount must only count audited records');

  assert.equal(summary.verificationCounts.verified, 1);
  assert.equal(summary.verificationCounts.reconciled, 1);
  assert.equal(summary.verificationCounts.pending, 1);
  assert.equal(summary.verificationCounts.disputed, 1);
  assert.equal(summary.verificationCounts.totalAudited, 2);
});

test('Financial Verification Lifecycle: transitions pending record to reconciled with audit trail', () => {
  resetLedger();

  const draft = addRecord({
    venture: 'FormationPro',
    amount: 6000,
    currency: 'EUR',
    client: 'Orange CI',
    verificationStatus: FINANCIAL_VERIFICATION_STATES.PENDING_REVIEW,
    date: '2026-11-15'
  });
  assert.equal(draft.verified, false);

  // Transition to RECONCILED with payment evidence
  const reconciled = updateRecordVerification(draft.id, {
    verificationStatus: FINANCIAL_VERIFICATION_STATES.RECONCILED,
    evidenceRef: 'WIRE_BICI_20261115_901',
    verifiedBy: 'Lataupe95'
  });

  assert.equal(reconciled.verificationStatus, 'reconciled');
  assert.equal(reconciled.verified, true);
  assert.ok(reconciled.reconciledAt);
  assert.equal(reconciled.evidenceRef, 'WIRE_BICI_20261115_901');
  assert.equal(reconciled.verifiedBy, 'Lataupe95');

  // Summary should now reflect the newly reconciled amount
  const summary = getFinancialSummary('2026-11');
  assert.equal(summary.totalEur, 6000);
  assert.equal(summary.reconciledEur, 6000);
  assert.equal(summary.pendingEur, 0);
});

test('Diagnostic Endpoints: restricts sensitive system metrics to authenticated sessions', () => {
  // 1. Unauthenticated Request: must return minimal non-sensitive status
  const unauthReq = { headers: {} };
  const unauthRes = mockRes();
  healthHandler(unauthReq, unauthRes);

  assert.equal(unauthRes.statusCode, 200);
  assert.equal(unauthRes.body.ok, true);
  assert.equal(unauthRes.body.status, 'healthy');
  assert.equal(unauthRes.body.jwtSecretLength, undefined, 'Must not leak secret lengths to unauthenticated users');
  assert.equal(unauthRes.body.hasAdminUser, undefined, 'Must not leak administrative credential presence');
  assert.equal(unauthRes.body.hasAdminPass, undefined);
  assert.equal(unauthRes.body.vercelEnv, undefined);

  // 2. Authenticated Admin Request: provides operational diagnostics
  const validToken = signToken({ sub: 'Lataupe95', role: 'admin' });
  const authReq = { headers: { 'x-app-token': validToken } };
  const authRes = mockRes();
  healthHandler(authReq, authRes);

  assert.equal(authRes.statusCode, 200);
  assert.equal(authRes.body.ok, true);
  assert.equal(authRes.body.authenticated, true);
  assert.equal(authRes.body.services.ledger, 'operational');
  assert.equal(authRes.body.services.memory, 'operational');
  assert.equal(authRes.body.jwtSecretLength, undefined, 'Never expose secret lengths even to authenticated users');
});
