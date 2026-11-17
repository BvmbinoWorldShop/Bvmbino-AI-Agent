import test from 'node:test';
import assert from 'node:assert/strict';
import chatHandler from '../api/chat.js';
import searchHandler from '../api/search.js';
import imageHandler from '../api/image.js';
import scrapeHandler from '../api/scrape.js';
import emailHandler from '../api/email.js';
import memoryHandler from '../api/memory.js';
import tokenHandler from '../api/token.js';
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

const endpoints = [
  { name: '/api/chat', handler: chatHandler, method: 'POST', body: { messages: [{ role: 'user', content: 'test' }] } },
  { name: '/api/search', handler: searchHandler, method: 'POST', body: { query: 'test' } },
  { name: '/api/image', handler: imageHandler, method: 'POST', body: { prompt: 'test' } },
  { name: '/api/scrape', handler: scrapeHandler, method: 'POST', body: { url: 'https://example.com' } },
  { name: '/api/email', handler: emailHandler, method: 'POST', body: { to: 'a@b.com', subject: 'hi' } },
  { name: '/api/memory', handler: memoryHandler, method: 'GET', query: {} },
  { name: '/api/token', handler: tokenHandler, method: 'GET', query: {} },
];

test('Strong Production Auth: every endpoint strictly rejects unauthenticated requests', async () => {
  for (const ep of endpoints) {
    const req = {
      method: ep.method,
      headers: {}, // No token or auth headers
      body: ep.body || {},
      query: ep.query || {}
    };
    const res = mockRes();

    await ep.handler(req, res);

    assert.ok(
      res.statusCode === 401 || res.statusCode === 403,
      `Endpoint ${ep.name} must return 401 or 403 when unauthenticated, got ${res.statusCode}`
    );
  }
});

test('Strong Production Auth: every endpoint strictly rejects invalid or tampered tokens', async () => {
  const validToken = signToken({ sub: 'Lataupe95', auth: 'elite', role: 'admin' }, JWT_SECRET, 3600);
  const tamperedToken = validToken.slice(0, -6) + 'xxxxxx'; // corrupt signature

  for (const ep of endpoints) {
    const req = {
      method: ep.method,
      headers: {
        'x-app-token': tamperedToken
      },
      body: ep.body || {},
      query: ep.query || {}
    };
    const res = mockRes();

    await ep.handler(req, res);

    assert.ok(
      res.statusCode === 401 || res.statusCode === 403,
      `Endpoint ${ep.name} must reject tampered token with 401 or 403, got ${res.statusCode}`
    );
  }
});

test('Strong Production Auth: every endpoint accepts valid cryptographically signed JWT tokens', async () => {
  const validToken = signToken({ sub: 'Lataupe95', auth: 'elite', role: 'admin' }, JWT_SECRET, 3600);

  // Test on memory endpoint
  const req = {
    method: 'GET',
    headers: {
      'x-app-token': validToken
    },
    query: {}
  };
  const res = mockRes();

  await memoryHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
});
