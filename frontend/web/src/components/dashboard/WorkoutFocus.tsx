import { Zap } from 'lucide-react';

export default function WorkoutFocus({ workout }: { workout?: any }) {
  if (!workout) {
    return (
      <div className="glass-card hover:border-gold/50 p-8 flex flex-col justify-center items-center h-full min-h-[400px]">
        <p className="text-text-secondary font-bold">No active workout for today.</p>
      </div>
    );
  }

  const exercises = workout.exercises || [];

  return (
    <div className="glass-card hover:border-gold/50 p-8 flex flex-col relative group h-full max-h-[700px]">
      <div className="flex flex-col mb-8">
        <span className="text-[10px] font-bold text-brand-green uppercase tracking-widest mb-1">Today's Best Workout</span>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-extrabold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis mr-2">{workout.title}</h2>
          <div className="flex items-center gap-1.5 text-brand-green font-bold bg-brand-green/10 px-3 py-1.5 rounded-lg border border-brand-green/20 text-sm flex-shrink-0">
            <Zap size={16} fill="currentColor" />
            <span>{workout.duration || '45 MIN'}</span>
          </div>
        </div>
        <p className="text-sm text-text-secondary line-clamp-2">
          {workout.aiExplanation || 'AI generated based on your profile.'}
        </p>
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {exercises.map((ex: any, idx: number) => (
          <div 
            key={idx} 
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors group/item relative overflow-hidden bg-surface border-gold-border hover:border-gold/30`}
          >
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-bold text-text-primary">{ex.name}</h3>
              </div>
              <div className="text-sm font-bold text-text-secondary flex flex-wrap gap-x-2">
                <span>{ex.sets} SETS × {ex.reps} REPS</span>
                {ex.notes && <span className="text-text-secondary/60">({ex.notes})</span>}
              </div>
            </div>

            <div className="text-sm font-extrabold text-gold border border-gold-border bg-card px-4 py-2 rounded-lg whitespace-nowrap">
              {ex.weight || 'BODYWEIGHT'}
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
