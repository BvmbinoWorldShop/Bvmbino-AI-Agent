/**
 * main.js - Application Entry Point and Orchestration.
 */

import { state, toast, scrollBot, LEVELS } from './core.js';
import { initDB, loadSessions, loadClients, loadKnowledge } from './store.js';
import { renderHistory, renderClients, updateModelBadge } from './ui.js';
import { detectIntent, smartRouteMsg } from './router.js';
import { callAI, send } from './api.js';
import { addUserMsg, appendAiText } from './render.js';

async function init() {
    console.log("Bvmbino Auteur Engine: Initializing...");
    
    try {
        await initDB();
        await renderHistory();
        await renderClients();
        updateModelBadge(state.model);
        
        // Restore tool panel state
        const s = localStorage.getItem('tools_open');
        if (s === '0') {
            const p = document.getElementById('toolsPanel');
            const a = document.getElementById('tools-arrow');
            if (p) { p.style.maxHeight = '0px'; if (a) a.style.transform = 'rotate(-90deg)'; }
        }

        // PWA Registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log("Auteur Engine: PWA Shield Active"))
                .catch(err => console.error("PWA Registration failed:", err));
        }
        
    } catch (err) {
        console.error("Initialization failed:", err);
        toast("System initialization error.");
    }
}

// Global scope attachments for HTML event handlers
window.send = send;
window.callAI = callAI;
window.addUserMsg = addUserMsg;
window.appendAiText = appendAiText;

// Input handling
window.onInp = function() {
  const el = document.getElementById('inp');
  if (!el) return;
  el.style.height = 'auto'; 
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  
  const chars = el.value.length; 
  const cc = document.getElementById('char-counter');
  if (cc) { 
    cc.textContent = chars > 0 ? `${chars.toLocaleString()} chars` : ''; 
    cc.style.color = chars > 3500 ? 'var(--rd)' : chars > 2000 ? 'var(--am)' : 'var(--t3)'; 
  }
};

window.onKey = function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { 
    e.preventDefault(); 
    send(); 
  }
};

document.addEventListener('DOMContentLoaded', init);

// Swipe listeners
let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', e => { 
    touchStartX = e.touches[0].clientX; 
    touchStartY = e.touches[0].clientY; 
}, { passive: true });

document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < Math.abs(dy) * 2 || Math.abs(dx) < 50) return;
    if (dx > 0 && touchStartX < 40 && window.openSb) window.openSb();
    else if (dx < 0 && window.closeSb) window.closeSb();
}, { passive: true });
