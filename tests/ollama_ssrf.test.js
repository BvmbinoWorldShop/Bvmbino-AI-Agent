import test from 'node:test';
import assert from 'node:assert/strict';
import ollamaHandler from '../api/ollama.js';
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
    },
    end() {
      return this;
    }
  };
  return res;
}

const validToken = signToken({ sub: 'Lataupe95', auth: 'elite', role: 'admin' });

test('Ollama Relay SSRF: blocks AWS/GCP cloud metadata IP (169.254.169.254)', async () => {
  const req = {
    method: 'GET',
    headers: {
      'x-app-token': validToken
    },
    query: {
      host: 'http://169.254.169.254'
    }
  };
  const res = mockRes();

  await ollamaHandler(req, res);

  assert.equal(res.statusCode, 403, 'Metadata IP must be rejected with 403');
  assert.equal(res.body.ok, false);
  assert.ok(res.body.error.includes('SSRF Protection'), 'Must indicate SSRF Protection block');
});

test('Ollama Relay SSRF: blocks internal loopback and RFC 1918 private IPs (127.0.0.1, 10.0.0.1, 192.168.1.1)', async () => {
  const privateHosts = [
    'http://127.0.0.1:8080',
    'http://127.0.0.1:11434',
    'http://localhost:11434',
    'http://10.0.0.1:11434',
    'http://192.168.1.1',
    'http://172.16.0.5'
  ];

  for (const host of privateHosts) {
    const req = {
      method: 'GET',
      headers: {
        'x-app-token': validToken
      },
      query: { host }
    };
    const res = mockRes();

    await ollamaHandler(req, res);

    assert.equal(res.statusCode, 403, `Host ${host} must be rejected with 403`);
    assert.ok(res.body.error.includes('SSRF Protection'), `Host ${host} must trigger SSRF Protection`);
  }
});

test('Ollama Relay SSRF: blocks non-HTTP protocols (file://, gopher://, ftp://)', async () => {
  const badProtocols = [
    'file:///etc/passwd',
    'gopher://127.0.0.1:11434',
    'ftp://attacker.com/malware'
  ];

  for (const host of badProtocols) {
    const req = {
      method: 'GET',
      headers: {
        'x-app-token': validToken
      },
      query: { host }
    };
    const res = mockRes();

    await ollamaHandler(req, res);

    assert.equal(res.statusCode, 403, `Protocol in ${host} must be rejected with 403`);
    assert.ok(res.body.error.includes('SSRF Protection'));
  }
});

test('Ollama Relay SSRF: blocks cloud metadata hostnames (metadata.google.internal)', async () => {
  const req = {
    method: 'GET',
    headers: {
      'x-app-token': validToken
    },
    query: {
      host: 'http://metadata.google.internal'
    }
  };
  const res = mockRes();

  await ollamaHandler(req, res);

  assert.equal(res.statusCode, 403);
  assert.ok(res.body.error.includes('SSRF Protection'));
});

test('Ollama Relay: requires strong authentication to access relay', async () => {
  const req = {
    method: 'GET',
    headers: {}, // No token
    query: {
      host: 'https://example.com'
    }
  };
  const res = mockRes();

  await ollamaHandler(req, res);

  assert.equal(res.statusCode, 403, 'Unauthenticated request must be rejected');
  assert.ok(res.body.error.includes('Unauthorized'));
});
