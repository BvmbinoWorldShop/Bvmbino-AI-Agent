import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

test('Build: dist/ exists and contains optimized index.html and compressed assets', () => {
  const distIndex = path.join('dist', 'index.html');
  const distBr = path.join('dist', 'index.html.br');
  const distGz = path.join('dist', 'index.html.gz');

  assert.ok(fs.existsSync(distIndex), 'dist/index.html must exist');
  assert.ok(fs.existsSync(distBr), 'dist/index.html.br must exist');
  assert.ok(fs.existsSync(distGz), 'dist/index.html.gz must exist');

  const size = fs.statSync(distIndex).size;
  // File size should be well under 1 MB (previously 24.9 MB)
  assert.ok(size < 1000 * 1024, `dist/index.html size (${size} bytes) should be < 1MB`);
  assert.ok(size > 50 * 1024, 'dist/index.html must contain full application markup');
});

test('Build: all extracted avatar assets exist in dist/assets/avatars/', () => {
  const avatarsDir = path.join('dist', 'assets', 'avatars');
  assert.ok(fs.existsSync(avatarsDir), 'dist/assets/avatars/ must exist');

  const requiredAvatars = [
    'billy.png',
    'apple-touch-icon.png',
    'lex.png',
    'budget.jpg',
    'psych.png',
    'sales.png',
    'security.png',
    'coach.png',
    'present.png',
    'leads.png',
    'website.png',
    'writer.png',
    'content.png',
    'aimas.png',
    'aros.png',
    'campaign.png',
    'email.png',
    'outreach.png',
    'proposal.png',
    'automate.png',
    'qualify.png',
    'analytics.png',
    'course.png',
    'resume.png',
    'schedule.png'
  ];

  for (const avatar of requiredAvatars) {
    const p = path.join(avatarsDir, avatar);
    assert.ok(fs.existsSync(p), `Avatar asset ${avatar} must exist in dist`);
    assert.ok(fs.statSync(p).size > 10000, `Avatar asset ${avatar} must have valid non-zero size`);
  }
});
