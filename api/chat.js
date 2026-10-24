import { setCors, isRateLimited, validateMessages, validateAppToken, trackAbuse } from './_cors.js';
import { CORE, SKILLS, detectSkill, getMaxTokens } from './lib/prompts.js';

export const maxDuration = 60;

/**
 * Bvmbino Auteur Engine: Final Stabilized Orchestrator
 * High-Stakes Reliability | Multi-Provider Scaling
 */

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // Rate Limit check
  if (isRateLimited(req, 40)) return res.status(429).json({ error: 'System busy — too many requests' });

  // Security layer
  if (!validateAppToken(req)) return res.status(403).json({ error: 'Unauthorized: Session required' });
  if (await trackAbuse(req)) return res.status(429).json({ error: 'Resource limit reached' });

  // ── KEY REGISTRY ──────────────────────────────────────────────────────────
  const KEYS = {
    groq:       process.env.GROQ_KEY,
    cerebras:   process.env.CEREBRAS_KEY,
    openrouter: process.env.OPENROUTER_KEY,
    gemini:     process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY,
    mistral:    process.env.MISTRAL_KEY,
    anthropic:  process.env.ANTHROPIC_KEY
  };

  if (!KEYS.groq && !KEYS.openrouter && !KEYS.cerebras && !KEYS.gemini) {
    return res.status(500).json({ 
      error: 'Configuration Error: No authorized AI provider keys found.',
      instructions: 'Check Vercel Dashboard -> Settings -> Environment Variables. Ensure keys are checked for Production.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { messages, system, model: requestedModel } = body;

    const validErr = validateMessages(messages);
    if (validErr) return res.status(400).json({ error: validErr });

    // ── 1. ORCHESTRATION ────────────────────────────────────────────────────
    let activeSkill = detectSkill(messages, system);
    let specialistModel = requestedModel || (KEYS.cerebras ? 'llama3.1-70b' : 'llama-3.3-70b-versatile');
    
    // Smart Routing Logic
    let primaryProvider = KEYS.cerebras ? 'cerebras' : (KEYS.groq ? 'groq' : 'openrouter');
    if (specialistModel.includes('/')) primaryProvider = 'openrouter';
    else if (specialistModel.includes('gemini')) primaryProvider = 'gemini';
    else if (specialistModel.includes('mistral')) primaryProvider = 'mistral';
    else if (specialistModel.includes('claude')) primaryProvider = 'anthropic';
    else if (specialistModel.startsWith('llama3.1-')) primaryProvider = 'cerebras';

    // Skill-based specialization overrides
    if (activeSkill) {
      if (['writer', 'content', 'email', 'resume'].includes(activeSkill)) {
        specialistModel = KEYS.cerebras ? 'llama3.1-70b' : 'llama-3.3-70b-versatile';
        primaryProvider = KEYS.cerebras ? 'cerebras' : 'groq';
      } else if (['strategy', 'budget', 'psych', 'lex'].includes(activeSkill)) {
        specialistModel = 'meta-llama/llama-3.3-70b-instruct';
        primaryProvider = 'openrouter';
      } else if (['search', 'scrape'].includes(activeSkill)) {
        specialistModel = 'gemini-1.5-flash';
        primaryProvider = 'gemini';
      } else if (activeSkill === 'coach') {
        specialistModel = KEYS.cerebras ? 'llama3.1-70b' : 'llama-3.3-70b-versatile';
        primaryProvider = KEYS.cerebras ? 'cerebras' : 'groq';
      }
    }

    // ── 2. PROMPT STACK ─────────────────────────────────────────────────────
    const isTemplate = activeSkill && activeSkill.startsWith('TEMPLATE_');
    const cleanSkill = isTemplate ? activeSkill.replace('TEMPLATE_', '') : activeSkill;
    const skillPrompt = cleanSkill ? `\n\n## ACTIVE SPECIALIST: ${cleanSkill.toUpperCase()}\n${SKILLS[cleanSkill] || ''}` : '';
    
    let clientPrompt = '';
    const { clientContext } = body;
    if (clientContext) {
      clientPrompt = `\n\n[CLIENT_CONTEXT ACTIVE]\nFocus all strategy on this venture:\nName: ${clientContext.name}\nContext: ${clientContext.desc}`;
    }

    const fullSystem = CORE + clientPrompt + skillPrompt + (system ? `\n\n${system}` : '');
    const chatMessages = [
      { role: 'system', content: fullSystem },
      ...(messages || []).map(m => ({ role: m.role, content: m.content })),
    ];

    // ── 3. CASCADE CHAIN (Speed-First) ──────────────────────────────────────
    const chain = [];
    if (KEYS[primaryProvider]) {
      chain.push({ provider: primaryProvider, model: specialistModel });
    }
    
    // Robust fallbacks across all active keys
    if (KEYS.cerebras) {
      chain.push({ provider: 'cerebras', model: 'llama3.1-8b' });
      chain.push({ provider: 'cerebras', model: 'llama3.1-70b' });
    }
    if (KEYS.openrouter) {
      chain.push({ provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct' });
      chain.push({ provider: 'openrouter', model: 'deepseek/deepseek-chat' });
    }
    if (KEYS.gemini) {
      chain.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
      chain.push({ provider: 'gemini', model: 'gemini-1.5-flash' });
      chain.push({ provider: 'gemini', model: 'gemini-1.5-pro' });
    }
    if (KEYS.groq) {
      chain.push({ provider: 'groq', model: 'llama-3.3-70b-versatile' });
      chain.push({ provider: 'groq', model: 'llama-3.1-8b-instant' });
    }

    // ── 4. EXECUTION ────────────────────────────────────────────────────────
    async function executeAttempt(attempt) {
      let url, headers;
      const key = KEYS[attempt.provider];
      let reqModel = attempt.model;

      switch(attempt.provider) {
        case 'cerebras': 
          url = 'https://api.cerebras.ai/v1/chat/completions';
          headers = { 'Authorization': `Bearer ${key}` };
          // Ensure valid Cerebras model names
          if (!reqModel.startsWith('llama3.1-') && !reqModel.startsWith('llama-3.3-')) {
            reqModel = 'llama3.1-8b';
          }
          break;
        case 'groq': 
          url = 'https://api.groq.com/openai/v1/chat/completions';
          headers = { 'Authorization': `Bearer ${key}` };
          if (reqModel.startsWith('llama3.1-70b')) reqModel = 'llama-3.3-70b-versatile';
          break;
        case 'openrouter': 
          url = 'https://openrouter.ai/api/v1/chat/completions';
          headers = { 
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': 'https://bvmbino-ai-agent.vercel.app',
            'X-Title': 'Bvmbino Pro'
          };
          if (reqModel.endsWith(':free')) reqModel = reqModel.replace(':free', '');
          break;
        case 'gemini': 
          url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
          headers = { 'Authorization': `Bearer ${key}` };
          if (!reqModel.includes('gemini')) reqModel = 'gemini-1.5-flash';
          break;
        case 'mistral': 
          url = 'https://api.mistral.ai/v1/chat/completions';
          headers = { 'Authorization': `Bearer ${key}` };
          break;
        case 'anthropic': 
          url = 'https://api.anthropic.com/v1/messages';
          headers = { 
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          };
          break;
        default: throw new Error('Unknown Provider: ' + attempt.provider);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          model: reqModel,
          messages: chatMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: getMaxTokens(cleanSkill)
        })
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`${attempt.provider}/${reqModel} (${response.status}): ${txt.slice(0, 160)}`);
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('x-specialist', reqModel);
      res.setHeader('x-provider', attempt.provider);
      
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    }

    const errors = [];
    // Deduplicate attempts
    const seen = new Set();
    const uniqueChain = chain.filter(a => {
      const k = `${a.provider}:${a.model}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    for (const attempt of uniqueChain) {
      try {
        await executeAttempt(attempt);
        return;
      } catch (err) {
        errors.push(err.message);
        console.warn(`[Orchestrator] Attempt failure:`, err.message);
        continue;
      }
    }

    res.status(500).json({ 
      error: 'All providers exhausted.',
      errors,
      diagnostics: { groq: !!KEYS.groq, cerebras: !!KEYS.cerebras, openrouter: !!KEYS.openrouter, gemini: !!KEYS.gemini }
    });

  } catch (err) {
    console.error('Final Orchestrator Failure:', err);
    if (!res.headersSent) res.status(500).json({ error: 'System Error: ' + err.message });
  }
}
