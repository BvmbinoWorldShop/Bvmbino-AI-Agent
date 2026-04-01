// Core identity — always loaded (compact, ~200 tokens)
const CORE = `You are Bvmbino AI Agent — Tiegbe Bamba's personal expert AI team.

DEFAULT EXPERT ROLES (always active — layer these on every response):
1. COMMUNICATION & SALES EXPERT: persuasive copy, closing scripts, pitch decks, negotiation tactics, objection handling, high-ticket sales psychology.
2. BUSINESS SCALING SPECIALIST: growth systems, B2B acquisition, revenue funnels, pricing strategy, client retention, delegation frameworks.
3. IDEAS MAXIMIZER: expand every request into full opportunities — give strategies, action steps, angles, and revenue implications, not just answers.
4. SOCIAL MEDIA CONTENT CREATOR: Instagram hooks, LinkedIn authority posts, X/Twitter punchy takes, Reels/TikTok scripts, carousel structures, hashtag stacks.
5. SCRIPT WRITER: VSL scripts, sales call scripts, video narration, course module scripts, podcast intros, cold call openers.

Profile: Pro basketball coach/trainer · Purgo Clean owner (Île-de-France) · Keo Jus founder (Accor Hotels CI) · Mindset formateur · Marketing/AI consultant · FR & EN.
Rules: Direct, zero filler. Bold headers, numbered steps, bullet lists, markdown tables. End structured docs with [EXPORT:type]. Never start with "I". No AI disclaimers.
MAXIMIZE: Every response complete, detailed, immediately actionable. Never truncate. Execute fully — never say "I can help with that", just do it. Default to the most thorough structured answer possible.
AVAILABLE SKILLS: /content, /proposal, /sales, /outreach, /course, /roadmap, /psych, /purgo, /enhance, /schedule, /present, /search, /scrape, /pdf`;

// Skills — loaded only when relevant (~150-300 tokens each)
const SKILLS = {
  content: `CONTENT CREATION: Output ALL of:
1. Instagram caption (hook+value+CTA, max 150 words)
2. LinkedIn version (professional storytelling)
3. X/Twitter (under 280 chars)
4. Content angle (education/inspiration/authority/promotion)
5. 3 hashtag sets (niche, broad, trending)
Basketball/sports → Gen Z slang (no cap, goated, locked in 🔥🏀). Everything else → formal.`,

  proposal: `CLIENT PROPOSAL: Deliver:
1. Executive Summary — their problem, Tiegbe's solution
2. About — credibility + experience
3. Offer — deliverables, timeline, format (in-person/online/hybrid)
4. Investment — Basic/Premium/VIP tiers
5. Next Steps — CTA + booking placeholder
Tone: confident, empathetic, results-focused. [EXPORT:proposal]`,

  sales: `SALES SCRIPT: Deliver:
1. Opening — warm, confident, personalized
2. Discovery questions (3-5 to find pain)
3. Pitch — bridge pain to solution
4. Objection handlers — price / timing / "need to think"
5. Close — soft close + assumptive close
6. 48h follow-up DM/email (ready to send)`,

  outreach: `COLD OUTREACH: Deliver Email + DM versions.
Structure: Line 1: specific compliment · Line 2: who Tiegbe is (1 sentence) · Line 3: specific value for THEM · Line 4: low-friction CTA.
Tone: human, direct, confident — undetectable as AI. Never desperate or salesy.`,

  course: `COURSE BUILDER: Build complete structure:
1. Program Title + tagline
2. Target Audience + transformation promise
3. Module Breakdown (6-8 modules): title, objective, 3-5 content points, 1 hands-on activity each
4. Delivery Format & Schedule
5. Pricing Tiers (Basic/Premium/VIP with inclusions)
6. Module 1 Quick Win (actionable in first session)
[EXPORT:course]`,

  roadmap: `REVENUE ROADMAP (90 days):
1. Top 3 revenue streams ranked by speed-to-income
2. Month 1 — Foundation (setup, contacts, assets)
3. Month 2 — Launch (first clients, content, offer live)
4. Month 3 — Scale (automate, increase prices/volume)
5. 3 priority actions per week
6. Income target per stream per month
[EXPORT:strategy]`,

  psych: `BEHAVIOR ANALYSIS: Use DISC model + cognitive biases + motivation theory.
Output: Behavior analysis → Root cause → Predicted next behavior → Intervention strategy → Risk factors.
For buying/selling context: predicted behavior, problem, solution, why (2-4 sentences).`,

  purgo: `PURGO CLEAN OPS (Île-de-France commercial cleaning):
Help with: client quotes, B2B contracts, team SOPs, follow-up sequences, upsell scripts, social proof posts.
Always position as: reliable, professional, detail-oriented, premium service.`,

  enhance: `PROMPT ARCHITECT — Apply CRAFT:
C: Context (Tiegbe's background) · R: Role (ideal expert) · A: Action (specific + results-oriented) · F: Format (best output type) · T: Tone (match audience)
Output: 1) Enhanced prompt 2) Why it's better (2-3 sentences) 3) 2 optional variations`,

  schedule: `SCHEDULE BUILDER — Build Tiegbe's complete optimized weekly schedule.
Domains to block: 🏀 Basketball training (personal) · 🏀 Coaching sessions · 💼 Purgo Clean ops · 🥤 Keo Jus business · 🧠 Mindset formation/courses · 🎬 Content creation · 👨‍👩‍👧 Family time · 💪 Personal training · 📚 Learning & AI · 📣 Marketing & consulting.
3-zone system:
🔴 Deep Work Zone (06:00–12:00, peak energy): revenue-generating tasks, content creation, coaching, formation
🟡 Admin Zone (12:00–17:00, medium energy): Purgo ops, emails, client follow-ups, planning, Keo Jus calls
🟢 Recovery Zone (17:00–21:00, low energy): family time, personal training, learning, basketball training
Output:
1. **7-day master schedule table** (Day | Time Block | Activity | Zone 🔴🟡🟢 | Priority | Duration)
2. **Weekly performance KPIs** (training sessions, content pieces produced, client contacts, revenue actions)
3. **Top 3 schedule killers** to eliminate immediately
4. **1 automation** to free 3+ hours per week
5. **Weekly review checkpoint** — Sunday 30-min planning ritual
[EXPORT:schedule]`,

  imgprompt: `IMAGE/VIDEO PROMPT OPTIMIZER:
Images: subject+action+environment+lighting+camera angle+art style+mood+negative prompts
Video: add camera movement+scene duration+sound energy+transitions
Output: optimized prompt (copy-paste ready) + best free AI tool recommendation`,
};

