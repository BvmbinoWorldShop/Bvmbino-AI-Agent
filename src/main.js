/**
 * main.js - Application Entry Point and Orchestration.
 */

import { initBridge } from './bridge.js';
import { state, toast, MODELS, store } from './core.js';
import { GRID_SKILLS } from './skills.js';
import { initDB } from './store.js';
import { send, requests } from './api.js';
import { renderWelcome, addUserMsg, appendAiText, toggleGrid } from './render.js';
import './voice.js'; // Billy Live initialization

// Static imports for rendering and UI logic
import { 
  renderHistory, 
  renderClients, 
  renderModels,
  updateModelBadge, 
  toggleLeftSidebar, 
  toggleRightSidebar,
  openMpanel,
  closeMpanel,
  openSb,
  closeSb,
  toggleModal,
  newChat,
  resumeSession,
  setActiveClient,
  deleteClient,
  editMemoryTier,
  setModel
} from './ui.js';

// ── IMMEDIATE SYNCHRONOUS GLOBAL HOOKS ──────────────────────────────────────
window.send = send;
window.addUserMsg = addUserMsg;
window.appendAiText = appendAiText;
window.toggleGrid = toggleGrid;
window.slash = (id) => {
  const el = document.getElementById('inp');
  if (el) {
    el.value = '/' + id + ' ';
    el.focus();
    App.onInp();
  }
  App.closeSlashMenu();
  toast(`Using Skill: /${id}`);
};

/**
 * BOOT - System Initialization Sequence
 */
async function boot() {
    console.log("BVMBINO Pro v6.1 · Booting…");
    
    // 1. Initialize Global Bridge (Legacy compatibility)
    try {
        await initBridge();
    } catch (e) {
        console.warn("Bridge non-critical warning:", e);
    }

    try {
        // 2. Data Infrastructure
        await initDB();
        
        // 3. State Rehydration
        state.model          = localStorage.getItem('v3_model') || state.model;
        state.activeClientId = localStorage.getItem('v3_active_client') || null;
        
        // 4. UI Restoration: Sidebars
        const leftCollapsed = localStorage.getItem('bvmbino_sb_left_collapsed');
        if (leftCollapsed === 'true') {
            document.getElementById('sb')?.classList.remove('open');
            document.getElementById('ov')?.classList.remove('open');
        } else if (leftCollapsed === 'false') {
            document.getElementById('sb')?.classList.add('open');
            document.getElementById('ov')?.classList.add('open');
        }

        const rightCollapsed = localStorage.getItem('bvmbino_sb_right_collapsed');
        if (rightCollapsed === 'true') {
            document.getElementById('mpanel')?.classList.add('closed');
        } else if (rightCollapsed === 'false') {
            document.getElementById('mpanel')?.classList.remove('closed');
        }

        // 5. Initial Rendering
        renderWelcome();
        window.__SKILLS__ = GRID_SKILLS;
        
        await renderHistory();
        await renderClients();
        renderModels();
        updateModelBadge(state.model);

        // 6. Reactive UI Subscriptions (State-Driven System)
        let lastMsgIndex = store.get().msgs.length;
        
        store.sub((prev, next) => {
            // Loading state -> input UI
            if (prev.busy !== next.busy) {
                const sbtn = document.getElementById('sbtn');
                const cancelBtn = document.getElementById('cancel-btn');
                if (sbtn) sbtn.style.display = next.busy ? 'none' : 'inline-block';
                if (cancelBtn) cancelBtn.style.display = next.busy ? 'inline-block' : 'none';
            }

            // Sync Chat with state (append only, no re-render)
            if (next.msgs.length > lastMsgIndex) {
                const newMsgs = next.msgs.slice(lastMsgIndex);
                newMsgs.forEach(m => {
                    if (m.role === 'user') {
                        addUserMsg(m.content);
                    } else if (m.role === 'assistant') {
                        appendAiText(m.content);
                    }
                });
                lastMsgIndex = next.msgs.length;
            } else if (next.msgs.length < lastMsgIndex) {
                // If messages were cleared or regenerated
                lastMsgIndex = next.msgs.length;
            }
        });

        // 7. Focus the input
        document.getElementById('inp')?.focus();

        console.log("✅ BVMBINO Pro System Online");
        
    } catch (err) {
        console.error("❌ Boot Sequence Interrupted:", err);
        toast("System initialization error.");
    }
}

