import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExecutionChain } from '../api/_lib/chain.js';
import LocalAiEngine from '../public/assets/local-ai.js';

test('Execution Chain: prioritizes free fast providers before paid models', () => {
  const chain = buildExecutionChain({
    keys: { groq: true, openai: true, cerebras: true }
  });

  const groqIdx = chain.findIndex(c => c.provider === 'groq');
  const openaiIdx = chain.findIndex(c => c.provider === 'openai');
  assert.ok(groqIdx !== -1 && openaiIdx !== -1);
  assert.ok(groqIdx < openaiIdx, 'Free cloud LPUs (Groq) must run before paid frontier models (OpenAI)');
});

test('Client AI Engine: detectCapabilities returns hardware & runtime structure', async () => {
  const caps = await LocalAiEngine.detectCapabilities();
  assert.ok(typeof caps === 'object');
  assert.ok('hasWebGPU' in caps);
  assert.ok('hasWasm' in caps);
  assert.ok('isMobile' in caps);
  assert.ok('recommendedEngine' in caps);
  assert.equal(caps.hasWasm, true, 'Modern environment must support WebAssembly');
});

test('Client AI Engine: executeBuiltInExecutive runs with ZERO API keys for all specialists', () => {
  LocalAiEngine.resetMetrics();

  // Test Billy
  const billyRes = LocalAiEngine.executeBuiltInExecutive('general', 'Plan my revenue');
  assert.ok(billyRes.content.includes('Billy'));
  assert.equal(billyRes.engine, 'built-in-executive');
  assert.ok(billyRes.durationMs >= 0);

  // Test Papou (Sales)
  const salesRes = LocalAiEngine.executeBuiltInExecutive('sales', 'Closing script');
  assert.ok(salesRes.content.includes('Papou'));
  assert.ok(salesRes.content.includes('Objection Handling Protocol'));

  // Test Coach (Athletics)
  const coachRes = LocalAiEngine.executeBuiltInExecutive('coach', 'Workout split');
  assert.ok(coachRes.content.includes('Coach'));
  assert.ok(coachRes.content.includes('Neuro-Fascia'));

  // Verify Performance Monitor metrics
  const metrics = LocalAiEngine.getMetrics();
  assert.equal(metrics.localRequests, 3);
  assert.equal(metrics.latencies.length, 3);
});
