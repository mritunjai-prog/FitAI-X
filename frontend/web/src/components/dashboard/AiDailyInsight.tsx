import { Sparkles, ArrowRight } from 'lucide-react';

export default function AiDailyInsight({ insight }: { insight?: any }) {
  if (!insight) return null;

  return (
    <div className="bg-card border border-gold-border hover:border-gold/50 transition-colors rounded-[24px] p-6 shadow-lg relative overflow-hidden group flex flex-col min-h-[320px]">
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <Sparkles size={18} className="text-gold animate-pulse" />
        <h3 className="font-bold text-sm tracking-widest text-text-secondary uppercase">AI Coach Insight</h3>
      </div>
      
      <div className="flex flex-col gap-4 relative z-10">
        <p className="text-sm text-text-primary leading-relaxed line-clamp-6">
          {insight.message}
        </p>
      </div>

      <button className="mt-auto pt-6 flex items-center gap-2 text-xs font-bold text-gold uppercase tracking-widest hover:text-gold-light transition-colors relative z-10 w-fit">
        <span>Chat with Rachel</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
