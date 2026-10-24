import React from 'react';
import { useBvmbinoStore } from '../../store/useBvmbinoStore';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Plus, MessageSquare, Brain, Image as ImageIcon, FileUp, Sparkles, Trash2, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const { 
    sessions, 
    currentSessionId, 
    setCurrentSession, 
    createNewSession,
    deleteSession,
    isBuilderMode,
    toggleBuilderMode
  } = useBvmbinoStore();

  return (
    <aside className="w-[272px] h-full bg-obsidian-surface border-r border-primary/15 flex flex-col z-20 shrink-0">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-primary/15">
        <div className="flex items-center gap-3 mb-4 group cursor-pointer">
          <div className="w-9 h-9 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-center transition-colors group-hover:bg-primary/20">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-head font-extrabold text-[13.5px] text-primary-foreground text-gold-gradient">
              BVMBINO <span className="text-[9px] text-primary/60 font-bold ml-1 tracking-tighter">PRO</span>
            </div>
            <div className="text-[9.5px] text-muted-foreground font-medium tracking-tight">
              Sovereign vElite · 2026
            </div>
          </div>
        </div>

        <Button 
          onClick={createNewSession}
          className="w-full bg-primary hover:bg-gold-400 text-obsidian-dark font-head font-bold text-[11.5px] h-10 gap-2 transition-all active:scale-[0.98] shadow-lg shadow-gold-500/10"
        >
          <Plus className="w-4 h-4" />
          New conversation
        </Button>
      </div>

      {/* Sidebar Scrollable Content */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          
          {/* Empire Pillars */}
          <section>
            <h3 className="text-[10px] font-head font-bold text-muted-foreground/60 uppercase tracking-[2px] mb-3 px-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse"></span>
              Empire Pillars
            </h3>
            <div className="space-y-1">
              {['FormationPro', 'Strong Wave', 'Purgo Clean'].map(pillar => (
                <button 
                  key={pillar}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[11.5px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all group"
                >
                  <div className="w-5 h-5 bg-obsidian-elevated rounded-md flex items-center justify-center text-[10px] border border-primary/5 group-hover:border-primary/20">
                    🏢
                  </div>
                  <span className="font-medium truncate">{pillar}</span>
                </button>
              ))}
              <button className="w-full py-2 border-2 border-dashed border-primary/10 rounded-lg text-[10px] text-primary/40 hover:border-primary/30 hover:text-primary/70 transition-all font-bold mt-1">
                + Add Entity
              </button>
            </div>
          </section>

          {/* Quick Tools */}
          <section>
            <h3 className="text-[10px] font-head font-bold text-muted-foreground/60 uppercase tracking-[2px] mb-3 px-2">
              Strategic Assets
            </h3>
            <div className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[11.5px] bg-primary/5 border border-primary/20 text-primary hover:bg-primary/15 transition-all">
                <Brain className="w-4 h-4" />
                <span>Context Hub</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[11.5px] text-muted-foreground hover:bg-white/5 transition-all">
                <ImageIcon className="w-4 h-4" />
                <span>AI Vision</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[11.5px] text-muted-foreground hover:bg-white/5 transition-all">
                <FileUp className="w-4 h-4" />
                <span>Knowledge Base</span>
              </button>
            </div>
          </section>

          {/* Sessions History */}
          <section>
            <h3 className="text-[10px] font-head font-bold text-muted-foreground/60 uppercase tracking-[2px] mb-3 px-2">
              Recent Ops
            </h3>
            <div className="space-y-1">
              {sessions.map(session => (
                <div 
                  key={session.id}
                  className={cn(
                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[11px] cursor-pointer transition-all w-full",
                    currentSessionId === session.id 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "text-muted-foreground hover:bg-white/5"
                  )}
                  onClick={() => setCurrentSession(session.id)}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="truncate flex-1 font-medium">{session.title}</span>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    className="opacity-0 group-hover:opacity-60 hover:text-destructive transition-all p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

        </div>
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-primary/15 bg-obsidian-dark/40">
        <div 
          onClick={toggleBuilderMode}
          className={cn(
            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
            isBuilderMode 
              ? "bg-primary/10 border-primary/40 text-primary" 
              : "bg-obsidian-elevated border-white/5 text-muted-foreground hover:border-white/10"
          )}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className={cn("w-4 h-4", isBuilderMode && "animate-pulse")} />
            <span className="text-[11px] font-head font-bold tracking-tight">Builder Mode</span>
          </div>
          <div className={cn(
            "w-6 h-3.5 rounded-full relative transition-colors duration-300",
            isBuilderMode ? "bg-primary" : "bg-white/10"
          )}>
            <div className={cn(
              "absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all duration-300",
              isBuilderMode ? "left-3" : "left-0.5"
            )} />
          </div>
        </div>
      </div>
    </aside>
  );
};
