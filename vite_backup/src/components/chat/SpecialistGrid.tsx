import React from 'react';
import { SPECIALISTS, Specialist } from '../../services/specialist-registry';
import { useBvmbinoStore } from '../../store/useBvmbinoStore';
import { cn } from '../../lib/utils';

export const SpecialistGrid: React.FC = () => {
  const setSpecialist = useBvmbinoStore(state => state.setSpecialist);

  return (
    <div className="w-full max-w-[900px] mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-[1px] flex-1 bg-primary/10" />
        <h2 className="text-[10px] font-head font-bold text-primary/60 uppercase tracking-[2px] whitespace-nowrap">
          Sovereign Expert Matrix
        </h2>
        <div className="h-[1px] flex-1 bg-primary/10" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {SPECIALISTS.slice(0, 20).map((specialist) => (
          <SpecialistCard 
            key={specialist.id} 
            specialist={specialist} 
            onClick={() => setSpecialist(specialist)}
          />
        ))}
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-[10px] text-muted-foreground font-mono italic">
          Pick a specialist or type <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">/</code> for the command menu
        </p>
      </div>
    </div>
  );
};

interface SpecialistCardProps {
  specialist: Specialist;
  onClick: () => void;
}

const SpecialistCard: React.FC<SpecialistCardProps> = ({ specialist, onClick }) => {
  const Icon = specialist.icon;

  const colorClasses = {
    revenue: "border-primary/20 bg-gold-900/10 hover:border-primary/50 shadow-gold-500/5",
    strategy: "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/50 shadow-emerald-500/5",
    creative: "border-blue-500/20 bg-blue-500/5 hover:border-blue-500/50 shadow-blue-500/5",
    tech: "border-red-500/20 bg-red-500/5 hover:border-red-500/50 shadow-red-500/5",
  };

  const iconColorClasses = {
    revenue: "text-primary",
    strategy: "text-emerald-400",
    creative: "text-blue-400",
    tech: "text-red-400",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:-translate-y-1 active:scale-[0.97] aspect-[4/5]",
        colorClasses[specialist.color]
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center mb-3 border border-current opacity-20 transition-opacity group-hover:opacity-40",
        iconColorClasses[specialist.color]
      )}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="mt-auto">
        <h3 className="font-head font-extrabold text-[12px] text-foreground leading-tight mb-1 group-hover:text-primary transition-colors">
          {specialist.name}
        </h3>
        <p className="text-[9px] text-muted-foreground font-mono leading-tight mb-3">
          {specialist.persona}
        </p>
        <span className="inline-block px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-mono text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
          {specialist.cmd}
        </span>
      </div>
    </button>
  );
};
