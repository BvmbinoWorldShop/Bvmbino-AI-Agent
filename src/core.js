/**
 * core.js - Universal state and constants for the Bvmbino AI Agent.
 */

export const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export const MODELS = {
  'llama-3.3-70b-versatile': 'Groq · Llama 3.3 70B',
  'deepseek/deepseek-chat-v3-0324:free': 'OpenRouter · DeepSeek V3',
  'meta-llama/llama-3.3-70b-instruct:free': 'OpenRouter · Llama 3.3 Pro',
  'meta-llama/llama-3.2-90b-vision-instruct:free': 'OpenRouter · Llama 3.2 Vision',
  'gpt-4o': 'OpenAI · GPT-4o',
  'claude-3-5-sonnet-20240620': 'Anthropic · Claude 3.5'
};

// Application Store (Reactive State Backbone)
function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    get: () => state,
    set: (updates) => {
      const prev = { ...state };
      state = { ...state, ...updates };
      listeners.forEach(fn => fn(prev, state));
    },
    sub: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}

export const store = createStore({
  model: DEFAULT_MODEL,
  msgs: [],
  tokens: 1840,
  busy: false, // Replaces 'isGenerating' conceptually
  pills: { mem: true, web: false, pdf: false },
  slashSel: -1,
  slashItems: [],
  msgStore: {},
  translationOn: false,
  curSessId: null,
  activeClientId: null,
  showAllAgents: false,
  attachedFiles: [],
  clients: [],
  config: { temp: 0.7, stream: true },
  voiceLang: 'en-US',
  isRecording: false,
  recognition: null
});

// For backward compatibility while refactoring
export const state = store.get();

// Global Utilities
export function toast(msg) {
  const container = document.getElementById('toasts');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}

export function scrollBot() {
  const chat = document.getElementById('chat');
  if (chat) chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
}

export function lockTool(msg) { state.busy = true; if (msg) toast(msg); }
export function unlock() { state.busy = false; }
