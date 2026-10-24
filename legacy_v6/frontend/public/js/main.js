/**
 * main.js — Application Entry Point and Orchestration.
 * FIXED v3.6
 *
 * AUDIT NOTES (this is where the catastrophic bugs lived):
 *  - REMOVED `import { initAuth } from './auth.js'` — auth.js doesn't exist,
 *    this was throwing on module load and killing the entire app.
 *  - FIXED `import { state, initializeToken, initDB, ... } from './store.js'`
 *    — state and initializeToken live in core.js, not store.js. Was throwing
 *    a SyntaxError at module load.
 *  - FIXED `import { send, slash } from './render.js'` — send is in api.js,
 *    slash is in ui.js. render.js exports neither. Another module-load failure.
 *  - All inline-handler functions are now properly assigned to window so the
 *    HTML's `onclick="..."` attributes can find them.
 */

// FIX: Imports now point to the files that actually export each symbol.
import { state, initializeToken, lock, unlock, updTok, buildSys } from './core.js';
import { initDB, loadSession, saveToKnowledge, deleteSession } from './store.js';
import { send, callAI } from './api.js';
import {
  renderWelcome, renderHistory, renderClients, renderModels,
  updateModelBadge, toggleSettings, openSb, closeSb,
  newChat, setActiveClient, addNewClient, deleteClient, setModel,
  renderSkills, openTrain, setupGestures, initMemoryHub, editMemoryTier, togglePortfolio,
  slash
} from './ui.js';

/* --- GLOBAL EXPOSURE FOR HTML EVENT HANDLERS --- */
// Every function referenced from inline onclick="..." must be on window.
window.send = send;
window.callAI = callAI;
window.slash = slash;
window.newChat = newChat;
window.openSb = openSb;
window.closeSb = closeSb;
window.toggleSettings = toggleSettings;
window.setActiveClient = setActiveClient;
window.addNewClient = addNewClient;
window.deleteClient = deleteClient;
window.setModel = setModel;
window.openTrain = openTrain;
window.editMemoryTier = editMemoryTier;
window.togglePortfolio = togglePortfolio;
// FIX: deleteSession was being called by renderHistory's onclick but never assigned
window.deleteSession = deleteSession;

// --- VOICE & WAVEFORM ---
let isListening = false;
window.toggleVoice = () => {
  const mic = document.getElementById('micbtn');
  const wave = document.getElementById('waveform');
  const inp = document.getElementById('inp');

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    window.toast && window.toast('Speech recognition not supported');
    return;
  }

  if (!isListening) {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      isListening = true;
      if (mic) mic.classList.add('active', 'recording');
      if (wave) wave.classList.add('active');
      window.toast && window.toast('Listening...');
    };

    rec.onresult = (e) => {
      const result = e.results[0][0].transcript;
      if (inp) inp.value = result;
      window.send();
    };

    rec.onend = () => {
      isListening = false;
      if (mic) mic.classList.remove('active', 'recording');
      if (wave) wave.classList.remove('active');
    };

    rec.onerror = (e) => {
      isListening = false;
      if (mic) mic.classList.remove('active', 'recording');
      if (e.error !== 'no-speech') window.toast && window.toast('Voice error: ' + e.error);
    };

    rec.start();
  }
};

window.copyMsg = (mid) => {
  const data = state.msgStore[mid];
  if (!data) return;
  navigator.clipboard.writeText(data.text).catch(() => {});
  window.toast && window.toast('Copied to clipboard');
};

// FIX: Safer regen — finds the last AI bubble by class instead of trusting
// lastElementChild order (which breaks when tool banners are interleaved)
window.regenLast = () => {
  if (state.msgs.length < 2) return;
  // Pop trailing assistant message
  while (state.msgs.length && state.msgs[state.msgs.length - 1].role !== 'user') {
    state.msgs.pop();
  }
  // Remove the last assistant bubble from DOM
  const ci = document.getElementById('ci');
  if (ci) {
    const aiRows = ci.querySelectorAll('.mrow.ai, .mrow:not(.user)');
    const lastAi = Array.from(aiRows).reverse().find(r => !r.classList.contains('user'));
    if (lastAi) lastAi.remove();
  }
  window.toast && window.toast('Regenerating…');
  callAI();
};

window.resumeSession = async (id) => {
  const success = await loadSession(id);
  if (success) {
    renderHistory();
    closeSb();
    window.toast && window.toast('Conversation restored');
  }
};

window.expMsgPdf = async (mid) => {
  const data = state.msgStore[mid];
  if (!data) return;
  const { mdHtml } = await import('./render.js');
  const content = mdHtml(data.text);
  const preview = document.getElementById('preview-content');
  if (preview) {
    preview.innerHTML = content;
    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
  }
};

window.closePreview = () => {
  const modal = document.getElementById('preview-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
};

window.saveAsPdf = () => {
  if (typeof html2pdf === 'undefined') {
    window.toast && window.toast('PDF library not loaded');
    return;
  }
  const element = document.getElementById('preview-content');
  if (!element) return;
  const opt = {
    margin: 1,
    filename: `Bvmbino_Pro_Asset_${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
  window.toast && window.toast('PDF Exported ✓');
};

/* --- CORE INITIALIZATION --- */
async function init() {
  console.log("Bvmbino Auteur Engine: Initializing Architecture...");

  try {
    // 1. Token (non-blocking — app still loads if /api/token is missing)
    await initializeToken();

    // 2. DB
    await initDB();

    // 3. Initial UI Render
    renderWelcome();
    renderHistory();
    renderClients();
    renderModels();
    renderSkills();
    updateModelBadge(state.model);

    // 4. Memory hub & gestures
    initMemoryHub();
    setupGestures();

    // 5. Input handlers
    initInputHandlers();

    // 6. PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(() => console.log("Auteur Engine: PWA Shield Active"))
        .catch(err => console.warn("PWA registration failed:", err.message));
    }

    console.log("✓ Bvmbino Auteur Engine ready");
  } catch (err) {
    console.error("❌ Initialization failed:", err);
    // Render the welcome screen anyway so the user isn't staring at a blank page
    try { renderWelcome(); } catch {}
  }
}

function initInputHandlers() {
  const inp = document.getElementById('inp');
  const charCounter = document.getElementById('char-counter');

  if (inp) {
    inp.addEventListener('input', () => {
      inp.style.height = 'auto';
      inp.style.height = Math.min(inp.scrollHeight, 200) + 'px';

      const len = inp.value.length;
      if (charCounter) {
        charCounter.innerText = `${len}/2000`;
        charCounter.style.color = len > 1800 ? 'var(--rd)' : 'var(--t3)';
      }
    });

    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
  }

  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 640;
    const sb = document.getElementById('sb');
    if (!isMobile && sb) sb.classList.remove('open');
  });
}

// Start Engine
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
