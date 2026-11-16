import test from 'node:test';
import assert from 'node:assert/strict';
import { executeOllama } from '../api/_lib/adapters/ollama.js';
import { buildExecutionChain } from '../api/_lib/chain.js';
import LocalAiEngine from '../public/assets/local-ai.js';

test('Local AI: executeOllama formats payload properly and handles offline host gracefully', async () => {
  // Test connection to non-existent port to verify clean error handling without unhandled crash
  await assert.rejects(
    async () => {
      await executeOllama({
        model: 'llama3.2',
        messages: [{ role: 'user', content: 'Hello local AI' }],
        host: 'http://127.0.0.1:54321', // Unused port
        timeoutMs: 800
      });
    },
    (err) => {
      assert.ok(err.isModelSpecificFailure || err.isLocalOffline);
      return true;
    }
  );
});

test('Local AI: buildExecutionChain includes Ollama when local runner is active', () => {
  const chainWithLocal = buildExecutionChain({
    keys: { ollama: true }
  });

  const ollamaEntry = chainWithLocal.find(c => c.provider === 'ollama');
  assert.ok(ollamaEntry, 'Chain must include ollama when local key/flag is present');
  assert.equal(ollamaEntry.model, 'llama3.2');
});

test('Local AI Engine: detectCapabilities returns hardware & runtime structure', async () => {
  const caps = await LocalAiEngine.detectCapabilities();
  assert.ok(typeof caps === 'object');
  assert.ok('hasWebGPU' in caps);
  assert.ok('hasWasm' in caps);
  assert.ok('hasOllama' in caps);
  assert.ok('recommendedEngine' in caps);
  assert.equal(caps.hasWasm, true, 'Node/modern environment must support WebAssembly');
});

test('Local AI Engine: executeBuiltInExecutive runs with ZERO API keys for all specialists', () => {
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
