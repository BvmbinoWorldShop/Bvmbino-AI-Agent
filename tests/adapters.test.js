import test from 'node:test';
import assert from 'node:assert/strict';
import { transformAnthropicPayload } from '../api/_lib/adapters/anthropic.js';
import { ADAPTERS, executeAdapter } from '../api/_lib/adapters/index.js';

test('Adapters: transforms Anthropic payload correctly', () => {
  const inputMessages = [
    { role: 'system', content: 'You are Billy, sovereign orchestrator.' },
    { role: 'user', content: 'What is the revenue target?' },
    { role: 'assistant', content: 'The target is $10M ARR.' },
    { role: 'system', content: 'Always emphasize execution speed.' },
    { role: 'user', content: 'Break it down into quarters.' }
  ];

  const payload = transformAnthropicPayload(inputMessages, 'Base System Instructions', 1500, 0.7, 'claude-3-5-sonnet-latest', false);

  // System should be top-level and contain all system prompts
  assert.ok(payload.system.includes('Base System Instructions'));
  assert.ok(payload.system.includes('You are Billy'));
  assert.ok(payload.system.includes('Always emphasize execution speed'));

  // Messages array MUST NOT contain any 'system' role
  const hasSystemRole = payload.messages.some(m => m.role === 'system');
  assert.equal(hasSystemRole, false, 'Anthropic messages array must not contain system role');

  // Messages should have only user and assistant
  assert.equal(payload.messages.length, 3);
  assert.equal(payload.messages[0].role, 'user');
  assert.equal(payload.messages[1].role, 'assistant');
  assert.equal(payload.messages[2].role, 'user');

  // Max tokens must be present
  assert.equal(payload.max_tokens, 1500);
  assert.equal(payload.model, 'claude-3-5-sonnet-latest');
});

test('Adapters: merges consecutive same-role messages for Anthropic', () => {
  const inputMessages = [
    { role: 'user', content: 'First user prompt' },
    { role: 'user', content: 'Second user prompt immediately after' }
  ];

  const payload = transformAnthropicPayload(inputMessages, '', 1024);
  assert.equal(payload.messages.length, 1);
  assert.ok(payload.messages[0].content.includes('First user prompt'));
  assert.ok(payload.messages[0].content.includes('Second user prompt'));
});

test('Adapters: registry exposes all required providers', () => {
  const expectedProviders = ['groq', 'cerebras', 'openrouter', 'gemini', 'anthropic', 'openai', 'mistral'];
  for (const p of expectedProviders) {
    assert.ok(typeof ADAPTERS[p] === 'function', `Provider adapter ${p} must be defined`);
  }
});

test('Adapters: throws clean 401 error if API key is missing', async () => {
  for (const p of ['groq', 'cerebras', 'openrouter', 'gemini', 'anthropic', 'openai', 'mistral']) {
    await assert.rejects(
      async () => {
        await executeAdapter(p, { key: null });
      },
      (err) => {
        assert.equal(err.status, 401);
        assert.equal(err.isPermanentAuthFailure, true);
        return true;
      }
    );
  }
});
