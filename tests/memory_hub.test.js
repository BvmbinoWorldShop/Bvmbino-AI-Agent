import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MEMORY_TIERS,
  addMemoryItem,
  updateMemoryItem,
  supersedeMemoryItem,
  deleteMemoryItem,
  findDuplicateMemory,
  retrieveRelevantMemory,
  createConversationSummary,
  exportMemoryBackup,
  importMemoryBackup,
  formatRelevantMemoryForPrompt,
  resetPersistentMemory,
  loadPersistentMemory
} from '../api/_lib/memory.js';

test('Memory Hub Tiers: strictly separates confirmed facts, assumptions, and targets', () => {
  resetPersistentMemory();

  // 1. Confirmed Fact
  const factRes = addMemoryItem({
    text: 'FormationPro signed an exclusive partnership with Paris Chamber of Commerce.',
    type: MEMORY_TIERS.CONFIRMED_FACT,
    venture: 'FormationPro',
    confidence: 1.0
  });
  assert.equal(factRes.item.type, 'confirmed_fact');
  assert.equal(factRes.item.confidence, 1.0);
  assert.ok(factRes.item.id.startsWith('fact_'));

  // 2. Working Assumption
  const assumptionRes = addMemoryItem({
    text: 'Client conversion rate might increase by 15% after site redesign.',
    type: MEMORY_TIERS.ASSUMPTION,
    venture: 'Purgo Clean',
    confidence: 0.45
  });
  assert.equal(assumptionRes.item.type, 'assumption');
  assert.equal(assumptionRes.item.confidence, 0.45);
  assert.ok(assumptionRes.item.id.startsWith('mem_'));

  // 3. Target
  const targetRes = addMemoryItem({
    text: 'Reach 50,000 EUR monthly recurring revenue across all 4 ventures by Q4.',
    type: MEMORY_TIERS.TARGET,
    venture: 'Global',
    confidence: 0.75
  });
  assert.equal(targetRes.item.type, 'target');
  assert.equal(targetRes.item.confidence, 0.75);

  // Validate prompt formatting strictly differentiates them
  const prompt = formatRelevantMemoryForPrompt('FormationPro Purgo revenue');
  assert.ok(prompt.includes('[CONFIRMED FACTS'));
  assert.ok(prompt.includes('Paris Chamber of Commerce'));
  assert.ok(prompt.includes('[ACTIVE TARGETS & GOALS'));
  assert.ok(prompt.includes('Reach 50,000 EUR'));
  assert.ok(prompt.includes('[WORKING ASSUMPTIONS & HYPOTHESES'));
  assert.ok(prompt.includes('conversion rate might increase'));
});

test('Memory Hub User-Editable: allows direct editing of facts and metadata', () => {
  resetPersistentMemory();

  const created = addMemoryItem({
    text: 'Keo Jus has 10 active distribution points in Plateau, Abidjan.',
    type: MEMORY_TIERS.CONFIRMED_FACT,
    venture: 'Keo Jus'
  });

  const updated = updateMemoryItem(created.item.id, {
    text: 'Keo Jus has 18 active distribution points in Plateau and Cocody, Abidjan.',
    category: 'distribution'
  });

  assert.equal(updated.id, created.item.id);
  assert.equal(updated.text, 'Keo Jus has 18 active distribution points in Plateau and Cocody, Abidjan.');
  assert.equal(updated.category, 'distribution');

  // Verify deletion
  const deleted = deleteMemoryItem(created.item.id);
  assert.equal(deleted, true);

  const mem = loadPersistentMemory();
  const found = mem.items.find(i => i.id === created.item.id);
  assert.equal(found, undefined);
});

test('Memory Hub Duplicate Detection: flags near-identical statements via token overlap', () => {
  resetPersistentMemory();

  const first = addMemoryItem({
    text: 'Purgo Clean signed maintenance contracts for 5 corporate headquarters in La Defense.',
    type: MEMORY_TIERS.CONFIRMED_FACT,
    venture: 'Purgo Clean'
  });
  assert.equal(first.isDuplicate, false);

  // Same venture, slight variations in words
  const dupCheck = findDuplicateMemory('Purgo Clean signed maintenance contracts for 5 corporate headquarters in La Defense.', 'Purgo Clean');
  assert.ok(dupCheck);
  assert.equal(dupCheck.isDuplicate, true);
  assert.ok(dupCheck.similarity >= 0.8);

  // Adding with allowDuplicate: false returns the existing item
  const second = addMemoryItem({
    text: 'Purgo Clean signed maintenance contracts for 5 corporate headquarters in La Defense.',
    type: MEMORY_TIERS.CONFIRMED_FACT,
    venture: 'Purgo Clean',
    allowDuplicate: false
  });
  assert.equal(second.isDuplicate, true);
  assert.equal(second.item.id, first.item.id);
});

