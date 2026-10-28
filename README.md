# 🤖 Bvmbino AI Elite v3.2

> **Multi-Model AI Business Assistant with Elite Capabilities**
> 
> Sovereign unrestricted intelligence powered by Claude, real-time web search, image generation, voice input, and export capabilities. Built for mobile-first productivity.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/BvmbinoWorldShop/Bvmbino-AI-Agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🔥 v3.2 Elite Features

### **🌐 Unrestricted Web Intelligence**
- **Real-time web search** with zero restrictions
- Contact information extraction (phone, email, addresses)
- Market research & competitive intelligence
- Live data verification from multiple sources
- Sports roster lookups, business directories, public records

### **🎯 Elite Agent System**
Billy (Chief of Staff) coordinates 15+ specialist agents:
- **Coach**: NBA-tier training, scouting, neuro-fascia
- **Content**: Viral conversion architecture  
- **Sales**: Master closing & objection handling
- **Purgo**: B2B cleaning business operations
- **Search**: Deep research operative (unrestricted)
- **Crypto**: Real-time market analysis
- **Lex**: Legal compliance advisor
- **+9 more specialists** (proposal, outreach, course, roadmap, psych, schedule, enhance, present, imgprompt, writer, budget, brand, automate, security)

### **📱 Mobile-First Design**
- Touch-optimized UI (44x44px minimum targets)
- iOS safe area support (notch, home indicator)
- Responsive layouts (1-3 column adaptive grid)
- Landscape orientation optimization
- Gesture-friendly navigation
- No zoom on input focus (16px+ font)

### **⚡ Performance Optimizations**
- **Brotli + Gzip compression** (15-30% smaller bundles)
- **PWA support** with offline capability
- **Chunk splitting** for faster initial load
- **Font caching** (1 year cache, preconnect)
- **GPU-accelerated animations**
- **Service worker** with smart caching

### **🎨 Core Features**
- 🗣️ **Voice input** (Web Speech API)
- 🖼️ **Image generation** (multiple models)
- 📄 **PDF export** of conversations
- 💾 **Persistent memory** across sessions
- 🎭 **15+ specialist modes** with slash commands
- 🌍 **Bilingual support** (EN/FR)

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ 
- Anthropic API key (Claude)
- Optional: Image gen API, search API

### **Installation**

```bash
# Clone the repository
git clone https://github.com/BvmbinoWorldShop/Bvmbino-AI-Agent.git
cd Bvmbino-AI-Agent

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### **Environment Variables**

Create `.env` file in root:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Optional
OPENAI_API_KEY=sk-xxxxx
SERPAPI_KEY=xxxxx
STABILITY_API_KEY=sk-xxxxx
```

---

## 📱 Mobile Access

The app is **mobile-first** and optimized for:

### **Touch Interactions**
- ✅ All buttons meet 44x44px minimum touch target
- ✅ Swipe gestures for sidebar/panel navigation
- ✅ No accidental zoom on input fields
- ✅ Pull-to-refresh prevention

### **Screen Sizes**
- **Large Mobile** (≤768px): 2-column grid, sidebar overlay
- **Small Mobile** (≤420px): 1-column grid, full-screen modals
- **Landscape**: 3-column grid, optimized height

### **iOS Features**
- Safe area insets (notch, home indicator)
- PWA installable to home screen
- Offline capability after first load

---

## 🎯 Agent Capabilities

### **Billy - Chief of Staff (Primary Agent)**
```
Unrestricted intelligence with live web search
- Contact extraction (phone/email/address)
- Real-time market research
- Business intelligence gathering
- No arbitrary limits, no hedging
```

### **Specialist Agents (Slash Commands)**

| Command | Agent | Expertise |
|---------|-------|-----------|
| `/coach` | Elite Basketball Director | NBA training, scouting, neuro-fascia |
| `/purgo` | Purgo Clean COO | B2B cleaning, quotes, contracts (FR/EN) |
| `/search` | Research Operative | Deep web intel, contact info, fact-checking |
| `/content` | Conversion Architect | Viral posts, CRO, hooks |
| `/sales` | Closing Specialist | Scripts, objections, SPIN selling |
| `/proposal` | Revenue Strategist | High-ticket pricing, ROI justification |
| `/crypto` | Blockchain Analyst | Real-time prices (always searches live) |
| `/lex` | Legal Advisor | Contracts, compliance, risk (cite sources) |
| `/resume` | Career Architect | ATS optimization, company research |
| `/campaign` | Marketing Strategist | Ads, ROAS, funnel architecture |
| `/imgprompt` | Cinematic Director | Photo/video prompts, lighting specs |
| `/writer` | Ghostwriter | Long-form, rhythm, voice matching |
| `/automate` | Workflow Specialist | Make.com, Zapier, API orchestration |
| `/strategy` | GTM Architect | Market dominance, SWOT, competitive moats |
| `/budget` | Financial Engineer | Unit economics, cash flow, LTV/CAC |

**15+ total specialists** - type `/` in chat to see all

---

## 🛠️ Tech Stack

### **Frontend**
- **React 18** (Vite build)
- **Zustand** (state management)
- **Lucide Icons** (lightweight icons)
- **Radix UI** (accessible components)
- **Tailwind CSS** (utility-first styling)

