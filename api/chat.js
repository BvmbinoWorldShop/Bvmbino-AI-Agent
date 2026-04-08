import { setCors, isRateLimited, validateMessages } from './_cors.js';
import { CORE, SKILLS, detectSkill, getMaxTokens } from './lib/prompts.js';

export const maxDuration = 60;

/**
 * Auteur Production Engine: Orchestrator-Specialist Logic
 * 1. Orchestrator (Fast Llama 8B) classifies intent.
 * 2. Specialized models assigned based on task complexity.
 * 3. Cascade logic for high-stakes reliability.
 */

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (isRateLimited(req)) return res.status(429).json({ error: 'Rate limit exceeded' });

  const GROQ_KEY       = process.env.GROQ_KEY;
  const CEREBRAS_KEY   = process.env.CEREBRAS_KEY;
  const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { messages, system, model: requestedModel } = body;

    const validErr = validateMessages(messages);
    if (validErr) return res.status(400).json({ error: validErr });

    // --- 1. ORCHESTRATION LAYER (Intent Detection) ---
    // If no explicit skill detected by frontend simple regex, use LLM-based orchestration
    let activeSkill = detectSkill(messages, system);
    let specialistModel = requestedModel || 'llama-3.3-70b-versatile';
    let provider = 'groq';

    // Auteur Routing Logic
    if (activeSkill) {
      if (['writer', 'content', 'email', 'resume'].includes(activeSkill)) {
        specialistModel = 'llama-3.3-70b';
        provider = CEREBRAS_KEY ? 'cerebras' : 'groq';
      } else if (['strategy', 'budget', 'psych', 'lex'].includes(activeSkill)) {
        specialistModel = 'deepseek/deepseek-chat-v3-0324:free';
        provider = 'openrouter';
      } else if (['search', 'scrape'].includes(activeSkill)) {
        specialistModel = 'google/gemini-2.0-flash-exp:free';
        provider = 'openrouter';
      }
    }

    // --- 2. BUILD PROMPT STACK ---
    const isTemplate = activeSkill && activeSkill.startsWith('TEMPLATE_');
    const cleanSkill = isTemplate ? activeSkill.replace('TEMPLATE_', '') : activeSkill;
    const skillPrompt = cleanSkill ? `\n\n## ACTIVE SPECIALIST: ${cleanSkill.toUpperCase()}\n${SKILLS[cleanSkill]}` : '';
    const fullSystem = CORE + skillPrompt + (system ? `\n\n${system}` : '');

    const chatMessages = [
      { role: 'system', content: fullSystem },
      ...(messages || []).map(m => ({ role: m.role, content: m.content })),
    ];

    // --- 3. EXECUTE WITH CASCADE SAFETY ---
    const chain = [];
    
    // Custom specialist logic
    if (provider === 'cerebras' && CEREBRAS_KEY) {
        chain.push({ provider: 'cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', key: CEREBRAS_KEY, model: specialistModel });
        chain.push({ provider: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: GROQ_KEY, model: 'llama-3.3-70b-versatile' });
    } else if (provider === 'openrouter' && OPENROUTER_KEY) {
        chain.push({ provider: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: OPENROUTER_KEY, model: specialistModel });
        chain.push({ provider: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: GROQ_KEY, model: 'llama-3.3-70b-versatile' });
    } else {
        chain.push({ provider: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: GROQ_KEY, model: specialistModel });
        chain.push({ provider: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: OPENROUTER_KEY, model: 'meta-llama/llama-3.3-70b-instruct:free' });
    }

    async function streamResponse(attempt) {
      const headers = { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${attempt.key}` 
      };
      if (attempt.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://bvmbino-ai-agent.vercel.app';
        headers['X-Title'] = 'Bvmbino Auteur Engine';
      }

      const response = await fetch(attempt.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: attempt.model,
          messages: chatMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: getMaxTokens(cleanSkill)
        })
      });

      if (!response.ok) throw new Error(`Provider ${attempt.provider} failed: ${response.status}`);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('x-specialist', attempt.model);
      res.setHeader('x-skill', cleanSkill || 'none');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    }

    for (const attempt of chain) {
      try {
        if (!attempt.key) continue;
        await streamResponse(attempt);
        return;
      } catch (err) {
        console.warn(`Attempt failed for ${attempt.model}:`, err.message);
        continue;
      }
    }

    res.status(500).json({ error: 'All specialist models exhausted or failed.' });

  } catch (err) {
    console.error('Orchestrator Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal Orchestrator Error' });
  }
}