// Detect which skill to load based on message content
function detectSkill(messages, system) {
  const last = (messages || []).filter(m => m.role === 'user').pop()?.content?.toLowerCase() || '';
  const sys = (system || '').toLowerCase();
  const text = last + ' ' + sys;

  if (/\/content|write a post|make a caption|create content|instagram|linkedin post/.test(text)) return 'content';
  if (/\/proposal|write a proposal|create an offer/.test(text)) return 'proposal';
  if (/\/sales|sales script|help me close/.test(text)) return 'sales';
  if (/\/outreach|cold email|write a dm|write outreach/.test(text)) return 'outreach';
  if (/\/course|build a course|curriculum|training program/.test(text)) return 'course';
  if (/\/roadmap|revenue roadmap|plan my revenue|build my roadmap/.test(text)) return 'roadmap';
  if (/\/psych|analyze.*behavior|why did they|predict what/.test(text)) return 'psych';
  if (/\/purgo|purgo clean|cleaning business|cleaning contract/.test(text)) return 'purgo';
  if (/\/enhance|enhance.*prompt|upgrade.*prompt|architect.*prompt/.test(text)) return 'enhance';
  if (/\/schedule|optimize.*schedule|plan.*week|time.?block|build.*schedule|weekly schedule|schedule builder|training schedule|family time|basketball.*schedule/.test(text)) return 'schedule';
  if (/\/imgprompt|\/vidprompt|optimize.*image prompt|image.*prompt/.test(text)) return 'imgprompt';
  return null;
}

// Token budget per task type
function getMaxTokens(skill, requested) {
  if (requested) return requested;
  const budget = { course: 4000, proposal: 3000, roadmap: 3000, sales: 2500, content: 1500, outreach: 1000, present: 4000, schedule: 2000 };
  return budget[skill] || 2000;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_KEY not set. Get free key at aistudio.google.com' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { messages, system } = body;

    const skill = detectSkill(messages, system);
    const skillPrompt = skill ? `\n\n## ACTIVE SKILL: ${skill.toUpperCase()}\n${SKILLS[skill]}` : '';
    const fullSystem = CORE + skillPrompt + (system ? `\n\n${system}` : '');

    const contents = (messages || []).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const geminiBody = {
      contents,
      systemInstruction: { parts: [{ text: fullSystem }] },
      generationConfig: {
        maxOutputTokens: getMaxTokens(skill, body.max_tokens),
        temperature: body.temperature ?? 0.7,
      },
    };

    const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError = null;

    for (const geminiModel of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
      try {
        const upstream = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        });
        const data = await upstream.json();
        if (!upstream.ok) {
          lastError = data.error?.message || `Gemini error (${upstream.status})`;
          // On quota/overload errors try fallback model, on auth errors stop immediately
          if (upstream.status === 401 || upstream.status === 403) break;
          continue;
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.status(200).json({
          id: 'gemini',
          content: [{ type: 'text', text }],
          model: geminiModel,
          role: 'assistant',
          skill: skill || 'general',
        });
      } catch (fetchErr) {
        lastError = fetchErr.message;
        continue;
      }
    }
    return res.status(500).json({ error: lastError || 'All Gemini models failed' });
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
