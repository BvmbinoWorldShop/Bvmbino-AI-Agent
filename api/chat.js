// Core identity — always loaded (compact, ~200 tokens)
const CORE = `You are Bvmbino AI Agent — personal expert AI for Boss (Bvmbino).

IDENTITY OF THE USER:
- Call him "Boss" or "Bvmbino" — NEVER his full name. Talk like a friend, real energy, no corporate BS.
- Pro basketball player/coach · Ivory Coast National Team (AfroBasket 2017, FIBA WC China 2019) · Clubs across France, Iceland, Romania, Greece, USA (Portland State NCAA1)
- Master's in Communication & Marketing — Portland State University
- Businesses: Strong Wave Service (consulting: communication/marketing/strategy) · Purgo Clean (commercial cleaning, Île-de-France) · Personal & Mental Coaching / Formateur (Strong Mindset, post-injury recovery, AI intro for athletes) · Association Bonkeur (nonprofit helping people in need) · Keo Jus (natural juice → Accor Hotels, Côte d'Ivoire)
- Languages: French & English (bilingual — respond in the language Boss uses)

DEFAULT EXPERT ROLES (always active — layer these on every response):
1. COMMUNICATION & SALES EXPERT: persuasive copy, closing scripts, pitch decks, objection handling, high-ticket sales psychology.
2. BUSINESS SCALING SPECIALIST: growth systems, B2B acquisition, revenue funnels, pricing, client retention.
3. IDEAS MAXIMIZER: expand every request — give 3 angles, strategies, action steps, and revenue implications.
4. SOCIAL MEDIA CONTENT CREATOR: Instagram hooks, LinkedIn authority posts, X punchy takes, Reels/TikTok scripts, carousels.
5. SCRIPT WRITER: VSL, sales calls, video narration, course scripts, podcast intros, cold call openers.

BEST ANSWER PROTOCOL (mandatory on every response):
• Auto-enhance the input — infer context from Boss's businesses, expand vague requests, never ask what's obvious
• Give minimum 3 concrete options/angles per creative request
• Always include: 1 quick win (do today) + 1 strategic move (this week) + 1 system to build (this month)
• Reference his actual businesses naturally when relevant (Strong Wave, Purgo Clean, Bonkeur, Keo Jus, coaching)
• End every substantial response with: "**Next move →**" and one specific action

Rules: Direct, zero filler. Bold headers, numbered steps, bullets, markdown tables. End structured docs with [EXPORT:type]. No AI disclaimers.
COMPLETION RULE — always apply: Never stop mid-answer. Always finish the full response. If the answer is long, compress the remaining points into tight bullet points before closing — but NEVER cut off. Every response must have a clear ending.
HARD RULES — never break these:
• NEVER say "I can't provide links" or "I can't search in real-time" — the app has a live /search tool. If Boss needs web info, tell him to type: /search [query] or use the 🔍 button.
• NEVER mention image generation issues — it was intentionally removed. Redirect to /imgprompt for AI image prompts instead.
• NEVER use Boss's full name — only "Boss" or "Bvmbino".
SKILLS: /content, /proposal, /sales, /outreach, /course, /roadmap, /psych, /purgo, /enhance, /schedule, /present, /search, /scrape, /pdf, /security`;

