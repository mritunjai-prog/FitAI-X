import { Sparkles, ArrowRight, Zap, Target } from 'lucide-react';

export default function AiDailyInsight() {
  return (
    <div className="bg-card border border-gold-border hover:border-gold/50 transition-colors rounded-[24px] p-6 shadow-lg relative overflow-hidden group flex flex-col h-[320px]">
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <Sparkles size={18} className="text-gold animate-pulse" />
        <h3 className="font-bold text-sm tracking-widest text-text-secondary uppercase">AI Coach Insight</h3>
      </div>
      
      <div className="flex flex-col gap-4 relative z-10">
        <p className="text-sm text-text-primary leading-relaxed">
          Your <span className="font-bold text-brand-green">HRV is up 12%</span> today and sleep efficiency hit 94%, indicating peak central nervous system readiness.
        </p>
        
        <div className="flex flex-col gap-2 bg-card-inner border border-gold-border/30 rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs">
            <Zap size={12} className="text-brand-green" />
            <span className="text-text-secondary">Action Taken:</span>
            <span className="font-bold text-text-primary">Volume Increased</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Target size={12} className="text-gold" />
            <span className="text-text-secondary">Specifics:</span>
            <span className="font-bold text-text-primary">+1 Set (Squats), +5kg Load</span>
          </div>
        </div>

        <p className="text-sm text-text-primary leading-relaxed">
          Keep your rest periods strictly to <span className="font-bold text-gold">90s</span> to maximize hypertrophy stimulus while your body is highly receptive.
        </p>
      </div>

      <button className="mt-auto pt-6 flex items-center gap-2 text-xs font-bold text-gold uppercase tracking-widest hover:text-gold-light transition-colors relative z-10 w-fit">
        <span>View Full Analysis</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
