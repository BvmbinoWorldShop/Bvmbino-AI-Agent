/**
 * router.js - Smart Intent Routing and Skill detection.
 */

import { CMDS, PROMPTS, state, toast } from './core.js';

export const SKILL_ROUTER = [
  { skill: 'content', kw: ['instagram', 'linkedin', 'twitter', 'tiktok', 'facebook post', 'x post', 'reel', 'story', 'caption', 'hashtag', 'social media pool', 'content creator'] },
  { skill: 'sales', kw: ['close a deal', 'closing technique', 'sales script', 'sales pitch', 'objection handling', 'follow-up message', 'sell my service', 'pitch my offer'] },
  { skill: 'budget', kw: ['my expenses', 'my budget', 'my finances', 'cash flow', 'monthly spending', 'save money', 'financial plan', 'revenue target'] },
  { skill: 'writer', kw: ['write an article', 'write a blog', 'long form article', 'ghostwrite', 'editorial piece', 'natural writing', 'no ai feel'] },
  { skill: 'email', kw: ['write an email', 'draft an email', 'email template', 'email sequence', 'cold email'] },
  { skill: 'course', kw: ['build a course', 'create a course', 'online course', 'curriculum design', 'lesson plan', 'formation'] },
  { skill: 'strategy', kw: ['business strategy', 'growth strategy', 'scale my business', 'go to market', '90 day plan', 'market positioning'] },
  { skill: 'resume', kw: ['my resume', 'my cv', 'cover letter', 'job application', 'apply for'] },
  { skill: 'campaign', kw: ['ad campaign', 'facebook ad', 'meta ad', 'google ad', 'paid advertising', 'ad creative'] },
  { skill: 'outreach', kw: ['cold dm', 'cold outreach', 'reach out to', 'prospect message', 'first contact'] },
  { skill: 'proposal', kw: ['client proposal', 'service quote', 'business offer', 'devis', 'project offer'] },
  { skill: 'schedule', kw: ['my schedule', 'weekly schedule', 'daily routine', 'time blocking', 'plan my week'] },
  { skill: 'imgprompt', kw: ['image prompt', 'midjourney', 'dalle', 'stable diffusion', 'generate an image', 'ai art'] },
  { skill: 'present', kw: ['presentation', 'slide deck', 'pitch deck', 'keynote', 'powerpoint', 'create slides'] },
  { skill: 'automate', kw: ['automate', 'automation', 'workflow', 'zapier', 'make.com', 'n8n'] },
  { skill: 'search', kw: ['latest', 'news about', 'current data on', 'find stats', 'market research', 'real time data'] },
  { skill: 'security', kw: ['security audit', 'vulnerability', 'protect my app', 'secure my api', 'xss', 'audit sécurité'] }
];

export function smartRouteMsg(text) {
  if (!text || text.trim().split(/\s+/).filter(Boolean).length < 2) return null;
  if (/^\s*\/\w+/.test(text)) return null; 
  
  const lower = text.toLowerCase();
  let best = null, bestScore = 0;
  
  for (const { skill, kw } of SKILL_ROUTER) {
    let score = 0;
    for (const k of kw) {
      if (lower.includes(k)) score += k.split(' ').length;
    }
    if (score > bestScore) { bestScore = score; best = skill; }
  }
  
  if (!best || bestScore < 1) return null;
  
  const prompt = PROMPTS[best] || '';
  const enhanced = prompt
    ? `${prompt}\n\n---\nUser's request: "${text}"\nApply the skill framework above directly to this specific request.`
    : text;
    
  return { skill: best, enhanced };
}

export function detectIntent(text) {
  const t = text.toLowerCase().trim();
  if (t.startsWith('/scrape ')) {
    const url = text.slice(8).trim();
    return url ? { type: 'scrape', url } : null;
  }
  if (t.startsWith('/search ')) return { type: 'search', query: text.slice(8).trim() };
  if (t.startsWith('/resume')) return { type: 'resume', input: text.slice(7).trim() };
  if (t.startsWith('/campaign')) return { type: 'campaign' };
  if (t.startsWith('/pdf')) return { type: 'pdf' };
  
  // Natural language URL detection
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (urlMatch && (t.includes('scrape') || t.includes('analyze') || t.includes('summarize'))) {
    return { type: 'scrape', url: urlMatch[0] };
  }
  
  return null;
}
