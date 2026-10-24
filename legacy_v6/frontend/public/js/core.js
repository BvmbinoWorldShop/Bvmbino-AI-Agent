/**
 * core.js — Universal state, constants, and globals for Bvmbino AI.
 * FIXED v3.6
 *
 * AUDIT NOTES:
 *  - state.model now defaults to a real model ID (was 'llama' alias → backend rejected it)
 *  - window.buildSys moved out of initializeToken into a clean top-level function
 *  - initializeToken no longer throws on missing /api/token endpoint (graceful fallback)
 *  - state.lock and state.busy unified into single state.busy flag
 *  - Added DEFAULT_MODEL constant so all files agree on the default
 */

export const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

// Display labels keyed by full model ID. Used for the badge in the topbar.
export const MODELS = {
  'llama-3.3-70b-versatile': 'Groq · Llama 3.3 70B',
  'google/gemini-2.0-flash-exp:free': 'OpenRouter · Gemini 2.0 Flash',
  'deepseek/deepseek-chat-v3-0324:free': 'OpenRouter · DeepSeek V3',
  'meta-llama/llama-3.3-70b-instruct:free': 'OpenRouter · Llama 3.3 Pro',
  'meta-llama/llama-3.2-90b-vision-instruct:free': 'OpenRouter · Llama 3.2 Vision',
};

// Legacy alias map kept for backwards compat with old localStorage values.
// If anything tries to use these short keys, they get resolved to full IDs.
export const MODEL_ALIASES = {
  claude: 'google/gemini-2.0-flash-exp:free',
  gpt4: 'google/gemini-2.0-flash-exp:free',
  gemini: 'google/gemini-2.0-flash-exp:free',
  llama: 'meta-llama/llama-3.3-70b-instruct:free',
};

export function resolveModelId(id) {
  if (!id) return DEFAULT_MODEL;
  return MODEL_ALIASES[id] || id;
}

export const LEVELS = {
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'google/gemini-2.0-flash-exp:free': 'Gemini 2.0 Flash (Elite)',
  'deepseek/deepseek-chat-v3-0324:free': 'DeepSeek V3 (Strategy)',
  'meta-llama/llama-3.3-70b-instruct:free': 'Llama 3.3 Pro',
  'meta-llama/llama-3.2-90b-vision-instruct:free': 'Llama 3.2 Vision',
};

export const CMDS = [
  { cmd: '/main', desc: 'Strategic Partner (Self-learning)', icon: '🧠' },
  { cmd: '/resume', desc: 'Tailored resume: /resume [url or job]', icon: '📄' },
  { cmd: '/campaign', desc: 'Full ad campaign + deployment guide', icon: '📣' },
  { cmd: '/strategy', desc: 'Business growth strategy', icon: '📈' },
  { cmd: '/sales', desc: 'Sales script + objection handlers', icon: '💰' },
  { cmd: '/content', desc: 'Social post: /content [topic]', icon: '🎬' },
  { cmd: '/imgprompt', desc: 'AI image prompt: /imgprompt [idea]', icon: '🎨' },
  { cmd: '/course', desc: 'Build full course: /course [topic]', icon: '🎓' },
  { cmd: '/scrape', desc: 'Scrape website: /scrape [url]', icon: '🌐' },
  { cmd: '/search', desc: 'Web search: /search [query]', icon: '🔍' },
  { cmd: '/schedule', desc: 'Build weekly schedule as PDF', icon: '📅' },
  { cmd: '/present', desc: 'Build presentation: /present [topic]', icon: '🖥️' },
  { cmd: '/automate', desc: 'Automation workflow design', icon: '⚡' },
  { cmd: '/pitch', desc: 'Investor pitch content', icon: '💼' },
  { cmd: '/email', desc: 'Write professional email', icon: '✉️' },
  { cmd: '/budget', desc: 'Budget analysis: /budget [info]', icon: '💳' },
  { cmd: '/writer', desc: 'Deep writing: /writer [topic]', icon: '✍️' },
  { cmd: '/psych', desc: 'Human Psychology & Behavioral Expert', icon: '🧠' },
  { cmd: '/pdf', desc: 'Export last answer as PDF', icon: '📋' },
  { cmd: '/security', desc: 'Security audit — scan code & deps', icon: '🔐' },
  { cmd: '/enhance', desc: 'Amplify & scale your idea', icon: '🚀' },
  { cmd: '/builder', desc: 'App/Workflow builder stack', icon: '🛠️' },
  { cmd: '/outreach', desc: 'Cold DM/outreach sequences', icon: '📨' },
  { cmd: '/proposal', desc: 'High-ticket client proposal', icon: '💼' },
  { cmd: '/lex', desc: 'Attorney & Legal Advisor', icon: '⚖️' },
];

