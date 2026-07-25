import { ArrowRight } from 'lucide-react';

export default function WeeklyMicrocycle() {
  const days = [
    { name: 'MON', label: 'PULL', icon: 'Dumbbell', active: false },
    { name: 'TUE', label: 'ZONE 2', icon: 'Activity', active: false },
    { name: 'WED (TODAY)', label: 'LEGS', icon: 'Dumbbell', active: true, showDiet: true },
    { name: 'THU', label: 'REST', icon: 'Coffee', active: false },
    { name: 'FRI', label: 'PUSH', icon: 'Dumbbell', active: false },
    { name: 'SAT', label: 'SPRINT', icon: 'Activity', active: false },
    { name: 'SUN', label: 'REST', icon: 'Coffee', active: false },
  ];

  return (
    <div className="glass-card hover:border-gold/50 p-6 border-l-4 border-l-gold">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-text-primary">Weekly Microcycle</h2>
          <p className="text-sm text-text-secondary font-medium">Week 4 of Hypertrophy Block</p>
        </div>
        <button className="text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:text-gold-light transition-colors group">
          View Full Plan <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 md:gap-4">
        {days.map((day, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2">
            <span className={`text-[10px] font-bold tracking-widest uppercase ${day.active ? 'text-gold' : 'text-text-secondary'}`}>
              {day.name}
            </span>
            <div className={`w-full aspect-square md:aspect-[3/4] rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              day.active 
                ? 'bg-gold/10 border-2 border-gold shadow-glow text-gold' 
                : 'bg-surface border border-gold-border text-text-secondary hover:border-gold/30 hover:bg-card'
            }`}>
              {/* Dummy SVG for icons based on label type to avoid importing many lucide icons dynamically */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {day.icon === 'Dumbbell' && <><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></>}
                {day.icon === 'Activity' && <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>}
                {day.icon === 'Coffee' && <><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></>}
              </svg>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">{day.label}</span>
            </div>
            
            {/* Diet/Recovery visual indicators removed for cleaner UI */}
            <div className="flex gap-1 h-3">
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
