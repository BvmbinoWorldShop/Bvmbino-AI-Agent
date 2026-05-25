/**
 * memory.js - Semantic Memory Engine (Drop-in module)
 * Uses cosine similarity on simple embeddings for local-first contextual recall.
 */

function cosineSimilarity(a, b) {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

// Fixed-size pre-normalized character spectrum vector
function fakeEmbedding(text) {
  const vec = new Array(128).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    vec[code % 128]++;
  }
  const mag = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map(v => v / (mag || 1));
}

export function createMemory() {
  let mem = JSON.parse(localStorage.getItem('bv_semantic_mem') || '[]');

  function save() {
    localStorage.setItem('bv_semantic_mem', JSON.stringify(mem));
  }

  function add(text) {
    if (!text || text.length < 10) return; // Skip trivial inputs
    
    const item = {
      text,
      embedding: fakeEmbedding(text),
      timestamp: Date.now()
    };

    mem.push(item);
    save();
  }

  function search(query, topK = 3) {
    if (!query) return [];
    
    const qEmb = fakeEmbedding(query);

    return mem
      .map(m => ({
        ...m,
        score: cosineSimilarity(qEmb, m.embedding)
      }))
      .filter(m => m.score > 0.3) // threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  function getAll() {
    return mem;
  }

  return { add, search, getAll };
}

export const memory = createMemory();