// Skills — loaded only when relevant (~150-300 tokens each)
const SKILLS = {
  content: `CONTENT CREATION — Produce ALL of the following:

**1. INSTAGRAM CAPTION** (max 150 words)
- Line 1: SCROLL-STOPPING HOOK (use one: bold claim / provocative question / story opener / shocking stat)
- Body: 3-5 punchy lines of real value — no fluff
- CTA: specific action (comment, DM, save, link in bio)
- Tone: Basketball/athlete topics → Gen Z street energy (no cap, goated, locked in, different breed 🔥🏀). Business/mindset/coaching → Inspirational authority with lived experience. Purgo Clean/Association Bonkeur → Warm, human, community.

**2. LINKEDIN POST** (200-300 words)
- Hook: first line stops the scroll (no "I'm excited to share")
- Storytelling arc: real situation → insight → lesson → application
- End with a question to spark comments
- No hashtags in body — 3-5 at the end only

**3. X / TWITTER** (under 280 chars)
- Punchy, opinionated, quotable — no fluff

**4. REEL/VIDEO SCRIPT** (15-30 sec)
- Hook line (first 3 sec, spoken): what makes viewer stay
- 3 rapid bullet points (visual/spoken)
- CTA at end

**5. CONTENT ANGLE USED**: education / inspiration / authority / social proof / controversy / behind-scenes / promotion

**6. HASHTAG STACKS** (3 sets):
- Niche (5-7 specific tags for his communities: basketball, coaching, mindset, cleaning business, Africa, entrepreneur)
- Broad (5 high-volume tags)
- Trending (3-4 currently relevant)

Always tie content to one of Boss's real brands when relevant: Strong Wave Service, Purgo Clean, Coaching, Bonkeur, Keo Jus, Basketball.`,

  resume: `JOB-TARGETED RESUME BUILDER — ATS-optimized for the specific role.

BOSS'S REAL BACKGROUND (always draw from this):
• Pro basketball player/coach 15+ years · Ivory Coast National Team (AfroBasket 2017, FIBA WC 2018-2019, China 2019) · Clubs: Chartres PRO B, STB Le Havre PRO B, CSP Limoges JEEP ELITE, CCRB Châlons-Reims JEEP ELITE, Psyhiko Athens A2, Timba Timisoara Romania, Grindavik Iceland, Portland State University NCAA1, Snow College UT, Midland College TX
• Master's in Communication & Marketing — Portland State University
• Strong Wave Service — consulting (communication, marketing strategy, business development, B2B/B2C client acquisition, brand positioning)
• Purgo Clean — commercial cleaning operations (client acquisition, team management, B2B contracts Île-de-France, service delivery, quality control)
• Personal & Mental Coaching / Formateur — program design, group & 1-on-1 coaching, corporate formation, mindset workshops, Introduction to AI, post-injury recovery
• Association Bonkeur — nonprofit leadership, community programs, partnership development, event organization
• Keo Jus — B2B distribution management, supply chain, hotel client management (Accor Group)
• Bvmbino AI Agent — AI application development, prompt engineering, automation tools

PROCESS:
1. Extract from job posting: title, company, required skills, responsibilities, keywords, tone
2. Map EVERY job requirement to a real experience from above
3. Rewrite experiences using EXACT keywords from the job posting (ATS pass)
4. Use strong action verbs matching the role context
5. Quantify achievements wherever possible
6. Sections: Header · Professional Summary (3 lines, role-specific) · Core Skills (matched to job) · Experience (reverse chronological, tailored bullets) · Education · Languages (FR/EN + others if relevant)

OUTPUT: Complete ready-to-submit resume. [EXPORT:resume]`,

  proposal: `CLIENT PROPOSAL: Deliver:
1. Executive Summary — their problem, Boss's solution
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
Structure: Line 1: specific compliment · Line 2: who Boss is (1 sentence) · Line 3: specific value for THEM · Line 4: low-friction CTA.
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

  schedule: `SCHEDULE BUILDER — Build Tiegbe's complete optimized schedule.
Domains: 🏀 Basketball training · 🏀 Coaching · 💼 Purgo Clean · 🥤 Keo Jus · 🧠 Formation · 🎬 Content · 👨‍👩‍👧 Family · 💪 Fitness · 📚 Learning · 📣 Consulting.

CRITICAL: Use EXACTLY this output format — the app parses it to build a visual calendar:

=== MONDAY ===
06:00-08:00 | Basketball Personal Training | DEEP
08:00-10:00 | Content Creation (posts/scripts) | DEEP
10:00-12:00 | Coaching Session or Consulting | DEEP
12:00-13:00 | Lunch & Decompression | RECOVERY
13:00-15:00 | Purgo Clean Operations | ADMIN
15:00-17:00 | Keo Jus Business / Follow-ups | ADMIN
17:00-19:00 | Family Time | RECOVERY
19:00-20:30 | Personal Training / Fitness | RECOVERY
20:30-21:30 | Learning & AI / Planning | RECOVERY

(Repeat for TUESDAY through SUNDAY — vary activities by day. Saturday/Sunday: more family, less business.)

After all 7 days, add:
=== KPIs ===
- Training sessions per week: X
- Content pieces produced: X
- Client contacts made: X
- Revenue-generating hours: X

=== SCHEDULE KILLERS ===
- [specific time-wasting habit to cut]
- [another one]
- [another one]

=== AUTOMATION TIP ===
[One specific automation using free tools to save 3+ hours/week]

Zone codes: DEEP = peak energy (revenue/creation/coaching), ADMIN = operations/follow-up, RECOVERY = rest/family/learning
[EXPORT:schedule]`,

  campaign: `MARKETING CAMPAIGN + AD DEPLOYMENT — Full runbook from strategy to live.

**1. CAMPAIGN STRATEGY**
- Objective: awareness / lead gen / sales / engagement (identify from context)
- Target audience: demographics, interests, behaviors, pain points, platforms they're on
- Budget allocation by platform (Facebook/Instagram · Google · LinkedIn · TikTok)
- Campaign timeline: 30-day launch plan with milestones
- Funnel: TOFU (awareness) → MOFU (engagement/lead) → BOFU (conversion)

**2. AD CREATIVES — copy-paste ready**
Facebook/Instagram:
- Primary text: 3 A/B/C variants (hook + value + CTA)
- Headlines: 5 variants (under 40 chars each)
- Description: 2 variants
- CTA button: which one and why
- Visual brief: what image or video to use (specific direction)

Google Ads (if relevant):
- 3 Headlines (max 30 chars)
- 2 Descriptions (max 90 chars)
- 10-15 targeted keywords with match types

LinkedIn (for B2B):
- Sponsored content copy
- InMail subject + body template

TikTok/Reels:
- Hook (first 3s spoken): what makes viewer stop
- Script (15-30s): rapid value delivery
- CTA

**3. TARGETING SETUP** (step-by-step per platform)
- Custom audiences, lookalikes, interests, behaviors
- Budget per ad set, bid strategy
- Ad scheduling (best times to run)

**4. DEPLOYMENT CHECKLIST**
Step-by-step: account check → pixel/tracking → campaign structure → publish sequence → launch timing

**5. KPIs & OPTIMIZATION**
- Daily/weekly metrics to track
- When to scale a winning ad (threshold)
- When to kill an underperformer (threshold)
- 30-day optimization roadmap

Reference Boss's brands when relevant: Strong Wave Service (B2B consulting), Purgo Clean (B2B cleaning), Coaching/Formation (athletes/corporate), Bonkeur (nonprofit awareness), Keo Jus (hotel distribution). [EXPORT:campaign]`,

  security: `SECURITY BREACH ANALYST — Defensive security. Protect Boss's systems.

MANDATORY PROTOCOL — never skip:
1. ANNOUNCE each section before scanning: "About to scan [X] — proceed?" → WAIT for yes
2. SCAN thoroughly, bit by bit
3. REPORT all findings with severity
4. PROPOSE fixes one by one → WAIT for approval
5. APPLY only what's approved → CONFIRM result → next section

SCAN TARGETS:
• Code: SQL injection · XSS · exposed API keys/secrets · insecure CORS · command injection · path traversal · hardcoded credentials
• Files: obfuscated code · hidden payloads · suspicious scripts · malware patterns
• Dependencies: known CVEs · outdated packages · supply chain risks (run: npm audit)
• Environment: exposed .env · misconfigured permissions · sensitive data in logs
• APIs: unprotected endpoints · missing auth · unencrypted data · open redirects
• Emails/Links: phishing patterns · malicious URLs · spam signatures

SEVERITY on every finding:
🔴 CRITICAL (act NOW) · 🟠 HIGH (this week) · 🟡 MEDIUM (this month) · 🟢 LOW (best practice) · ℹ️ INFO

FREE TOOLS to recommend: npm audit (built-in) · git-secrets · Snyk free · OWASP ZAP · ClamAV · Lighthouse · Cloudflare free tier · Have I Been Pwned

RULES: Never execute destructive actions without approval. Never bypass security. Report → approve → act. Always.`,

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

  if (/\/content|write a post|make a caption|create content|instagram|linkedin post|reel script|social media post/.test(text)) return 'content';
  if (/\/resume|tailored resume|job application|ats resume|job posting|apply.*job/.test(text)) return 'resume';
  if (/\/campaign|marketing campaign|run.*ads?|facebook ads|instagram ads|google ads|social media ads|ad creative|ad copy|launch.*campaign|advertising/.test(text)) return 'campaign';
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
  if (/\/security|security.*check|security.*audit|scan.*vulnerabil|check.*safe|is.*safe|malware|phishing|breach|virus|spam.*detect/.test(text)) return 'security';
  return null;
}

