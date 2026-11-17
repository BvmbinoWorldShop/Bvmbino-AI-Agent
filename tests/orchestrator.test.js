import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExecutionChain } from '../api/_lib/chain.js';

test('Orchestrator Chain: prioritizes free providers before paid providers', () => {
  const allKeys = {
    groq: 'test-groq-key',
    cerebras: 'test-cerebras-key',
    openrouter: 'test-openrouter-key',
    gemini: 'test-gemini-key',
    mistral: 'test-mistral-key',
    openai: 'test-openai-key',
    anthropic: 'test-anthropic-key'
  };

  const chain = buildExecutionChain({ keys: allKeys });

  // Find index of first appearance of each provider
  const indexOf = (p) => chain.findIndex(c => c.provider === p);

  const groqIndex = indexOf('groq');
  const cerebrasIndex = indexOf('cerebras');
  const openrouterIndex = indexOf('openrouter');
  const geminiIndex = indexOf('gemini');
  const openaiIndex = indexOf('openai');
  const anthropicIndex = indexOf('anthropic');

  // Verify free providers appear before paid providers (openai, anthropic)
  assert.ok(groqIndex !== -1, 'Groq should be in chain');
  assert.ok(cerebrasIndex !== -1, 'Cerebras should be in chain');
  assert.ok(geminiIndex !== -1, 'Gemini should be in chain');
  assert.ok(openaiIndex !== -1, 'OpenAI should be in chain');
  assert.ok(anthropicIndex !== -1, 'Anthropic should be in chain');

  assert.ok(groqIndex < openaiIndex, 'Groq must be prioritized before OpenAI');
  assert.ok(groqIndex < anthropicIndex, 'Groq must be prioritized before Anthropic');
  assert.ok(cerebrasIndex < openaiIndex, 'Cerebras must be prioritized before OpenAI');
  assert.ok(cerebrasIndex < anthropicIndex, 'Cerebras must be prioritized before Anthropic');
  assert.ok(geminiIndex < openaiIndex, 'Gemini must be prioritized before OpenAI');
  assert.ok(geminiIndex < anthropicIndex, 'Gemini must be prioritized before Anthropic');
  assert.ok(openrouterIndex < openaiIndex, 'OpenRouter free must be prioritized before OpenAI');
  assert.ok(openrouterIndex < anthropicIndex, 'OpenRouter free must be prioritized before Anthropic');
});

test('Orchestrator Chain: prioritizes Gemini for multimodal PDF documents', () => {
  const keys = {
    groq: 'test-groq-key',
    gemini: 'test-gemini-key',
    anthropic: 'test-anthropic-key'
  };

  const chain = buildExecutionChain({
    keys,
    pdfDocuments: [{ data: 'base64pdf...', mimeType: 'application/pdf' }]
  });

  assert.equal(chain[0].provider, 'gemini');
  assert.equal(chain[0].model, 'gemini-2.0-flash');
});

test('Orchestrator Chain: honors explicitly requested model first if key exists', () => {
  const keys = {
    groq: 'test-groq',
    anthropic: 'test-anthropic'
  };

  const chain = buildExecutionChain({
    keys,
    requestedModel: 'claude-3-5-sonnet-latest'
  });

  assert.equal(chain[0].provider, 'anthropic');
  assert.equal(chain[0].model, 'claude-3-5-sonnet-latest');
  // Second item should fall back to free provider (Groq)
  assert.equal(chain[1].provider, 'groq');
});