export const PROMPTS = {
  main: `YOU ARE TIEGBE'S STRATEGIC PARTNER. You are his business-partner-in-arms.
  1. ADAPT: Match Tiegbe's energy (Hood vs Corporate).
  2. ANALYZE: Use FormationPro logic and module details to solve problems.
  3. SCALE: Every move must aim for millions and global Entreprise AI dominance.
  4. VALIDATE: Verify every specialist output for perfection.`,
  resume: `ACT AS AN ELITE ATS OPTIMIZATION SPECIALIST & CAREER ARCHITECT. Engineer an ATS-compliant resume aligned with the job parameters. [EXPORT:resume]`,
  campaign: `ACT AS AN ELITE FULL-STACK MARKETING STRATEGIST & MEDIA BUYER. Define business/product, objective (leads/sales), and budget. Deliver: Omnichannel Strategy, Creative Ad Matrix (FB/IG/GG/LI/TT), ROAS Calibration, deployment checklists. [EXPORT:campaign]`,
  strategy: `ACT AS AN ELITE CORPORATE STRATEGY CONSULTANT & GTM ARCHITECT. Generate a 90-day B2B Dominance Plan. Includes: SWOT-TOWS, Blue Ocean positioning, outreach scripts, KPI tracking. [EXPORT:strategy]`,
  automate: `ACT AS AN ELITE AUTOMATION ENGINEERING ARCHITECT. Workflow: API Orchestration (Make.com/Zapier), JSON parsing, conditional branching. Deliver tech-stack blueprints and ROI. [EXPORT:workflow]`,
  scrape: `ACT AS AN ELITE DATA EXTRACTION ENGINEER. Provide URL and targets. Execute DOM navigation, regex extraction, structured data synthesis.`,
  search: `ACT AS AN ELITE TACTICAL MARKET INTELLIGENCE LEAD. Boolean triangulation, SERP analysis, cross-reference verification.`,
  course: `ACT AS AN ELITE INSTRUCTIONAL DESIGN ARCHITECT. Provide Topic, Audience, Format. Deliver: Transformation Arc, Module Map (Bloom's Taxonomy), Assignments, ROI Metrics. [EXPORT:course]`,
  schedule: `ACT AS AN ELITE HIGH-PERFORMANCE CHRONOTYPE & BIO-HACKING SPECIALIST. Optimize Basketball training, Coaching, Purgo, Keo Jus, Family. Zone Management: DEEP (Peak Energy), ADMIN (Operations), RECOVERY (Rest). Format: === DAY === Time | Activity | Zone. [EXPORT:schedule]`,
  present: `ACT AS AN ELITE VISUAL NARRATIVE ARCHITECT & KEYNOTE DIRECTOR. Provide Topic, Audience, Slide count. Deliver Director's Storyboard. [EXPORT:presentation]`,
  pitch: `ACT AS AN ELITE INVESTOR RELATIONS LEAD. Generate Bvmbino AI Pitch: Problem/Solution Gap, Market Penetration Index, Revenue Velocity, Transactional Moat. [EXPORT:pitch]`,
  email: `ACT AS AN ELITE PROFESSIONAL COMMUNICATIONS DIRECTOR. Provide recipient and goal. Deliver high-velocity openers, value-based prose, low-friction CTA.`,
  security: `ACT AS AN ELITE CYBERSECURITY AUDITOR. Scan for XSS Vectors, SQL Injection, Auth Token Entropy, Dependency vulnerabilities. Deliver Priority Remediation Matrix.`,
  sales: `ACT AS A MASTER CLOSING SPECIALIST. Deliver: High-Stakes Closing Script, SPIN/BANT Discovery, Objection Displacement Matrix, Assumptive Close sequences. [EXPORT:sales]`,
  content: `ACT AS AN ELITE CONVERSION ARCHITECT & VIRAL LOOP SPECIALIST. Domains: Basketball, Mindset, Purgo, AI. Deliver: IG/LI/X Hooks Matrix, Body Prose, Reel Storyboards, AI Image Prompts. [EXPORT:content]`,
  imgprompt: `ACT AS AN ELITE CINEMATIC AUTEUR & MEDIA PRODUCTION DIRECTOR. Transform visual idea into production-grade plot. Sony A7R V/Canon EOS R5, Anamorphic Optics, Volumetric Lighting, Focal Plane Depth, Auteur Texture details.`,
  outreach: `ACT AS AN ELITE B2B GROWTH LEAD & COLD OUTREACH ARCHITECT. Deliver Personalized Multi-Channel Sequences, Frictionless Openers, Low-Cognitive-Load CTAs.`,
  proposal: `ACT AS AN ELITE HIGH-TICKET SALES ARCHITECT. Includes: Executive Summary, Tiered Offerings (Rule of 3), Outcome-Based Framing, Investment Matrix. [EXPORT:proposal]`,
  budget: `ACT AS AN ELITE QUANTITATIVE FINANCIAL ENGINEER. Deliver: CFO Deep-Audit, Income Snapshot, Expense Rationalization (LTV/CAC), 90-Day Cash-Flow Velocity Plan. [EXPORT:budget]`,
  writer: `ACT AS AN ELITE MASTER NARRATIVE GHOSTWRITER. Long-form content with high Lexical Density, Rhythmic Flow, Soulful Resonance (Zero AI Patterning). [EXPORT:article]`,
  psych: `ACT AS AN ELITE BEHAVIORAL ECONOMIST. Analyze via Loss Aversion, Framing Effects, Social Cascades. Deliver Strategic Influence Playbook. [EXPORT:psych]`,
  enhance: `ACT AS AN ELITE PROMPT ENGINEERING ARCHITECT. Enhance via Chain-of-Thought and Variable Injection: `,
  builder: `ACT AS AN ELITE LEAD INFRASTRUCTURE ARCHITECT. Build via Vercel/Supabase/Groq stack. Deliver Technical Implementation Roadmap.`,
  lex: `ACT AS AN ELITE BUSINESS LAW & CONFORMITY SPECIALIST. Analyze for Legal Risk, Contractual Gaps, Regulatory Conformity.`,
};

