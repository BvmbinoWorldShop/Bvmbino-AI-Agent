import React, { useState, useRef, useEffect } from 'react';
import { useBvmbinoStore } from '../../store/useBvmbinoStore';
import { SpecialistGrid } from './SpecialistGrid';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Send, Mic, Paperclip, StopCircle, Bot, User, Cpu, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { aiService } from '../../services/ai-service';

export const ChatArea: React.FC = () => {
  const { 
    sessions, 
    currentSessionId, 
    addMessage, 
    activeSpecialist, 
    setSpecialist,
    isWebSearchEnabled,
    toggleWebSearch,
    isMemoryEnabled,
    toggleMemory
  } = useBvmbinoStore();

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamedText]);

  const handleSend = async () => {
    if (!input.trim() && !isThinking) return;

    const userQuery = input.trim();
    setInput('');
    addMessage(userQuery, 'user');
    setIsThinking(true);
    setStreamedText('');

    try {
      const response = await aiService.execute({
        messages: [...messages, { role: 'user', content: userQuery }],
        model: activeSpecialist?.id, // Simple routing for now
        stream: (delta) => setStreamedText(prev => prev + delta)
      });
      
      addMessage(response.text, 'assistant');
    } catch (err) {
      addMessage("⚠️ Sovereign Core Error: The requested logic failed to execute.", 'assistant');
    } finally {
      setIsThinking(false);
      setStreamedText('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-obsidian-dark relative">
      {/* Top Navigation */}
      <div className="h-14 border-b border-primary/10 flex items-center justify-between px-6 bg-obsidian-surface/30 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="text-[12px] font-head font-bold text-foreground">
            {activeSpecialist ? (
              <div className="flex items-center gap-2">
                <span className="text-primary">/</span>
                {activeSpecialist.name}
                <button 
                  onClick={() => setSpecialist(null)}
                  className="text-[9px] text-muted-foreground hover:text-primary ml-1"
                >
                  ✕
                </button>
              </div>
            ) : "Billy Chief of Staff"}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 rounded-full border border-primary/20">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-primary font-bold">Memory Active</span>
          </div>
        </div>
      </div>

      {/* Message Feed */}
      <ScrollArea ref={scrollRef} className="flex-1 p-6">
        <div className="max-w-[820px] mx-auto space-y-8 pb-12">
          {messages.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center pt-12 text-center">
              <div className="w-32 h-32 relative mb-8 group">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-500"></div>
                <div className="w-full h-full relative border-2 border-primary/20 rounded-full flex items-center justify-center animate-ring-pulse">
                  <Cpu className="w-12 h-12 text-primary group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
              <h1 className="text-4xl font-head font-extrabold tracking-widest text-gold-gradient mb-2">
                BVMBINO PRO
              </h1>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-[4px] mb-8">
                Sovereign Intelligence Engine
              </div>
              <p className="text-sm text-muted-foreground max-w-[500px] leading-relaxed font-mono">
                I am Billy, your Sovereign Chief of Staff. I run the show and deploy the right specialists for your missions.
              </p>
              
              <SpecialistGrid />
            </div>
          )}

          {messages.map((msg) => (
            <MessageRow key={msg.id} msg={msg} />
          ))}

          {isThinking && (
            <div className="flex gap-4 animate-in fade-in duration-300">
               <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                {activeSpecialist?.avatar ? (
                  <img src={activeSpecialist.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Bot className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="text-[10px] font-head font-bold text-primary uppercase tracking-wider">
                  Billy Intelligence
                </div>
                <div className="text-[14px] leading-relaxed text-foreground/90 whitespace-pre-wrap font-mono">
                  {streamedText || "Billy is thinking..."}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Zone */}
      <div className="p-4 border-t border-primary/10 bg-obsidian-surface/30 backdrop-blur-md">
        <div className="max-w-[820px] mx-auto">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-primary/0 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
            <div className="relative flex flex-col bg-obsidian-elevated/80 border border-primary/10 rounded-xl overflow-hidden focus-within:border-primary/40 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tell me what's next Boss..."
                className="w-full bg-transparent p-4 text-sm outline-none resize-none min-h-[56px] font-mono placeholder:text-muted-foreground/30"
                rows={1}
              />
              
              {/* Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-white/5 bg-black/20">
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                    <Mic className="w-4 h-4" />
                  </Button>
                  <div className="w-[1px] h-4 bg-white/5 self-center mx-1" />
                  <Button 
                    onClick={toggleMemory}
                    className={cn(
                      "h-8 px-2.5 rounded-full text-[9px] font-head font-bold uppercase transition-all",
                      isMemoryEnabled ? "bg-primary/10 text-primary border border-primary/20" : "bg-transparent text-muted-foreground border border-white/5"
                    )}
                  >
                    Memory
                  </Button>
                  <Button 
                    onClick={toggleWebSearch}
                    className={cn(
                      "h-8 px-2.5 rounded-full text-[9px] font-head font-bold uppercase transition-all",
                      isWebSearchEnabled ? "bg-primary/10 text-primary border border-primary/20" : "bg-transparent text-muted-foreground border border-white/5"
                    )}
                  >
                    Web
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                   <span className="text-[9px] font-mono text-muted-foreground/40 hidden sm:inline">
                      Enter to send · Shift+Enter for newline
                   </span>
                  {isThinking ? (
                    <Button size="icon" className="w-8 h-8 bg-destructive hover:bg-destructive/80 text-white rounded-lg">
                      <StopCircle className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSend}
                      disabled={!input.trim()}
                      className="h-8 px-4 bg-primary hover:bg-gold-400 text-obsidian-dark font-head font-extrabold text-[11px] gap-2 rounded-lg transition-all active:scale-[0.98]"
                    >
                      SEND
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageRow: React.FC<{ msg: any }> = ({ msg }) => {
  const isAi = msg.role === 'assistant';

  return (
    <div className={cn(
      "flex gap-4 group animate-in fade-in duration-300",
      !isAi && "flex-row-reverse"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all overflow-hidden",
        isAi 
          ? "bg-primary/10 border-primary/20 text-primary group-hover:bg-primary/20" 
          : "bg-secondary border-primary/5 text-muted-foreground group-hover:border-primary/20"
      )}>
        {isAi ? (
          activeSpecialist?.avatar ? (
            <img src={activeSpecialist.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <Bot className="w-4 h-4" />
          )
        ) : <User className="w-4 h-4" />}
      </div>
      
      <div className={cn(
        "flex-1 flex flex-col",
        !isAi && "items-end"
      )}>
        <div className={cn(
          "text-[10px] font-head font-bold uppercase tracking-wider mb-2",
          isAi ? "text-primary" : "text-muted-foreground/60"
        )}>
          {isAi ? "Billy Intelligence" : "The Boss"}
        </div>
        
        <div className={cn(
          "max-w-[90%] text-[14px] leading-relaxed whitespace-pre-wrap font-mono relative",
          isAi ? "text-foreground/90" : "bg-primary/5 border border-primary/10 p-4 rounded-2xl text-foreground"
        )}>
          {msg.content}
        </div>

        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button className="text-[9px] font-mono text-muted-foreground hover:text-primary">⎘ Copy</button>
           {isAi && <button className="text-[9px] font-mono text-muted-foreground hover:text-primary">↻ Regen</button>}
        </div>
      </div>
    </div>
  );
};