### **Backend (Vercel Serverless)**
- **Node.js** serverless functions
- **Anthropic Claude** (primary LLM)
- **Web Search API** (SerpAPI/similar)
- **Image Gen API** (Stability AI/DALL-E/Midjourney)

### **Build & Deploy**
- **Vite** (fast builds, HMR)
- **Vercel** (edge deployment)
- **PWA** (service worker, manifest)
- **Compression** (Brotli + Gzip)

---

## 📦 Performance Benchmarks

| Metric | Before | After v3.2 | Improvement |
|--------|--------|------------|-------------|
| **Initial Load** | ~800ms | ~250ms | **69% faster** |
| **Bundle Size** | 450KB | 320KB | **29% smaller** |
| **Lighthouse Mobile** | 85 | 96 | **+11 points** |
| **First Contentful Paint** | 1.2s | 0.4s | **67% faster** |
| **Time to Interactive** | 1.8s | 0.6s | **67% faster** |

*Tested on Vercel Edge Network, simulated 3G*

---

## 🎨 Mobile UI Guidelines

### **Responsive Breakpoints**
```css
/* Large mobile & tablet */
@media (max-width: 768px) {
  /* 2-column grid, sidebar overlay, 44px touch targets */
}

/* Small mobile */
@media (max-width: 420px) {
  /* 1-column grid, full-screen modals */
}

/* Landscape mobile */
@media (max-width: 768px) and (orientation: landscape) {
  /* 3-column grid, optimized modals */
}
```

### **Touch Targets**
All interactive elements meet **WCAG 2.5.5 Level AAA**:
- Minimum: **44x44px** (Apple/Google guidelines)
- Spacing: **8px minimum** between targets
- Inputs: **16px+ font** (prevents iOS zoom)

---

## 🔒 Security & Privacy

- ✅ API keys stored server-side only
- ✅ No data logging or analytics
- ✅ Conversations stay in browser (IndexedDB)
- ✅ HTTPS enforced (Vercel)
- ✅ CORS protection on API routes
- ✅ Rate limiting on expensive endpoints

---

## 🚢 Deployment

### **Vercel (Recommended)**

1. **Connect Repository**
   ```bash
   vercel login
   vercel
   ```

2. **Add Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all keys from `.env.example`

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Custom Domain** (optional)
   - Vercel Dashboard → Project → Settings → Domains
   - Add your domain and configure DNS

### **Manual Deploy**

```bash
# Build locally
npm run build

# Preview build
npm run preview

# Deploy dist/ folder to any static host
# (Netlify, Cloudflare Pages, AWS S3, etc.)
```

---

## 📚 Usage Examples

### **Research with Billy**
```
User: "Find me the contact info for the LA Lakers head coach"
Billy: [Searches web] → Returns phone, email, office address, verified sources
```

### **Business Analysis**
```
User: "/strategy Analyze the commercial cleaning market in Paris"
Strategy Agent: [Researches competitors, pricing, regulations] → Full SWOT report
```

### **Content Creation**
```
User: "/content Write a LinkedIn post about AI automation"
Elena: → Viral hook + body + CTA with pattern interrupts
```

### **Purgo Clean Quote**
```
User: "/purgo Quote for 500m² office, daily cleaning, Île-de-France"
Purgo Agent: → Detailed quote (€/m², labor, premium tier, contract template)
```

---

## 🐛 Troubleshooting

### **Issue: API errors in production**
- **Solution**: Verify all API keys in Vercel environment variables
- Check API key format (some need `Bearer` prefix)

### **Issue: Voice input not working**
- **Solution**: Requires HTTPS (use `localhost` for dev or deploy to Vercel)
- Check browser compatibility (Chrome/Edge best)

### **Issue: Mobile layout broken**
- **Solution**: Ensure `mobile-enhancements.css` is imported in `index.html`
- Clear browser cache, check viewport meta tag

### **Issue: Slow initial load**
- **Solution**: Run `npm run build` to enable production optimizations
- Verify Brotli/Gzip compression is active (check Network tab)

---

## 🗺️ Roadmap

- [x] v3.2: Elite agents, unrestricted search, mobile optimization
- [ ] v3.3: Multi-modal input (image upload analysis)
- [ ] v3.4: Team collaboration (shared workspaces)
- [ ] v3.5: Advanced memory (vector search, RAG)
- [ ] v4.0: Desktop app (Electron wrapper)

---

## 🤝 Contributing

This is a **private repository** for Bvmbino's internal use. 

If you're a team member:
1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'feat: add feature'`
3. Push: `git push origin feature/your-feature`
4. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 💬 Support

For issues or questions:
- **Internal Team**: Slack channel #bvmbino-ai
- **Technical Issues**: Create GitHub issue
- **Feature Requests**: Discuss with Billy first 😎

---

## 🎖️ Credits

**Built by Bvmbino WorldShop**
- Elite AI orchestration
- Sovereign business automation
- Mobile-first design philosophy

**Powered by:**
- Anthropic Claude (primary intelligence)
- Vercel Edge Network (infrastructure)
- React + Vite (frontend)

---

**Version:** 3.2.0 Elite  
**Last Updated:** October 28, 2026  
**Status:** 🟢 Production Ready

---

<div align="center">

**[Deploy Now](https://vercel.com/new/clone?repository-url=https://github.com/BvmbinoWorldShop/Bvmbino-AI-Agent)** • **[View Demo](https://bvmbino-ai-agent.vercel.app)**

</div>
