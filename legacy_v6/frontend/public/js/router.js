/**
 * router.js — Smart Intent Routing and Skill detection.
 * FIXED v3.6
 *
 * AUDIT NOTES:
 *  - Removed unused `state` and `toast` imports
 *  - Removed unused CMDS import (only PROMPTS is actually referenced)
 *  - Expanded SKILL_ROUTER keyword list back to richer set from original
 */

import { PROMPTS } from './core.js';

export const SKILL_ROUTER = [
  { skill: 'content', kw: ['instagram', 'linkedin', 'twitter', 'tiktok', 'facebook post', 'x post', 'reel', 'story', 'stories', 'caption', 'hashtag', 'viral', 'social media post', 'content creator', 'create content', 'need content', 'write a post', 'write a caption', 'post for my', 'social strategy', 'hook line', 'cta', 'call to action', 'engagement', 'followers', 'brand content', 'carousel', 'short video', 'ugc', 'influencer', 'content calendar', 'content plan', 'post ideas', 'post about'] },
  { skill: 'sales', kw: ['close a deal', 'closing technique', 'sales script', 'sales pitch', 'objection handling', 'objection', 'follow-up message', 'follow up with', 'cold call script', 'pipeline', 'sell my service', 'pitch my offer', 'win the client', 'convert prospect', 'discovery call', 'sales strategy', 'dm script', 'commission', 'upsell', 'cross-sell', 'client said no', 'negotiate price'] },
  { skill: 'budget', kw: ['my expenses', 'my budget', 'my finances', 'cash flow', 'monthly spending', 'i owe', 'debt problem', 'save money', 'financial plan', 'how much should i', 'revenue target', 'profit margin', 'money management', 'financial situation', 'income streams', 'break even', 'overhead cost', 'business finance', 'personal finance', 'invest my money', 'dépenses', 'budget mensuel'] },
  { skill: 'writer', kw: ['write an article', 'write a blog', 'long form article', 'write an essay', 'book chapter', 'ghostwrite', 'write a story', 'editorial piece', 'newsletter content', 'write me a', 'write about', 'blog post about', 'opinion piece', 'in-depth article', 'copywriting', 'human writing', 'no ai feel', 'natural writing', 'deep dive on'] },
  { skill: 'email', kw: ['write an email', 'draft an email', 'email to my client', 'professional email', 'follow-up email', 'email template', 'email sequence', 'email campaign', 'mail professionnel', 'cold email', 'introduction email'] },
  { skill: 'course', kw: ['build a course', 'create a course', 'online course', 'course outline', 'curriculum design', 'lesson plan', 'e-learning', 'module breakdown', 'training program', 'teach people about', 'formation en ligne', 'créer une formation', 'workshop structure', 'certification program'] },
  { skill: 'strategy', kw: ['business strategy', 'growth strategy', 'scale my business', 'grow my company', 'market strategy', 'go to market', 'business plan', 'action plan', '90 day plan', 'competitive advantage', 'market positioning', 'business model', 'revenue strategy', 'how to grow', 'how to scale', 'expand my business', 'swot analysis', 'business roadmap', 'stratégie business'] },
  { skill: 'resume', kw: ['my resume', 'my cv', 'cover letter', 'job application', 'apply for', 'job offer', 'job search', 'curriculum vitae', 'lettre de motivation', 'interview prep', 'linkedin profile', 'professional bio'] },
  { skill: 'campaign', kw: ['ad campaign', 'facebook ad', 'meta ad', 'google ad', 'paid advertising', 'run ads', 'advertising', 'ad creative', 'ad copy', 'targeting audience', 'retargeting', 'sponsored post', 'marketing campaign', 'campagne pub', 'ad budget', 'performance marketing', 'media buying'] },
  { skill: 'outreach', kw: ['cold dm', 'cold outreach', 'reach out to', 'prospect message', 'first contact', 'intro message', 'find new clients', 'cold message', 'outreach strategy', 'prospection', 'partnership message', 'collab message'] },
  { skill: 'proposal', kw: ['client proposal', 'write a proposal', 'service quote', 'business offer', 'pricing proposal', 'devis', 'freelance contract', 'service agreement', 'package offer', 'offre commerciale', 'scope of work', 'project offer', 'commercial proposal'] },
  { skill: 'schedule', kw: ['my schedule', 'weekly schedule', 'daily routine', 'time blocking', 'plan my week', 'time management', 'morning routine', 'work schedule', 'productivity plan', 'semaine type', 'organisation journée', 'deep work blocks'] },
  { skill: 'imgprompt', kw: ['image prompt', 'midjourney', 'dall-e', 'dalle', 'stable diffusion', 'generate an image', 'ai image', 'photo prompt', 'visual prompt', 'create an image', 'design prompt', 'ai art', 'image generation', 'realistic image prompt'] },
  { skill: 'present', kw: ['presentation', 'slide deck', 'pitch deck', 'keynote', 'powerpoint', 'create slides', 'slides for', 'present to investors', 'investor pitch', 'company presentation', 'product presentation', 'présentation', 'board presentation', 'client presentation', 'deck'] },
  { skill: 'automate', kw: ['automate', 'automation', 'workflow', 'zapier', 'make.com', 'n8n', 'no-code tool', 'repetitive task', 'integrate my apps', 'automatiser', 'business automation', 'crm automation', 'lead automation'] },
  { skill: 'search', kw: ['what is the latest', 'recent news about', 'current data on', 'find stats on', 'find statistics', 'research on', 'market research', 'competitor analysis', 'industry report', 'latest trend', 'real time data', 'fact check', 'look up data'] },
  { skill: 'security', kw: ['security audit', 'check my code for', 'find vulnerability', 'protect my app', 'penetration test', 'secure my api', 'code review security', 'xss', 'injection attack', 'api security', 'data protection', 'audit sécurité', 'sécuriser'] }
];

/**
 * Phrase-length weighted scoring: longer matched phrases beat single words.
 * Returns null if message is too short, is a slash command, or matches no skill.
 */
export function smartRouteMsg(text) {
  if (!text || text.trim().split(/\s+/).filter(Boolean).length < 2) return null;
  if (/^\s*\/\w+/.test(text)) return null; // slash commands handled by intent

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
    ? `${prompt}\n\n---\nUser's request: "${text}"\nApply the skill framework above directly to this specific request. Be immediate and concrete.`
    : text;

  return { skill: best, enhanced };
}

/**
 * Slash-command intent parser. Handles explicit /commands and natural-language URLs.
 */
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
  if (t.startsWith('/schedule')) {
    const parts = t.split(/\s+/);
    const view = ['daily', 'weekly', 'biweekly', 'monthly'].find(v => parts.includes(v)) || 'weekly';
    return { type: 'schedule', view };
  }

  // Natural language URL detection
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (urlMatch && (t.includes('scrape') || t.includes('analyze') || t.includes('summarize') || t.includes('extract'))) {
    return { type: 'scrape', url: urlMatch[0] };
  }

  return null;
}
