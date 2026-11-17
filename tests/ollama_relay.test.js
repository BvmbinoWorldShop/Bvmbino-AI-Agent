import test from 'node:test';
import assert from 'node:assert/strict';
import ollamaHandler from '../api/ollama.js';
import { signToken, JWT_SECRET } from '../api/_lib/auth.js';

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

const validToken = signToken({ sub: 'Lataupe95', auth: 'elite', role: 'admin' }, JWT_SECRET, 3600);

test('Ollama Relay: requires strong authentication', async () => {
  const req = {
    method: 'GET',
    headers: {}, // No token
    query: { host: 'https://example.com' }
  };
  const res = mockRes();

  await ollamaHandler(req, res);
  assert.equal(res.statusCode, 403);
  assert.ok(res.body.error.includes('Unauthorized'));
});

test('Ollama Relay SSRF: blocks cloud metadata and private IP targets', async () => {
  const forbiddenHosts = [
    'http://169.254.169.254',
    'http://metadata.google.internal',
    'http://10.0.0.1:11434',
    'http://192.168.1.1:11434'
  ];

  for (const host of forbiddenHosts) {
    const req = {
      method: 'GET',
      headers: { 'x-app-token': validToken },
      query: { host }
    };
    const res = mockRes();

    await ollamaHandler(req, res);
    assert.equal(res.statusCode, 403, `Host ${host} must be blocked by SSRF filter`);
    assert.ok(res.body.error.includes('SSRF Protection'));
  }
});
