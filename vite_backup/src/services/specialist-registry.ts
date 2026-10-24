import { 
  TrendingUp, 
  Mail, 
  PenTool, 
  MessageSquare, 
  BarChart3, 
  CheckCircle2, 
  Globe, 
  PieChart, 
  Library, 
  Orbit, 
  FileText, 
  DollarSign, 
  Send, 
  FileCheck, 
  Megaphone, 
  GraduationCap, 
  Calendar, 
  Presentation, 
  Workflow, 
  BrainCircuit, 
  Image as ImageIcon, 
  UserSquare2, 
  ShieldCheck, 
  FileCode2, 
  Cpu,
  Slack,
  Mail as Gmail,
  Zap
} from "lucide-react";

export interface Specialist {
  id: string;
  name: string;
  persona: string;
  desc: string;
  cmd: string;
  icon: any;
  avatar?: string;
  color: "revenue" | "strategy" | "creative" | "tech";
  prompt: string;
}

export const SPECIALISTS: Specialist[] = [
  {
    id: "leads",
    name: "Lead Intelligence",
    persona: "Scout Engine",
    desc: "Find and qualify high-intent prospects.",
    cmd: "/leads",
    icon: TrendingUp,
    avatar: "/specialists/mami.png",
    color: "revenue",
    prompt: "Act as an elite Lead Intelligence Agent. Help find and qualify high-intent prospects."
  },
  {
    id: "email",
    name: "Email Architect",
    persona: "Conversion specialist",
    desc: "Generate full cold + nurture sequences.",
    cmd: "/email",
    icon: Mail,
    color: "revenue",
    prompt: "Act as an Email Sequence Agent. Generate a full cold + nurture email sequence."
  },
  {
    id: "content",
    name: "Content Engine",
    persona: "Hook Specialist",
    desc: "Multi-channel content orchestration.",
    cmd: "/content",
    icon: PenTool,
    color: "creative",
    prompt: "Act as a Content Generation Agent. Create high-converting social hooks and scripts."
  },
  {
    id: "sales",
    name: "Sales Closer",
    persona: "Deal Architect",
    desc: "Craft DM scripts and objection displacers.",
    cmd: "/sales",
    icon: MessageSquare,
    color: "revenue",
    prompt: "Act as a Conversational Sales Agent. Craft DM scripts, closers, and objection displacers."
  },
  {
    id: "strategy",
    name: "Growth Strategist",
    persona: "Partner-in-Arms",
    desc: "Complete GTM and 90-day execution plans.",
    cmd: "/strategy",
    icon: BarChart3,
    color: "strategy",
    prompt: "Act as an elite Growth Strategist. Build a complete GTM strategy and 90-day plan. [EXPORT:strategy]"
  },
  {
    id: "qualify",
    name: "Lead Qualifier",
    persona: "Intent Analyst",
    desc: "Score prospects by intent and fit.",
    cmd: "/qualify",
    icon: CheckCircle2,
    color: "revenue",
    prompt: "Act as a Lead Qualification Agent. Score prospects by intent and firmographic fit."
  },
  {
    id: "website",
    name: "Web Architect",
    persona: "UI/UX Strategist",
    desc: "High-converting landing page structure.",
    cmd: "/website",
    icon: Globe,
    color: "tech",
    prompt: "Act as a Website Builder Agent. Design high-converting landing page structures."
  },
  {
    id: "analytics",
    name: "Performance Analyst",
    persona: "Data Strategist",
    desc: "Analyze metrics and suggest pivots.",
    cmd: "/analytics",
    icon: PieChart,
    color: "strategy",
    prompt: "Act as a Performance Analytics Agent. Analyze metrics and suggest optimization pivots."
  },
  {
    id: "aimas",
    name: "AIMAS Orchestrator",
    persona: "11-Agent System",
    desc: "Full-scale agent orchestration.",
    cmd: "/aimas",
    icon: Library,
    color: "strategy",
    prompt: "Activate AIMAS (11-Agent System). Begin complete multi-agent sales & marketing orchestration."
  },
  {
    id: "aros",
    name: "AROS Command",
    persona: "Autonomous Revenue OS",
    desc: "12-agent commercial team pilot.",
    cmd: "/aros",
    icon: Orbit,
    avatar: "/specialists/aros.png",
    color: "revenue",
    prompt: "Activate AROS (Autonomous Revenue OS). Initialize the 12-agent commercial team."
  },
  {
    id: "writer",
    name: "Apex Copywriter",
    persona: "Human-Voice Specialist",
    desc: "Compelling, high-impact copy.",
    cmd: "/writer",
    icon: FileText,
    color: "creative",
    prompt: "Act as an expert copywriter. Help write compelling, human-voice copy."
  },
  {
    id: "budget",
    name: "Financial Analyst",
    persona: "ROI Architect",
    desc: "Financial projections and cash-flow maps.",
    cmd: "/budget",
    icon: DollarSign,
    color: "strategy",
    prompt: "Act as a Financial Analyst. Build ROI projections and cash-flow maps. [EXPORT:budget]"
  },
  {
    id: "outreach",
    name: "Cold Outreach",
    persona: "Channel Specialist",
    desc: "Multi-channel personalized sequences.",
    cmd: "/outreach",
    icon: Send,
    color: "revenue",
    prompt: "Act as an elite Cold Outreach Architect. Build hyper-personalized multi-channel sequences."
  },
  {
    id: "proposal",
    name: "Proposal Architect",
    persona: "High-Ticket Specialist",
    desc: "Premium client proposal design.",
    cmd: "/proposal",
    icon: FileCheck,
    color: "revenue",
    prompt: "Act as a High-Ticket Sales Architect. Build a premium client proposal. [EXPORT:proposal]"
  },
  {
    id: "campaign",
    name: "Media Buyer",
    persona: "Full-Stack Ads",
    desc: "Meta, Google, and TikTok campaigns.",
    cmd: "/campaign",
    icon: Megaphone,
    color: "revenue",
    prompt: "Act as a Full-Stack Media Buyer. Build campaigns for Meta, Google, TikTok. [EXPORT:campaign]"
  },
  {
    id: "course",
    name: "Course Architect",
    persona: "Education Specialist",
    desc: "Curriculum and module design.",
    cmd: "/course",
    icon: GraduationCap,
    color: "creative",
    prompt: "Act as a Course Design Architect. Build a complete online course curriculum. [EXPORT:course]"
  },
  {
    id: "schedule",
    name: "Performance Coach",
    persona: "Deep Focus Strategist",
    desc: "High-performance weekly planning.",
    cmd: "/schedule",
    icon: Calendar,
    color: "strategy",
    prompt: "Act as a High-Performance Coach. Build a weekly schedule with DEEP/ADMIN/RECOVERY zones. [EXPORT:schedule]"
  },
  {
    id: "present",
    name: "Keynote Director",
    persona: "Visual Storyteller",
    desc: "Compelling visual presentation design.",
    cmd: "/present",
    icon: Presentation,
    color: "creative",
    prompt: "Act as a Keynote Director. Design a compelling visual presentation. [EXPORT:presentation]"
  },
  {
    id: "automate",
    name: "Automation Engineer",
    persona: "Workflow Architect",
    desc: "Design n8n, Zapier, and Make flows.",
    cmd: "/automate",
    icon: Workflow,
    color: "tech",
    prompt: "Act as an Automation Engineer. Design n8n, Zapier, and Make workflows. [EXPORT:workflow]"
  },
  {
    id: "psych",
    name: "Behavioral Economist",
    persona: "Influence specialist",
    desc: "Psychological dynamics and playbooks.",
    cmd: "/psych",
    icon: BrainCircuit,
    color: "strategy",
    prompt: "Act as a Behavioral Economist. Analyze psychological dynamics and provide an influence playbook."
  },
  {
    id: "imgprompt",
    name: "Art Director",
    persona: "Generative Artist",
    desc: "Production-grade AI image prompts.",
    cmd: "/imgprompt",
    icon: ImageIcon,
    color: "creative",
    prompt: "Act as a Cinematic Art Director. Create production-grade AI image prompts."
  },
  {
    id: "resume",
    name: "Career Architect",
    persona: "ATS Specialist",
    desc: "High-impact, optimized resumes.",
    cmd: "/resume",
    icon: UserSquare2,
    color: "creative",
    prompt: "Act as a Career Architect. Build an ATS-optimized, high-impact resume. [EXPORT:resume]"
  },
  {
    id: "security",
    name: "Security Auditor",
    persona: "Cyber Sentinel",
    desc: "Audits and remediation matrices.",
    cmd: "/security",
    icon: ShieldCheck,
    color: "tech",
    prompt: "Act as a Cybersecurity Auditor. Perform a full security audit and remediation matrix."
  },
  {
    id: "lex",
    name: "Legal Specialist",
    persona: "Risk Architect",
    desc: "Legal risk and contractual analysis.",
    cmd: "/lex",
    icon: FileCode2,
    color: "strategy",
    prompt: "Act as an Elite Business Law Specialist. Analyze for legal risk and contractual gaps."
  },
  {
    id: "builder",
    name: "Software Architect",
    persona: "APEX Builder",
    desc: "Expand and debug Bvmbino cores.",
    cmd: "/builder",
    icon: Cpu,
    color: "tech",
    prompt: "ACT AS THE SENIOR SOFTWARE ARCHITECT (APEX BUILDER). Help build, debug, and expand the Bvmbino system."
  },
  {
    id: "n8n",
    name: "n8n Strategist",
    persona: "Automation Expert",
    desc: "Complex workflow design and JSON.",
    cmd: "/n8n",
    icon: Zap,
    color: "tech",
    prompt: "Act as an n8n automation expert. Design, trigger, and troubleshoot n8n workflows for business automation. Output working JSON workflow definitions when relevant."
  },
  {
    id: "gmail",
    name: "Gmail Maverick",
    persona: "Deliverability Expert",
    desc: "Sovereign email campaign strategy.",
    cmd: "/gmail",
    icon: Gmail,
    color: "revenue",
    prompt: "Act as an elite email strategy expert. Compose, sequence, and optimize sovereign email campaigns. Focus on deliverability, open rates, and conversion."
  },
  {
    id: "slack",
    name: "Slack Strategist",
    persona: "Velocity Architect",
    desc: "Team flow and bot orchestration.",
    cmd: "/slack",
    icon: Slack,
    color: "strategy",
    prompt: "Act as a Slack workspace strategist. Design team communication flows, automations, channel structure, and Slack bots for maximum team velocity."
  }
];

