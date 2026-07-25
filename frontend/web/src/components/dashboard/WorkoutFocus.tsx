import { Zap } from 'lucide-react';

export default function WorkoutFocus() {
  const exercises = [
    {
      name: 'Barbell Squats',
      sets: '4 SETS × 8-10 REPS',
      detail: '@ 75% 1RM',
      target: '135 LBS',
      isAiSwapped: false,
    },
    {
      name: 'Romanian Deadlifts',
      sets: '3 SETS × 12 REPS',
      detail: '(Focus on stretch)',
      target: '185 LBS',
      isAiSwapped: true,
    },
    {
      name: 'Bulgarian Split Squats',
      sets: '3 SETS × 10 REPS / LEG',
      detail: '',
      target: '45 LBS',
      isAiSwapped: false,
    }
  ];

  return (
    <div className="glass-card hover:border-gold/50 p-8 flex flex-col relative group h-full max-h-[700px]">
      <div className="flex flex-col mb-8">
        <span className="text-[10px] font-bold text-brand-green uppercase tracking-widest mb-1">Today's Best Workout</span>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-extrabold text-text-primary whitespace-nowrap">Lower Body Focus v2.4</h2>
          <div className="flex items-center gap-1.5 text-brand-green font-bold bg-brand-green/10 px-3 py-1.5 rounded-lg border border-brand-green/20 text-sm">
            <Zap size={16} fill="currentColor" />
            <span>65 MIN</span>
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          AI Adjusted based on morning HRV & readiness score.
        </p>
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {exercises.map((ex, idx) => (
          <div 
            key={idx} 
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors group/item relative overflow-hidden ${
              ex.isAiSwapped 
                ? 'bg-brand-green/5 border-brand-green/30 border-l-4 border-l-brand-green' 
                : 'bg-surface border-gold-border hover:border-gold/30'
            }`}
          >
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-bold text-text-primary">{ex.name}</h3>
                {ex.isAiSwapped && (
                  <span className="text-[10px] font-extrabold bg-brand-green text-btn-text px-2 py-0.5 rounded-sm uppercase tracking-wider flex-shrink-0 whitespace-nowrap">
                    AI SWAP
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-text-secondary flex flex-wrap gap-x-2">
                <span>{ex.sets}</span>
                {ex.detail && <span className="text-text-secondary/60">{ex.detail}</span>}
              </div>
            </div>

            <div className="text-sm font-extrabold text-gold border border-gold-border bg-card px-4 py-2 rounded-lg">
              TARGET: {ex.target}
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-8 py-4 rounded-2xl bg-gradient-to-r from-gold to-gold-light text-btn-text font-extrabold text-lg flex items-center justify-center gap-2 shadow-glow hover:scale-[1.02] transition-transform">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Start Session
      </button>
    </div>
  );
}