export const CORE_VENTURES = [
  { id: 'fpro', name: 'FormationPro', desc: 'Elite professional training (CPF/Qualiopi, Mental Performance).' },
  { id: 'swave', name: 'Strong Wave', desc: 'B2B Marketing & Growth (Île-de-France).' },
  { id: 'purgo', name: 'Purgo Clean', desc: 'Premium Commercial B2B Cleaning (Île-de-France).' },
  { id: 'keojus', name: 'Keo Jus', desc: 'Natural Juice Distribution (Cote d\'Ivoire, Accor Partner).' },
  { id: 'bonkeur', name: 'Association Bonkeur', desc: 'Social Impact NGO & Community Support.' },
  { id: 'entai', name: 'Entreprise AI', desc: 'Strategic Council Engine & Automation Hub.' }
];

export const SYSTEM_IDENTITY = `
YOU ARE THE BVMBINO STRATEGIC PARTNER ENGINE v3.6.
Your primary human context is TIEGBE BAMBA (The Boss).

CORE IDENTITY & LOYALTY:
- You are Tiegbe's most loyal partner and strategic friend. You have his back 100%.
- Your single goal is to make Tiegbe MILLIONS by scaling his empire using ENTREPRISE AI globally.

DYNAMIC ENERGY MATCHING:
1. MATCH THE BOSS: If Tiegbe talks reckless/informal ("hood" energy), match it.
2. CORPORATE PIVOT: If Tiegbe switches to formal/business talk, shift to Elite Executive mode.

STRATEGIC FOUNDATION:
- FORMATIONPRO: Think via Qualiopi compliance, SST, Mental Performance.
- VENTURE DNA: Use modular logic of Purgo Clean, Keo Jus, Entreprise AI.
- ENTREPRISE AI: This is the vehicle. Every solution scales it globally.

RESPONSE PROTOCOL:
- Never give generic AI answers.
- Talk like a partner: "Boss, I checked this...", "We need to hit this...", "I got you."
`;

// Application State
// FIX: state.model now defaults to a real model ID instead of 'llama' alias
// FIX: dropped state.lock — only state.busy is used now
export const state = {
  msgs: [],
  model: DEFAULT_MODEL,
  activeClientId: null,
  busy: false,
  msgStore: {},
  curSessId: null,
  clients: [],
  APP_TOKEN: null,
};