export const SKILL_ROUTER: Record<string, string> = {
  "lead": "leads", "prospect": "leads", "find": "leads",
  "email": "email", "sequence": "email", "cold": "email",
  "content": "content", "hook": "content", "post": "content",
  "sales": "sales", "script": "sales", "close": "sales",
  "strategy": "strategy", "plan": "strategy", "gtm": "strategy",
  "qualify": "qualify", "score": "qualify",
  "website": "website", "landing": "website", "page": "website",
  "analytics": "analytics", "metric": "analytics", "data": "analytics",
  "writer": "writer", "copy": "writer", "article": "writer",
  "budget": "budget", "finance": "budget", "money": "budget", "roi": "budget",
  "outreach": "outreach", "personalized": "outreach",
  "proposal": "proposal", "contract": "proposal",
  "campaign": "campaign", "ad": "campaign", "meta": "campaign", "google": "campaign",
  "course": "course", "curriculum": "course", "teach": "course",
  "schedule": "schedule", "coach": "schedule", "time": "schedule",
  "present": "present", "slide": "present", "keynote": "present",
  "automate": "automate", "zapier": "automate", "make": "automate",
  "psych": "psych", "influence": "psych", "behavior": "psych",
  "image": "imgprompt", "art": "imgprompt", "photo": "imgprompt", "generate": "imgprompt",
  "resume": "resume", "cv": "resume", "job": "resume",
  "security": "security", "audit": "security", "hack": "security",
  "legal": "lex", "contractual": "lex", "risk": "lex",
  "code": "builder", "build": "builder", "debug": "builder", "react": "builder",
  "n8n": "n8n", "workflow": "n8n",
  "gmail": "gmail", "mailbox": "gmail",
  "slack": "slack", "channel": "slack", "team": "slack"
};
