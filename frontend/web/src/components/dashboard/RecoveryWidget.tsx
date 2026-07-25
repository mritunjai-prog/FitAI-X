import { Info, Flame } from 'lucide-react';

export default function RecoveryWidget() {
  return (
    <div className="glass-card p-6 relative group flex-1">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-text-primary">Recovery Score</h3>
        <Info size={18} className="text-text-secondary cursor-pointer hover:text-gold transition-colors" />
      </div>

      <div className="flex flex-col items-center justify-center relative my-4">
        {/* Simple SVG Circular Progress Ring */}
        <svg className="w-40 h-40 transform -rotate-90">
          <circle cx="80" cy="80" r="70" fill="none" stroke="var(--color-gold-border)" strokeWidth="12" />
          <circle 
            cx="80" cy="80" r="70" 
            fill="none" 
            stroke="var(--color-brand-green)" 
            strokeWidth="12" 
            strokeDasharray="440"
            strokeDashoffset="44" 
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(163,230,53,0.5)]"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-text-primary">89<span className="text-xl">%</span></span>
          <span className="text-xs font-bold text-brand-green uppercase tracking-wider">Optimal</span>
        </div>
      </div>

      {/* Streak Indicator (Requested Feature) */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-2 bg-brand-amber/10 border border-brand-amber/20 px-4 py-2 rounded-full">
          <Flame size={18} className="text-brand-amber animate-pulse" />
          <span className="text-sm font-extrabold text-brand-amber tracking-wider">24 DAY STREAK</span>
        </div>
      </div>

      {/* Mini Bar Chart */}
      <div className="mt-auto pt-4 border-t border-gold-border">
        <div className="flex items-end justify-between h-16 px-2 gap-2">
          {[40, 60, 50, 45, 65, 89].map((height, i) => (
            <div key={i} className="flex flex-col items-center gap-2 w-full">
              <div 
                className={`w-full rounded-sm transition-all ${
                  i === 5 ? 'bg-brand-green shadow-[0_0_10px_rgba(163,230,53,0.3)]' : 'bg-surface'
                }`}
                style={{ height: `${height}%` }}
              ></div>
              <span className="text-[10px] font-bold text-text-secondary uppercase">
                {['S','M','T','W','T','F'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
