/**
 * offline.js - Persistent Cache Engine
 * Provides offline resilience and fast repeated queries.
 */

export function createOffline() {
  const cache = JSON.parse(localStorage.getItem('bv_offline_cache') || '{}');

  function save() {
    localStorage.setItem('bv_offline_cache', JSON.stringify(cache));
  }

  function get(key) {
    return cache[key];
  }

  function set(key, value) {
    // Only cache significant responses to avoid blowing up storage
    if (value && value.length > 10) {
      cache[key] = value;
      save();
    }
  }

  function has(key) {
    return key in cache;
  }

  return { get, set, has };
}

export const offline = createOffline();
