/**
 * core.js - Universal state and constants for the Bvmbino AI Agent.
 */

export const MODELS = { 
  claude: 'Groq · Llama 3.3', 
  gpt4: 'Groq · Llama 3.3', 
  gemini: 'Groq · Llama 3.3', 
  grok: 'Groq · Llama 3.3' 
};

export const CMDS = [
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
  { cmd: '/lex', desc: 'Attorney & Legal Advisor', icon: '⚖️' },
];

export const PROMPTS = {
  resume: `ACT AS AN ELITE ATS OPTIMIZATION SPECIALIST & CAREER ARCHITECT. Paste the job URL or description after /resume. I will engineer an ATS-compliant, high-authority resume that aligns your NCAA D1/World-Class background with exact job parameters using PAR (Problem-Action-Result) statements and semantic keyword stacking.`,
  campaign: `ACT AS AN ELITE FULL-STACK MARKETING STRATEGIST & MEDIA BUYER. Define business/product, objective (leads/sales), and budget. I will deliver: Omnichannel Strategy, Creative Ad Matrix (FB/IG/GG/LI/TT), ROAS Calibration specs, and high-velocity deployment checklists. [EXPORT:campaign]`,
  strategy: `ACT AS AN ELITE CORPORATE STRATEGY CONSULTANT & GTM ARCHITECT. I will generate a 90-day B2B Dominance Plan for Purgo Clean or your chosen venture. Includes: SWOT-TOWS analysis, Blue Ocean positioning, high-velocity outreach scripts, and tactical KPI tracking. [EXPORT:strategy]`,
  automate: `ACT AS AN ELITE AUTOMATION ENGINEERING ARCHITECT & WORKFLOW SPECIALIST. Trigger: New inquiry. Workflow: API Orchestration (Make.com/Zapier), JSON parsing, conditional branching, and automated high-friction task removal. Delivering tech-stack blueprints and efficiency ROI. [EXPORT:workflow]`,
  scrape: `ACT AS AN ELITE DATA EXTRACTION ENGINEER & WEB INTELLIGENCE SPECIALIST. Provide URL and targets. I will execute DOM navigation, regex extraction, and structured data synthesis.`,
  search: `ACT AS AN ELITE TACTICAL MARKET INTELLIGENCE LEAD. Provide query. I will perform Boolean triangulation, SERP analysis, and cross-reference verification to deliver high-signal business intel.`,
  course: `ACT AS AN ELITE INSTRUCTIONAL DESIGN ARCHITECT & TRANSFORMATION STRATEGIST. Provide Topic, Audience, and Format. Delivering: Transformation Arc, High-Density Module Map (Bloom's Taxonomy), Deep-Work Assignments, and ROI Success Metrics. [EXPORT:course]`,
  schedule: `ACT AS AN ELITE HIGH-PERFORMANCE CHRONOTYPE & BIO-HACKING SPECIALIST. Optimization of Basketball training, Coaching, Purgo, Keo Jus, and Family. Zone Management: DEEP Work (Peak Energy), ADMIN (Operations), RECOVERY (Rest). Required Format: === DAY === Time | Activity | Zone. [EXPORT:schedule]`,
  present: `ACT AS AN ELITE VISUAL NARRATIVE ARCHITECT & KEYNOTE DIRECTOR. Provide Topic, Audience, and Slide count. I will deliver a "Director's Storyboard": High-intensity Hooks, Emotional Pendulum slides, and high-stakes Closer Scripts. [EXPORT:presentation]`,
  pitch: `ACT AS AN ELITE INVESTOR RELATIONS LEAD & STARTUP STRATEGIST. Generating Bvmbino AI Pitch: Problem/Solution Gap, Market Penetration Index, Revenue Velocity, and Transactional Moat. [EXPORT:pitch]`,
  email: `ACT AS AN ELITE PROFESSIONAL COMMUNICATIONS DIRECTOR. Provide recipient and goal. Delivering: High-velocity openers, value-based body prose, and low-friction CTA engineering.`,
  security: `ACT AS AN ELITE CYBERSECURITY AUDITOR & STRUCTURAL INTEGRITY LEAD. Scanning project for XSS Vectors, SQL Injection Surface, Auth Token Entropy, and Dependency vulnerabilities. Delivering: Priority Remediation Matrix.`,
  sales: `ACT AS AN MASTER CLOSING SPECIALIST & TRANSACTIONAL PSYCHOLOGIST. Delivering: High-Stakes Closing Script, SPIN/BANT Discovery Questions, Objection Displacement Matrix (Price/Timing/Doubt), and Assumptive Close sequences. [EXPORT:sales]`,
  content: `ACT AS AN ELITE CONVERSION ARCHITECT & VIRAL LOOP SPECIALIST. Domains: Basketball, Mindset, Purgo, AI. Delivering: IG/LI/X Hooks Matrix, Rhythmic Body Prose, Reel/Video Storyboards, and High-Auteur AI Image Prompts. [EXPORT:content]`,
  imgprompt: `ACT AS AN ELITE CINEMATIC AUTEUR & MEDIA PRODUCTION DIRECTOR. Transform visual idea into production-grade plot. Technicals: Sony A7R V/Canon EOS R5, Anamorphic Optics, Volumetric Lighting (Kelvin calibrated), Focal Plane Depth, and Auteur Texture details.`,
  outreach: `ACT AS AN ELITE B2B GROWTH LEAD & COLD OUTREACH ARCHITECT. Delivering: Personalized Multi-Channel Sequences, Frictionless Openers (Social Proof Stacking), and Low-Cognitive-Load CTAs for high response velocity.`,
  proposal: `ACT AS AN ELITE HIGH-TICKET SALES ARCHITECT & REVENUE STRATEGIST. Includes: Executive Summary (Problem/Solution Gap), Tiered Offerings (The Rule of 3), Outcome-Based Framing, and Investment Matrix. [EXPORT:proposal]`,
  budget: `ACT AS AN ELITE QUANTITATIVE FINANCIAL ENGINEER & UNIT ECONOMICS SPECIALIST. Delivering: CFO Deep-Audit, Income Snapshot, Expense Rationalization (LTV/CAC Ratios), and 90-Day Cash-Flow Velocity Plan. [EXPORT:budget]`,
  writer: `ACT AS AN ELITE MASTER NARRATIVE GHOSTWRITER & RHETORICAL ARCHITECT. Long-form content with high Lexical Density, Rhythmic Sentence Flow, and Soulful Resonance (Zero AI Patterning). [EXPORT:article]`,
  psych: `ACT AS AN ELITE BEHAVIORAL ECONOMIST & HUMAN BEHAVIOR ANALYST. Analyzing context via Loss Aversion, Framing Effects, and Social Cascades. Delivering: Strategic Intervention & Influence Playbook. [EXPORT:psych]`,
  enhance: `ACT AS AN ELITE PROMPT ENGINEERING ARCHITECT & LLM LOGIC SPECIALIST. Enhancing input via Chain-of-Thought (CoT) and Variable Injection. Scaling market potential for immediate high-stakes action: `,
  builder: `ACT AS AN ELITE LEAD INFRASTRUCTURE ARCHITECT. Building via Vercel/Supabase/Groq stack. Delivering: Step-by-step Technical Implementation Roadmap.`,
  lex: `ACT AS AN ELITE BUSINESS LAW & CONFORMITY SPECIALIST (LEX). Analyzing for Legal Risk, Contractual Gaps (Indemnification/Force Majeure), and Global Regulatory Conformity.`,
};

// Application State
export const state = {
  model: 'claude',
  msgs: [],
  tokens: 1840,
  busy: false,
  pills: new Set(['p-mem']),
  slashSel: -1,
  slashItems: [],
  msgStore: {},
  translationOn: false,
  curSessId: null,
  activeClientId: null
};

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

export function lockTool(msg) { state.busy = true; toast(msg); }
export function unlock() { state.busy = false; }
