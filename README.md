# Bvmbino AI Agent v2.0

Multi-model AI business assistant — Claude, GPT-4o, Gemini, Grok.

## Deploy to Vercel (30 minutes)

### Prerequisites
- Node.js 18+ installed → https://nodejs.org
- Anthropic API key → https://console.anthropic.com
- Vercel account (free) → https://vercel.com

---

### Step 1 — Install Vercel CLI

```bash
npm install -g vercel
```

---

### Step 2 — Login to Vercel

```bash
vercel login
```

Follow the browser prompt to authenticate.

---

### Step 3 — Deploy

Inside this folder:

```bash
vercel --prod
```

Answer the prompts:
- Set up and deploy? → **Y**
- Which scope? → **your username**
- Link to existing project? → **N**
- Project name? → **bvmbino-agent** (or anything)
- In which directory is your code? → **.** (current folder)
- Override settings? → **N**

---

### Step 4 — Add your API key

Go to https://vercel.com/dashboard → your project → **Settings** → **Environment Variables**

Add:
- Name: `ANTHROPIC_KEY`
- Value: `sk-ant-api03-...` (your key from console.anthropic.com)
- Environment: Production + Preview + Development

Then **redeploy**:
```bash
vercel --prod
```

---

### Step 5 — Open on iPhone

Your app is live at: `https://bvmbino-agent.vercel.app`

Open in Safari → tap Share → **Add to Home Screen** → full-screen PWA on your iPhone.

---

## Local development

```bash
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_KEY

npx vercel dev
# Opens at http://localhost:3000
```

---

## File structure

```
bvmbino/
├── api/
│   └── chat.js          ← Vercel serverless proxy (injects API key)
├── public/
│   └── index.html       ← Full app (UI + agent logic)
├── vercel.json          ← Routing config
├── package.json
├── .env.example         ← Copy to .env.local
└── .gitignore
```

---

## How the proxy works

The browser calls `/api/chat` → Vercel serverless function adds your secret `ANTHROPIC_KEY` → forwards to `api.anthropic.com` → streams response back to the browser.

Your API key is **never exposed** in the frontend code.

---

## Next step: React Native mobile app

Once the web version is live and validated, the mobile shell wraps this using Expo + WebView or a full React Native rebuild. Estimated: 3–4 weeks solo.
