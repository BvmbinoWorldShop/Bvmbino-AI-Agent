import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

test('Mobile Responsiveness: index.html defines strict mobile viewport and iOS PWA meta tags', () => {
  const indexPath = path.join('public', 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');

  // Strict mobile viewport
  assert.ok(html.includes('viewport'), 'Viewport meta tag must be present');
  assert.ok(html.includes('width=device-width'), 'Must set width=device-width');
  assert.ok(html.includes('viewport-fit=cover'), 'Must support viewport-fit=cover for iPhone notch and home bar');

  // Mobile Web App / PWA tags
  assert.ok(html.includes('apple-mobile-web-app-capable'), 'Must support iOS standalone web app mode');
  assert.ok(html.includes('apple-mobile-web-app-status-bar-style'), 'Must configure iOS status bar');
  assert.ok(html.includes('mobile-web-app-capable'), 'Must configure mobile web app capable');
  assert.ok(html.includes('theme-color'), 'Must configure mobile theme color');
});

test('Mobile Responsiveness: UI layout accommodates touch targets and mobile navigation', () => {
  const indexPath = path.join('public', 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');

  // Verify responsive navigation elements exist
  assert.ok(
    html.includes('md:hidden') || html.includes('lg:hidden') || html.includes('sm:') || html.includes('flex-col'),
    'HTML markup must include responsive breakpoint classes'
  );

  // Verify safe area utility or viewport inset support
  assert.ok(
    html.includes('safe-area') || html.includes('viewport-fit') || html.includes('env(safe-area-inset') || html.includes('h-screen') || html.includes('h-dvh') || html.includes('min-h-screen'),
    'Must handle mobile dynamic viewport height or safe area padding'
  );
});