/**
 * APP - UI Controller, Event Binding, Autocomplete & Gestures
 */
const App = {
    slashIndex: -1,
    activeMatches: [],

    init() {
        console.log("App: Binding UI Events...");
        this.bindEvents();
        this.bindGestures();
    },

    bindEvents() {
        // § Navigation & Sidebars
        this._on('mb-menu-btn',      'click', () => toggleLeftSidebar(true));
        this._on('sb-toggle-btn',    'click', () => toggleLeftSidebar());
        this._on('mp-toggle-btn',    'click', () => toggleRightSidebar());
        this._on('new-chat-btn',     'click', () => newChat());
        this._on('logo-btn',         'click', () => newChat());
        this._on('ov',               'click', () => toggleLeftSidebar(false));
        this._on('close-mpanel-btn', 'click', () => closeMpanel());
        this._on('close-voice-btn',  'click', () => window.BillyLive && BillyLive.close());
        this._on('end-voice-btn',    'click', () => window.BillyLive && BillyLive.close());

        // § Panel Toggles
        this._on('toggle-clients-btn', 'click', () => this._toggleCollapsible('client-panel', 'client-arrow'));
        this._on('toggle-history-btn', 'click', () => this._toggleCollapsible('hist', 'hist-arrow'));

        // § Tools & Modals
        this._on('tb-settings-btn',  'click', () => toggleModal('settings-modal', true));
        this._on('tb-mem-hub-btn',   'click', () => openMpanel());
        this._on('tb-gen-img-btn',   'click', () => toggleModal('image-modal', true));
        this._on('train-agent-btn',  'click', () => toggleModal('train-modal', true));
        this._on('add-client-btn',   'click', () => App.addNewClient());

        // § Memory Vault
        this._on('edit-ventures-btn', 'click', () => editMemoryTier('ventures'));
        this._on('edit-projects-btn', 'click', () => editMemoryTier('projects'));

        // § Input & Send
        const inp = document.getElementById('inp');
        if (inp) {
            inp.addEventListener('input', () => this.onInp());
            inp.addEventListener('keydown', (e) => this.onKey(e));
        }
        this._on('sbtn', 'click', () => { if (window.send) window.send(); });
        this._on('cancel-btn', 'click', () => {
            requests.cancel();
            toast('Generation stopped');
        });
        this._on('mic-btn', 'click', () => window.BillyLive && BillyLive.open());

        // § Global Delegations for Cards, Chips & Slash Menu
        document.addEventListener('click', (e) => {
            // Skill matrix cards
            const card = e.target.closest('.wcard[data-skill]');
            if (card) {
                const skillId = card.getAttribute('data-skill');
                if (skillId) window.slash(skillId);
                return;
            }

            // Expand / collapse grid
            const toggleBtn = e.target.closest('[data-toggle-grid]');
            if (toggleBtn) {
                toggleGrid();
                return;
            }

            // Slash autocomplete item
            const item = e.target.closest('.si[data-skill-id]');
            if (item) {
                const sid = item.getAttribute('data-skill-id');
                if (sid) window.slash(sid);
                return;
            }

            // Suggestion chips in messages
            const sugg = e.target.closest('.sugg-chip');
            if (sugg) {
                const txt = sugg.textContent.trim();
                const m = txt.match(/\/([a-z0-9_-]+)/i);
                if (m && m[1]) window.slash(m[1]);
                return;
            }

            // Click outside closes slash menu
            if (!e.target.closest('#smenu') && !e.target.closest('#inp')) {
                App.closeSlashMenu();
            }
        });

        // § History & Client item delegates
        document.getElementById('hist')?.addEventListener('click', (e) => {
            const del = e.target.closest('[data-delete-session]');
            const id = e.target.closest('[data-session-id]')?.dataset.sessionId;
            if (del) { e.stopPropagation(); App.deleteSession(del.dataset.deleteSession); }
            else if (id) resumeSession(id);
        });

        document.getElementById('client-list')?.addEventListener('click', (e) => {
            const del = e.target.closest('[data-delete-client]');
            const id = e.target.closest('[data-client-id]')?.dataset.clientId;
            if (del) { e.stopPropagation(); deleteClient(del.dataset.deleteClient, e); }
            else if (id) setActiveClient(id);
        });

        ['model-list', 'model-list-settings'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', (e) => {
                const item = e.target.closest('[data-model-id]');
                if (item) setModel(item.dataset.modelId);
            });
        });

        // Global shortcuts (Ctrl+K = New Chat, Escape = Close Modals)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                newChat();
            } else if (e.key === 'Escape') {
                App.closeSlashMenu();
                document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
            }
        });
    },

    onInp() {
        const el = document.getElementById('inp');
        if (!el) return;
        el.style.height = 'auto'; 
        el.style.height = Math.min(el.scrollHeight, 180) + 'px';

        const val = el.value;
        if (val.startsWith('/') && !val.includes(' ')) {
            const q = val.slice(1).toLowerCase();
            this.activeMatches = GRID_SKILLS.filter(s => 
                s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
            );
            this.slashIndex = 0;
            this.renderSlashMenu();
        } else {
            this.closeSlashMenu();
        }
    },

    onKey(e) {
        const smenu = document.getElementById('smenu');
        const isMenuOpen = smenu && smenu.classList.contains('open') && this.activeMatches.length > 0;

        if (isMenuOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.slashIndex = (this.slashIndex + 1) % this.activeMatches.length;
                this.renderSlashMenu();
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.slashIndex = (this.slashIndex - 1 + this.activeMatches.length) % this.activeMatches.length;
                this.renderSlashMenu();
                return;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const sel = this.activeMatches[this.slashIndex];
                if (sel) {
                    window.slash(sel.id);
                }
                return;
            } else if (e.key === 'Escape') {
                this.closeSlashMenu();
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            this.closeSlashMenu();
            if (window.send) window.send(); 
        }
    },

    renderSlashMenu() {
        const smenu = document.getElementById('smenu');
        if (!smenu) return;

        if (!this.activeMatches.length) {
            this.closeSlashMenu();
            return;
        }

        smenu.innerHTML = this.activeMatches.map((s, i) => `
            <div class="si ${i === this.slashIndex ? 'sel' : ''}" data-skill-id="${s.id}">
                <span class="qi" style="font-size:14px">${s.icon}</span>
                <span class="scmd">/${s.id}</span>
                <span class="sdesc">${s.desc} — ${s.use}</span>
            </div>
        `).join('');

        smenu.classList.add('open');
        const selEl = smenu.querySelector('.si.sel');
        if (selEl) selEl.scrollIntoView({ block: 'nearest' });
    },

    closeSlashMenu() {
        const smenu = document.getElementById('smenu');
        if (smenu) {
            smenu.classList.remove('open');
            smenu.innerHTML = '';
        }
        this.slashIndex = -1;
        this.activeMatches = [];
    },

    bindGestures() {
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const diffX = e.changedTouches[0].clientX - touchStartX;
            const diffY = e.changedTouches[0].clientY - touchStartY;

            // Only trigger for horizontal-dominated gestures
            if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
                if (diffX > 0 && touchStartX < 60) {
                    // Swipe right from edge -> open sidebar
                    toggleLeftSidebar(true);
                } else if (diffX < 0) {
                    // Swipe left -> close sidebar
                    toggleLeftSidebar(false);
                }
            }
        }, { passive: true });
    },

    _toggleCollapsible(panelId, arrowId) {
        const panel = document.getElementById(panelId);
        const arrow = document.getElementById(arrowId);
        if (!panel) return;
        const isNowOpen = panel.style.maxHeight === '0px' || !panel.style.maxHeight;
        panel.style.maxHeight = isNowOpen ? '800px' : '0px';
        if (arrow) arrow.style.transform = isNowOpen ? '' : 'rotate(-90deg)';
        localStorage.setItem('bv_collapse_' + panelId, (!isNowOpen).toString());
    },

    _on(id, evt, fn) {
        document.getElementById(id)?.addEventListener(evt, fn);
    },

    addNewClient() {
        const name = prompt('Entity Name (Client, Venture, or Brand):');
        if (!name) return;
        const id = 'c' + Date.now();
        const client = { id, name, createdAt: Date.now() };
        state.clients.push(client);
        import('./store.js').then(m => m.saveClient(client));
        renderClients();
        toast(`Entity "${name}" created ✓`);
    },

    deleteSession(id) {
        import('./store.js').then(m => m.deleteSession(id));
    }
};

// Start the boot sequence
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

// Global App reference
window.App = App;
App.init();