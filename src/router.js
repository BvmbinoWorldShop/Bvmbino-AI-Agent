/**
 * router.js - Smart Intent Routing and Skill detection.
 */

import { GRID_SKILLS } from './skills.js';
import { store, toast } from './core.js';

export function smartRouteMsg(text) {
  if (!text || text.trim().split(/\s+/).filter(Boolean).length < 2) return null;
  if (/^\s*\/\w+/.test(text)) return null;

  const lower = text.toLowerCase();
  const ventures = document.getElementById('mp-ventures')?.textContent.toLowerCase() || '';
  const projects = document.getElementById('mp-projects')?.textContent.toLowerCase() || '';
  const context = ventures + ' ' + projects;

  const SKILL_KW = [
    { skill: 'leads', kw: ['prospect', 'lead gen', 'find leads', 'qualify', 'prospecting', 'scraper'] },
    { skill: 'email', kw: ['email', 'sequence', 'cold mail', 'follow-up', 'newsletter', 'outreach'] },
    { skill: 'content', kw: ['instagram', 'linkedin', 'twitter', 'tiktok', 'social', 'caption', 'viral', 'hook', 'script', 'post'] },
    { skill: 'sales', kw: ['closing', 'sales script', 'objection', 'dm script', 'selling', 'pitch', 'closer'] },
    { skill: 'strategy', kw: ['strategy', 'growth', 'business plan', '90 day', 'go to market', 'scale', 'roadmap'] },
    { skill: 'website', kw: ['landing page', 'funnel', 'web design', 'conversion', 'website', 'ui/ux'] },
    { skill: 'budget', kw: ['roi', 'cash flow', 'finance', 'projection', 'cost', 'budget', 'profit', 'margin'] },
    { skill: 'campaign', kw: ['ads', 'meta ads', 'facebook ads', 'google ads', 'media buying', 'roas', 'campaign'] },
    { skill: 'automate', kw: ['zapier', 'make.com', 'n8n', 'workflow', 'automation', 'automate', 'integration'] },
    { skill: 'psych', kw: ['behavioral', 'nlp', 'influence', 'psychology', 'persuasion', 'bias'] },
    { skill: 'lex', kw: ['legal', 'lawyer', 'contract', 'compliance', 'regulatory', 'clause', 'terms'] },
    { skill: 'security', kw: ['audit', 'vulnerability', 'cyber', 'security', 'hack', 'remediation'] },
  ];

  let best = null, bestScore = 0;

  // Scoring logic: Exact word match in text + contextual boost from memory hub
  for (const { skill, kw } of SKILL_KW) {
    let score = 0;
    for (const k of kw) {
      // Check for word presence in user text
      const regex = new RegExp(`\\b${k}\\b`, 'i');
      if (regex.test(lower)) score += k.split(' ').length * 2;

      // Check for word presence in memory context (boost)
      if (regex.test(context)) score += 0.5;
    }
    if (score > bestScore) {
      bestScore = score;
      best = skill;
    }
  }

  if (!best || bestScore < 2) return null; // Higher threshold for automatic routing

  // Find the matching skill in GRID_SKILLS to get the full prompt if needed
  // In the modular version, prompts are often tied to the skill id
  const skillObj = GRID_SKILLS.find(s => s.id === best);
  const prompt = skillObj ? skillObj.use : ''; // Fallback to 'use' or a dedicated prompt registry

  return {
    skill: best,
    enhanced: prompt
      ? `[AGENT ACTIVATED: /${best}]\n${prompt}\n\n[CONTEXT]: User is asking about "${best}" in the context of their ventures.\n\nUser request: "${text}"\nBe immediate and concrete.`
      : text
  };
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
