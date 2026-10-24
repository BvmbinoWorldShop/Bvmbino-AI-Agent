import React from 'react';
import { useBvmbinoStore } from '../../store/useBvmbinoStore';
import { ScrollArea } from '../ui/scroll-area';
import { Database, Shield, PenTool, TrendingUp, Target } from 'lucide-react';
import { cn } from '../../lib/utils';

export const MemoryPanel: React.FC = () => {
  const { isMemoryEnabled } = useBvmbinoStore();

  if (!isMemoryEnabled) return null;

  return (
    <aside className="w-[280px] h-full bg-obsidian-surface border-l border-primary/15 flex flex-col z-20 shrink-0 animate-in slide-in-from-right-full duration-500">
      <div className="p-4 border-b border-primary/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="text-[11px] font-head font-extrabold text-primary uppercase tracking-[2px]">
            Sovereign Vault
          </h2>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          
          {/* Venture Context */}
          <div className="bg-primary/5 border border-primary/15 rounded-xl overflow-hidden shadow-inner">
            <div className="px-3 py-2 border-b border-primary/10 flex items-center justify-between bg-primary/10">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-head font-bold text-primary uppercase">Ventures Context</span>
              </div>
              <button className="text-[9px] text-primary/60 hover:text-primary transition-colors">✎</button>
            </div>
            <div className="p-3 text-[11px] text-muted-foreground leading-relaxed font-mono">
              Active context for FormationPro, Strong Wave, and Purgo Clean. Market: Abidjan, Côte d'Ivoire.
            </div>
          </div>

          {/* Project Goals */}
          <div className="bg-primary/5 border border-primary/15 rounded-xl overflow-hidden shadow-inner">
            <div className="px-3 py-2 border-b border-primary/10 flex items-center justify-between bg-primary/10">
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-head font-bold text-primary uppercase">Strategic Goals</span>
              </div>
              <button className="text-[9px] text-primary/60 hover:text-primary transition-colors">✎</button>
            </div>
            <div className="p-3 text-[11px] text-muted-foreground leading-relaxed font-mono">
              Current Objectives: 40% growth in B2B service subscriptions via automated LinkedIn outreach.
            </div>
          </div>

          {/* Memory Stream */}
          <div>
            <h3 className="text-[9px] font-head font-bold text-muted-foreground/40 uppercase tracking-[2px] mb-3 px-1">
              Intelligence Stream
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Client Signal', val: 'Priority focus: FormationPro' },
                { label: 'Market Pulse', val: 'High-intent leads found in Abidjan' },
                { label: 'Strategic Pivot', val: 'Shift focus to high-ticket offers' }
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-obsidian-elevated/50 border border-white/5 rounded-lg group hover:border-primary/20 transition-all">
                  <div className="text-[8px] font-mono font-bold text-primary/40 uppercase tracking-wider mb-1 group-hover:text-primary/70">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-snug">
                    {item.val}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </ScrollArea>

      {/* Progress Footer */}
      <div className="p-4 border-t border-primary/15 bg-obsidian-dark/40">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] text-muted-foreground font-head font-bold">Context Utilization</span>
          <span className="text-[10px] text-primary font-mono">14.2%</span>
        </div>
        <div className="h-1 bg-obsidian-elevated rounded-full overflow-hidden">
          <div className="h-full bg-primary w-[14.2%] transition-all duration-1000"></div>
        </div>
      </div>
    </aside>
  );
};