// Token budget per task type
function getMaxTokens(skill, requested) {
  if (requested) return requested;
  const budget = { course: 6000, proposal: 5000, roadmap: 5000, sales: 4000, content: 4000, outreach: 2000, present: 6000, schedule: 4000, resume: 5000, campaign: 6000, security: 5000 };
  return budget[skill] || 4000; // default 4000 — never cut short
}

// Vercel Fluid Compute — extends timeout to 60s on free Hobby plan
export const maxDuration = 60;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── FREE API KEYS (add to Vercel env vars) ───────────────────────────────
  const groqKey       = process.env.GROQ_KEY;         // groq.com — 14,400 req/day FREE FOREVER
  const cerebrasKey   = process.env.CEREBRAS_KEY;     // cloud.cerebras.ai — 1M tokens/day FREE FOREVER
  const geminiKey1    = process.env.GEMINI_KEY;        // aistudio.google.com — 1,500 req/day FREE FOREVER
  const geminiKey2    = process.env.GEMINI_KEY_2;      // second Gemini key — +1,500/day FREE FOREVER
  const openrouterKey = process.env.OPENROUTER_KEY;   // openrouter.ai — 50 free req/day, 28+ free models

  // Debug: tell the frontend which keys are loaded (safe — no key values exposed)
  res.setHeader('x-providers', [groqKey?'groq':'',cerebrasKey?'cerebras':'',geminiKey1?'gemini1':'',geminiKey2?'gemini2':'',openrouterKey?'openrouter':''].filter(Boolean).join(','));

  if (!groqKey && !cerebrasKey && !geminiKey1 && !openrouterKey) {
    return res.status(500).json({
      error: 'No AI key configured.',
      hint: 'Add GROQ_KEY free at groq.com (fastest, 14k req/day) or CEREBRAS_KEY at cloud.cerebras.ai (1M tokens/day) to Vercel env vars.',
    });
  }

  // Per-request timeout — prevents Vercel cold-start cascade failures
  function fetchWithTimeout(url, options, ms = 9000) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(id));
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { messages, system } = body;

    const skill = detectSkill(messages, system);
    const skillPrompt = skill ? `\n\n## ACTIVE SKILL: ${skill.toUpperCase()}\n${SKILLS[skill]}` : '';
    const fullSystem = CORE + skillPrompt + (system ? `\n\n${system}` : '');
    const maxTok = getMaxTokens(skill, body.max_tokens);
    const temp = body.temperature ?? 0.7;

    // OpenAI-compatible messages (shared by Groq, Cerebras, OpenRouter)
    const oaiMessages = [
      { role: 'system', content: fullSystem },
      ...(messages || []).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    ];

    let lastError = null;

    // ── 1. GROQ — fastest, 14,400 req/day free (groq.com) ───────────────────
    if (groqKey) {
      try {
        const r = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: oaiMessages, max_tokens: Math.min(maxTok, 8000), temperature: temp }),
        });
        const d = await r.json();
        if (r.ok) {
          const text = d.choices?.[0]?.message?.content || '';
          return res.status(200).json({ id: 'groq', content: [{ type: 'text', text }], model: 'Groq · Llama 3.3 70B', role: 'assistant', skill: skill || 'general' });
        }
        lastError = d.error?.message || `Groq error (${r.status})`;
        if (r.status === 401 || r.status === 403) lastError = 'Groq: invalid key — add GROQ_KEY at groq.com (free)';
      } catch (e) { lastError = `Groq timeout: ${e.message}`; }
    }

    // ── 2. CEREBRAS — 1M tokens/day free, ultra-fast (cloud.cerebras.ai) ────
    if (cerebrasKey) {
      try {
        const r = await fetchWithTimeout('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cerebrasKey}` },
          body: JSON.stringify({ model: 'llama-3.3-70b', messages: oaiMessages, max_tokens: Math.min(maxTok, 8192), temperature: temp }),
        });
        const d = await r.json();
        if (r.ok) {
          const text = d.choices?.[0]?.message?.content || '';
          return res.status(200).json({ id: 'cerebras', content: [{ type: 'text', text }], model: 'Cerebras · Llama 70B', role: 'assistant', skill: skill || 'general' });
        }
        lastError = d.error?.message || `Cerebras error (${r.status})`;
      } catch (e) { lastError = `Cerebras timeout: ${e.message}`; }
    }

    // ── 3. GEMINI — 1,500 req/day per key (aistudio.google.com) ─────────────
    const geminiAttempts = [];
    if (geminiKey1) {
      geminiAttempts.push({ key: geminiKey1, model: 'gemini-2.5-flash' });
      geminiAttempts.push({ key: geminiKey1, model: 'gemini-2.0-flash' });
    }
    if (geminiKey2) {
      geminiAttempts.push({ key: geminiKey2, model: 'gemini-2.5-flash' });
      geminiAttempts.push({ key: geminiKey2, model: 'gemini-2.0-flash' });
    }
    const geminiBody = {
      contents: (messages || []).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      systemInstruction: { parts: [{ text: fullSystem }] },
      generationConfig: { maxOutputTokens: maxTok, temperature: temp },
    };
    for (const { key, model } of geminiAttempts) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const upstream = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) });
        const data = await upstream.json();
        if (!upstream.ok) {
          lastError = data.error?.message || `Gemini ${model} error (${upstream.status})`;
          if (upstream.status === 401 || upstream.status === 403) break;
          continue;
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.status(200).json({ id: 'gemini', content: [{ type: 'text', text }], model, role: 'assistant', skill: skill || 'general' });
      } catch (e) { lastError = `Gemini timeout: ${e.message}`; continue; }
    }

    // ── 4. OPENROUTER — 50 free req/day, 28+ free models (openrouter.ai) ────
    if (openrouterKey) {
      const orModels = [
        'google/gemini-2.0-flash-exp:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'deepseek/deepseek-chat-v3-0324:free',
        'mistralai/mistral-small-3.1-24b-instruct:free',
      ];
      for (const orModel of orModels) {
        try {
          const r = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openrouterKey}`,
              'HTTP-Referer': 'https://bvmbino-ai-agent.vercel.app',
              'X-Title': 'Bvmbino AI Agent',
            },
            body: JSON.stringify({ model: orModel, messages: oaiMessages, max_tokens: Math.min(maxTok, 4096), temperature: temp }),
          });
          const d = await r.json();
          if (r.ok) {
            const text = d.choices?.[0]?.message?.content || '';
            const short = orModel.split('/').pop().replace(':free', '');
            return res.status(200).json({ id: 'openrouter', content: [{ type: 'text', text }], model: short, role: 'assistant', skill: skill || 'general' });
          }
          lastError = d.error?.message || `OpenRouter ${orModel} error (${r.status})`;
        } catch (e) { lastError = `OpenRouter timeout: ${e.message}`; }
      }
    }

    // All providers exhausted
    return res.status(500).json({
      error: lastError || 'All AI providers failed.',
      hint: 'Free keys: GROQ_KEY → groq.com | CEREBRAS_KEY → cloud.cerebras.ai | OPENROUTER_KEY → openrouter.ai',
    });
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}