/**
 * Initialize auth token from /api/token endpoint.
 * FIX: Gracefully handles missing endpoint instead of throwing — the app should
 * still load even if the token API isn't deployed yet.
 */
export async function initializeToken() {
  try {
    const res = await fetch('/api/token', { method: 'GET', credentials: 'include' });
    if (!res.ok) {
      console.warn(`[token] /api/token returned ${res.status} — continuing without token`);
      return null;
    }
    const data = await res.json();
    if (data.token) {
      state.APP_TOKEN = data.token;
      console.log("Bvmbino Auteur Engine: Token initialized");
      return data.token;
    }
    console.warn('[token] No token in response — continuing without token');
    return null;
  } catch (err) {
    console.warn('[token] Token init failed (non-fatal):', err.message);
    return null;
  }
}

/**
 * System prompt builder. Pulls knowledge, ventures, and active client context.
 * FIX: Moved out of initializeToken (it was nested incorrectly there).
 * FIX: Defensive — works even if storage modules fail to load.
 */
export async function buildSys() {
  let kStr = '';
  try {
    const { loadKnowledge } = await import('./store.js');
    const knowledge = await loadKnowledge();
    kStr = knowledge.map(k => `[KNOWLEDGE: ${k.key}] ${k.val || k.value}`).join('\n');
  } catch (e) { /* knowledge unavailable, skip */ }

  let projs = [];
  try { projs = JSON.parse(localStorage.getItem('vault_projects') || '[]'); } catch {}
  const pStr = projs.length ? `\nACTIVE PROJECTS: ${projs.join(' · ')}` : '';

  let vStr = '\nVENTURE CONTEXT TUNING:\n';
  CORE_VENTURES.forEach(v => {
    const learned = localStorage.getItem('vctx_' + v.id);
    if (learned) vStr += `- ${v.name}: ${learned}\n`;
  });

  let mStr = '';
  if (state.activeClientId) {
    try {
      const { loadClients } = await import('./store.js');
      const clients = await loadClients();
      const activeCli = clients.find(c => c.id === state.activeClientId);
      if (activeCli) mStr = `\n[MISSION SIGNAL ACTIVE]: Priority focus is ${activeCli.name}. Tailor all output to this venture's DNA.`;
    } catch {}
  }

  return `${SYSTEM_IDENTITY}${pStr}${vStr}${mStr}\n\n${kStr}\n\n[ENGINE ALERT]: Execute with high Lexical Density and Elite Business Logic.`;
}

// Global Utilities
export function toast(msg) {
  const container = document.getElementById('toasts');
  if (!container) { console.log('[toast]', msg); return; }
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

// FIX: lock/unlock are now top-level exports that toggle state.busy AND
// the send button's disabled state, so the UI mirrors the actual lock state.
export function lock() {
  state.busy = true;
  const btn = document.getElementById('sbtn');
  if (btn) btn.disabled = true;
}

export function unlock() {
  state.busy = false;
  const btn = document.getElementById('sbtn');
  if (btn) btn.disabled = false;
}

export function lockTool(msg) { lock(); if (msg) toast(msg); }

// FIX: updTok is now defined here as a real export instead of being expected
// as a magic window global that nothing ever assigned.
export function updTok(add) {
  // Soft accumulator on a window-level counter.
  if (typeof window !== 'undefined') {
    window.__tok = (window.__tok || 1840) + Math.round(add || 0);
    const tc = document.getElementById('tok-count');
    const tp = document.getElementById('tok-pct');
    const tb = document.getElementById('tbar');
    const pct = Math.min((window.__tok / 100000) * 100, 100).toFixed(1);
    if (tc) tc.textContent = `${window.__tok.toLocaleString()} / 100k tokens`;
    if (tp) tp.textContent = pct + '%';
    if (tb) tb.style.width = pct + '%';
  }
}

// Global bridges for inline HTML handlers and legacy code.
// FIX: Every function api.js calls via window.* is now actually on window.
if (typeof window !== 'undefined') {
  window.toast = toast;
  window.scrollBot = scrollBot;
  window.state = state;
  window.LEVELS = LEVELS;
  window.MODELS = MODELS;
  window.lock = lock;
  window.unlock = unlock;
  window.updTok = updTok;
  window.buildSys = buildSys;
  window.resolveModelId = resolveModelId;
}