test('Memory Hub Supersede: corrects outdated facts with audit link to replacement', () => {
  resetPersistentMemory();

  const oldFact = addMemoryItem({
    text: 'Entreprise AI offers 3 sovereign agent models: Scout, Builder, Sentinel.',
    type: MEMORY_TIERS.CONFIRMED_FACT,
    venture: 'Entreprise AI'
  });

  const { newItem, oldItem } = supersedeMemoryItem(
    oldFact.item.id,
    'Entreprise AI offers 24 specialist agents orchestrated by Billy with local-first execution.',
    { venture: 'Entreprise AI' }
  );

  assert.equal(oldItem.status, 'superseded');
  assert.equal(oldItem.supersededBy, newItem.id);
  assert.equal(newItem.status, 'active');
  assert.ok(newItem.text.includes('24 specialist agents'));

  // Prompt should only include the active fact, never superseded facts
  const prompt = formatRelevantMemoryForPrompt('Entreprise AI specialist models');
  assert.ok(prompt.includes('24 specialist agents'));
  assert.ok(!prompt.includes('Scout, Builder, Sentinel'));
});

test('Memory Hub Relevance Retrieval: ranks items matching query terms and active venture', () => {
  resetPersistentMemory();

  addMemoryItem({
    text: 'Purgo Clean uses eco-certified biodegradable cleaning products across all client sites.',
    type: MEMORY_TIERS.CONFIRMED_FACT,
    venture: 'Purgo Clean',
    tags: ['eco', 'cleaning', 'products']
  });

  addMemoryItem({
    text: 'FormationPro provides Qualiopi accredited training modules for security and logistics.',
    type: MEMORY_TIERS.CONFIRMED_FACT,
    venture: 'FormationPro',
    tags: ['training', 'qualiopi']
  });

  const retrieved = retrieveRelevantMemory({
    query: 'eco certified products cleaning',
    venture: 'Purgo Clean'
  });

  assert.ok(retrieved.items.length > 0);
  assert.equal(retrieved.items[0].venture, 'Purgo Clean');
  assert.ok(retrieved.items[0].text.includes('eco-certified'));
});

test('Memory Hub Summarisation: extracts decisions and action items from message turns', () => {
  resetPersistentMemory();

  const messages = [
    { role: 'user', content: 'What is our priority for Keo Jus next week?' },
    { role: 'assistant', content: 'We decided to prioritize signing the distributor agreement with Accor Hotels and launch the passion fruit blend.' },
    { role: 'user', content: 'Agreed. Next step is meeting their procurement director on Thursday.' }
  ];

  const summary = createConversationSummary({
    sessionId: 'sess_test_123',
    messages,
    title: 'Keo Jus Distribution Strategy'
  });

  assert.ok(summary);
  assert.equal(summary.title, 'Keo Jus Distribution Strategy');
  assert.ok(summary.actionItems.length > 0);
  assert.ok(summary.actionItems.some(a => a.toLowerCase().includes('accor') || a.toLowerCase().includes('distributor')));

  const mem = loadPersistentMemory();
  assert.ok(mem.summaries.some(s => s.id === summary.id));
});

test('Memory Hub Backup: exports and imports persistent state with merge and replace modes', () => {
  resetPersistentMemory();

  addMemoryItem({
    text: 'Baseline fact item 1',
    type: MEMORY_TIERS.CONFIRMED_FACT,
    venture: 'FormationPro'
  });

  const backup = exportMemoryBackup();
  assert.equal(backup.exportVersion, 3);
  assert.ok(Array.isArray(backup.memoryItems));
  assert.ok(backup.memoryItems.some(i => i.text.includes('Baseline fact item 1')));

  // Modify local memory
  resetPersistentMemory();
  addMemoryItem({
    text: 'New separate fact item 2',
    type: MEMORY_TIERS.CONFIRMED_FACT,
    venture: 'Keo Jus'
  });

  // Merge mode
  const mergeRes = importMemoryBackup(backup, 'merge');
  assert.equal(mergeRes.success, true);
  const afterMerge = loadPersistentMemory();
  assert.ok(afterMerge.items.some(i => i.text.includes('Baseline fact item 1')));
  assert.ok(afterMerge.items.some(i => i.text.includes('New separate fact item 2')));

  // Replace mode
  const replaceRes = importMemoryBackup(backup, 'replace');
  assert.equal(replaceRes.success, true);
  const afterReplace = loadPersistentMemory();
  assert.ok(afterReplace.items.some(i => i.text.includes('Baseline fact item 1')));
  assert.ok(!afterReplace.items.some(i => i.text.includes('New separate fact item 2')));
});
