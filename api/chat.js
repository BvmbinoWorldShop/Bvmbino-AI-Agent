import { setCors, isRateLimited, validateMessages } from './_cors.js';
import { CORE, SKILLS, detectSkill, getMaxTokens } from './lib/prompts.js';

export const maxDuration = 60;

/**
 * Bvmbino Auteur Engine: Elite Multi-Provider Orchestrator
 * Hierarchy: Cerebras/Groq (Speed) -> Free Tiers (Value) -> Gemini (Logic)
 */

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  if (isRateLimited(req, 15)) return res.status(429).json({ error: 'System busy (15 req/min)' });

  const { validateAppToken, trackAbuse } = await import('./_cors.js');
  if (!validateAppToken(req)) return res.status(403).json({ error: 'Unauthorized: Missing session token' });

  if (await trackAbuse(req)) return res.status(429).json({ error: 'Resource limit reached for this session' });

  // ── KEY REGISTRY ──────────────────────────────────────────────────────────
  const KEYS = {
    groq:       process.env.GROQ_KEY,
    cerebras:   process.env.CEREBRAS_KEY,
    openrouter: process.env.OPENROUTER_KEY,
    gemini:     process.env.GEMINI_KEY,
    mistral:    process.env.MISTRAL_KEY,
    anthropic:  process.env.ANTHROPIC_KEY
  };

  if (!KEYS.groq && !KEYS.openrouter && !KEYS.cerebras && !KEYS.gemini) {
    return res.status(500).json({ error: 'AI Orchestration Offline: No provider keys detected.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { messages, system, model: requestedModel } = body;

    const validErr = validateMessages(messages);
    if (validErr) return res.status(400).json({ error: validErr });

    // ── 1. ORCHESTRATION ────────────────────────────────────────────────────
    let activeSkill = detectSkill(messages, system);
    let specialistModel = requestedModel || 'llama-3.3-70b-versatile';
    
    // Auto-detect native provider from model slug
    let primaryProvider = 'groq';
    if (specialistModel.includes('/')) primaryProvider = 'openrouter';
    if (specialistModel.includes('gemini')) primaryProvider = 'gemini';
    if (specialistModel.includes('mistral')) primaryProvider = 'mistral';
    if (specialistModel.includes('claude')) primaryProvider = 'anthropic';
    if (specialistModel.startsWith('llama3.1-')) primaryProvider = 'cerebras';

    // Skill-based overrides for elite performance
    if (activeSkill) {
      if (['writer', 'content', 'email', 'resume'].includes(activeSkill)) {
        specialistModel = KEYS.cerebras ? 'llama3.1-70b' : 'llama-3.3-70b-versatile';
        primaryProvider = KEYS.cerebras ? 'cerebras' : 'groq';
      } else if (['strategy', 'budget', 'psych', 'lex'].includes(activeSkill)) {
        specialistModel = 'deepseek/deepseek-chat-v3-0324:free';
        primaryProvider = 'openrouter';
      } else if (['search', 'scrape'].includes(activeSkill)) {
        specialistModel = 'gemini-2.0-flash';
        primaryProvider = 'gemini';
      }
    }

    // ── 2. PROMPT BUILDING ──────────────────────────────────────────────────
    const isTemplate = activeSkill && activeSkill.startsWith('TEMPLATE_');
    const cleanSkill = isTemplate ? activeSkill.replace('TEMPLATE_', '') : activeSkill;
    const skillPrompt = cleanSkill ? `\n\n## ACTIVE SPECIALIST: ${cleanSkill.toUpperCase()}\n${SKILLS[cleanSkill]}` : '';
    
    let clientPrompt = '';
    const { clientContext } = body;
    if (clientContext) {
      clientPrompt = `\n\n[CLIENT_CONTEXT ACTIVE]\nFocus all logic, strategy, and tone on this business:\nName: ${clientContext.name}\nContext: ${clientContext.desc}`;
    }

    const fullSystem = CORE + clientPrompt + skillPrompt + (system ? `\n\n${system}` : '');
    const chatMessages = [
      { role: 'system', content: fullSystem },
      ...(messages || []).map(m => ({ role: m.role, content: m.content })),
    ];

    // ── 3. CASCADE ROTATION (Speed -> Free -> Gemini) ───────────────────────
    const chain = [];
    
    // Step 1: User's Primary Choice
    if (KEYS[primaryProvider]) {
      chain.push({ provider: primaryProvider, model: specialistModel });
    }

    // Step 2: Speed Tiers (Cerebras & Groq)
    if (KEYS.cerebras && primaryProvider !== 'cerebras') {
      chain.push({ provider: 'cerebras', model: 'llama3.1-70b' });
    }
    if (KEYS.groq && primaryProvider !== 'groq') {
      chain.push({ provider: 'groq', model: 'llama-3.3-70b-versatile' });
    }

    // Step 3: Best Free Tier (OpenRouter)
    if (KEYS.openrouter && primaryProvider !== 'openrouter') {
      chain.push({ provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' });
    }

    // Step 4: Logic Pillar (Gemini)
    if (KEYS.gemini && primaryProvider !== 'gemini') {
      chain.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
    }

    // ── 4. EXECUTION ────────────────────────────────────────────────────────
    async function executeAttempt(attempt) {
      let url, authHeader;
      const key = KEYS[attempt.provider];

      switch(attempt.provider) {
        case 'groq': url = 'https://api.groq.com/openai/v1/chat/completions'; authHeader = `Bearer ${key}`; break;
        case 'cerebras': url = 'https://api.cerebras.ai/v1/chat/completions'; authHeader = `Bearer ${key}`; break;
        case 'openrouter': url = 'https://openrouter.ai/api/v1/chat/completions'; authHeader = `Bearer ${key}`; break;
        case 'gemini': url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'; authHeader = `Bearer ${key}`; break;
        case 'mistral': url = 'https://api.mistral.ai/v1/chat/completions'; authHeader = `Bearer ${key}`; break;
        case 'anthropic': url = 'https://api.anthropic.com/v1/messages'; authHeader = key; break; // Anthropic needs custom handling but usually OR covers it
        default: throw new Error(`Unknown provider: ${attempt.provider}`);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          ...(attempt.provider === 'openrouter' ? { 'HTTP-Referer': 'https://bvmbino-ai-agent.vercel.app', 'X-Title': 'Bvmbino Pro' } : {})
        },
        body: JSON.stringify({
          model: attempt.model,
          messages: chatMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: getMaxTokens(cleanSkill)
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`${attempt.provider} (${response.status}): ${err.error?.message || 'unknown'}`);
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('x-specialist', attempt.model);
      res.setHeader('x-provider', attempt.provider);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    }

    let lastError = null;
    for (const attempt of chain) {
      try {
        await executeAttempt(attempt);
        return;
      } catch (err) {
        lastError = err;
        console.warn(`[Cascade] ${attempt.provider} failed:`, err.message);
        continue;
      }
    }

    res.status(500).json({ 
      error: 'All providers failed.',
      last_error: lastError?.message,
      diagnostics: { groq: !!KEYS.groq, cerebras: !!KEYS.cerebras, openrouter: !!KEYS.openrouter, gemini: !!KEYS.gemini }
    });

  } catch (err) {
    console.error('Orchestrator Crash:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Orchestrator Error' });
  }
}
