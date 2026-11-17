import test from 'node:test';
import assert from 'node:assert/strict';
import { SovereignDeviceDB } from '../public/assets/device-db.js';

test('Device Persistence: stores, retrieves, and deletes memory items on user device', async () => {
  // Mock localStorage for node environment if not present
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    };
  }

  const testFact = {
    id: 'dev_fact_001',
    text: 'Sovereign mobile memory operates directly on user hardware',
    type: 'confirmed_fact',
    venture: 'EntrepriseAI',
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  // Put item
  await SovereignDeviceDB.putMemoryItem(testFact);

  // Retrieve item
  const allItems = await SovereignDeviceDB.getAllMemoryItems();
  assert.ok(Array.isArray(allItems));
  const retrieved = allItems.find(i => i.id === testFact.id);
  assert.ok(retrieved, 'Fact must exist in user device database');
  assert.equal(retrieved.text, testFact.text);

  // Update item
  testFact.text = 'Updated fact stored on device';
  await SovereignDeviceDB.putMemoryItem(testFact);
  const updatedItems = await SovereignDeviceDB.getAllMemoryItems();
  const updated = updatedItems.find(i => i.id === testFact.id);
  assert.equal(updated.text, 'Updated fact stored on device');

  // Delete item
  await SovereignDeviceDB.deleteMemoryItem(testFact.id);
  const postDeleteItems = await SovereignDeviceDB.getAllMemoryItems();
  assert.equal(postDeleteItems.some(i => i.id === testFact.id), false, 'Deleted item must not exist');
});

test('Device Persistence: records, audits, and exports ledger on user device', async () => {
  const testRecord = {
    id: 'dev_rec_999',
    venture: 'FormationPro',
    amount: 1500,
    currency: 'EUR',
    client: 'Acme Corp',
    type: 'invoice_payment',
    date: '2026-11-15',
    verified: true,
    verificationStatus: 'verified'
  };

  await SovereignDeviceDB.putLedgerRecord(testRecord);

  const allRecords = await SovereignDeviceDB.getAllLedgerRecords();
  assert.ok(allRecords.some(r => r.id === testRecord.id));

  // Export full snapshot
  const snapshot = await SovereignDeviceDB.exportSnapshot();
  assert.ok(snapshot.exportedAt);
  assert.equal(snapshot.platform, 'bvmbino-device-indexeddb');
  assert.ok(snapshot.ledgerRecords.some(r => r.id === testRecord.id));

  // Clean up
  await SovereignDeviceDB.deleteLedgerRecord(testRecord.id);
  const postDeleteRecords = await SovereignDeviceDB.getAllLedgerRecords();
  assert.equal(postDeleteRecords.some(r => r.id === testRecord.id), false);
});

test('Device Persistence: imports external backup snapshot (merge and replace)', async () => {
  const backup = {
    memoryItems: [
      { id: 'import_mem_1', text: 'Imported rule 1', type: 'target', status: 'active' },
      { id: 'import_mem_2', text: 'Imported rule 2', type: 'assumption', status: 'active' }
    ],
    ledgerRecords: [
      { id: 'import_rec_1', venture: 'KeoJus', amount: 800, currency: 'EUR', verified: true }
    ],
    summaries: [
      { id: 'import_sum_1', title: 'Q4 Review', summary: 'Agreed on targets', timestamp: new Date().toISOString() }
    ]
  };

  const result = await SovereignDeviceDB.importSnapshot(backup, 'replace');
  assert.equal(result.success, true);
  assert.equal(result.importedItems, 2);
  assert.equal(result.importedRecords, 1);

  const currentItems = await SovereignDeviceDB.getAllMemoryItems();
  assert.equal(currentItems.length, 2);

  const currentRecords = await SovereignDeviceDB.getAllLedgerRecords();
  assert.equal(currentRecords.length, 1);
});
