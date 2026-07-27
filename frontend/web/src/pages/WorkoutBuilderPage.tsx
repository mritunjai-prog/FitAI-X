import React, { useState } from 'react';
import { 
  GitBranch, AlertOctagon, Settings2, Play, GitCommit, 
  Clock, MapPin, X, ArrowRight, ShieldAlert, CheckCircle2, Dumbbell
} from 'lucide-react';
import clsx from 'clsx';

// Mock Data
const VERSIONS = [
  { id: 'v1', time: '08:00 AM', tag: 'Initial Generation', message: 'Generated based on standard Hypertrophy protocol.' },
  { id: 'v2', time: '08:05 AM', tag: 'AI Adjusted', message: 'Removed Barbell Squats due to reported lower back tightness.' },
  { id: 'v3', time: '09:30 AM', tag: 'User Edited', message: 'User swapped Leg Press for Lunges.', isCurrent: true },
];

const EXERCISES = [
  { id: 1, name: 'Warmup: Dynamic Stretching', sets: 1, reps: '5 mins', weight: 'Bodyweight', muscle: 'Full Body' },
  { id: 2, name: 'Dumbbell Walking Lunges', sets: 4, reps: '12', weight: '20kg', muscle: 'Quads/Glutes', isConflict: true },
  { id: 3, name: 'Leg Extensions', sets: 3, reps: '15', weight: '60kg', muscle: 'Quads' },
  { id: 4, name: 'Romanian Deadlifts', sets: 4, reps: '10', weight: '80kg', muscle: 'Hamstrings' },
  { id: 5, name: 'Standing Calf Raises', sets: 4, reps: '20', weight: 'Bodyweight', muscle: 'Calves' }
];

export default function WorkoutBuilderPage() {
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simTime, setSimTime] = useState('45');
  const [simLoc, setSimLoc] = useState('Gym');

  return (
    <div className="flex h-full relative overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Today's Best Workout</h1>
            <p className="text-text-secondary">AI generated based on your sleep, recovery, and past logs.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSimulatorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-text-primary hover:bg-card-inner transition-colors"
            >
              <Settings2 size={18} />
              <span>Simulate</span>
            </button>
            <button 
              onClick={() => setIsVersionHistoryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-text-primary hover:bg-card-inner transition-colors"
            >
              <GitBranch size={18} />
              <span>Version History</span>
            </button>
            <button className="flex items-center gap-2 px-6 py-2 bg-gold text-surface font-bold rounded-lg hover:bg-gold/90 transition-colors">
              <Play size={18} fill="currentColor" />
              <span>Start</span>
            </button>
          </div>
        </div>

        {/* Conflict Warning */}
        <div className="mb-6 p-4 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-start gap-4">
          <div className="p-2 bg-brand-red/20 rounded-lg shrink-0 mt-1">
            <AlertOctagon className="text-brand-red" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-brand-red font-bold text-lg">Injury Conflict Detected</h3>
            <p className="text-brand-red/80 mt-1">
              You reported mild knee pain yesterday. <strong className="text-brand-red">Dumbbell Walking Lunges</strong> places high shear stress on the patella. 
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button className="px-4 py-2 bg-brand-red text-white font-bold rounded-lg text-sm shadow-md hover:bg-red-600">
                Auto-Replace with AI
              </button>
              <button className="px-4 py-2 bg-brand-red/20 text-brand-red font-bold rounded-lg text-sm hover:bg-brand-red/30">
                Ignore Warning
              </button>
            </div>
          </div>
        </div>

        {/* Exercise List */}
        <div className="space-y-4">
          {EXERCISES.map((ex, idx) => (
            <div 
              key={ex.id}
              className={clsx(
                "p-5 rounded-xl border bg-card flex items-center gap-4 transition-all hover:border-gold/30",
                ex.isConflict ? "border-brand-red/50 shadow-[0_0_15px_rgba(239,68,68,0.1)] relative overflow-hidden" : "border-border"
              )}
            >
              {ex.isConflict && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red"></div>
              )}
              
              <div className="w-10 h-10 rounded-full bg-card-inner flex items-center justify-center font-display font-bold text-text-secondary shrink-0">
                {idx + 1}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={clsx("font-bold text-lg", ex.isConflict ? "text-brand-red" : "text-text-primary")}>
                    {ex.name}
                  </h3>
                  {ex.isConflict && <ShieldAlert size={16} className="text-brand-red" />}
                </div>
                <p className="text-sm text-text-secondary mt-1 flex items-center gap-3">
                  <span>{ex.muscle}</span>
                  <span className="w-1 h-1 rounded-full bg-border"></span>
                  <span>{ex.sets} Sets × {ex.reps}</span>
                  <span className="w-1 h-1 rounded-full bg-border"></span>
                  <span>{ex.weight}</span>
                </p>
              </div>

              <div className="flex gap-2">
                <button className="p-2 rounded-lg text-text-secondary hover:bg-card-inner hover:text-text-primary">
                  <Settings2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulator Modal */}
      {isSimulatorOpen && (
        <div className="absolute inset-0 bg-surface/80 backdrop-blur-md z-40 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsSimulatorOpen(false)}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-display font-bold text-text-primary mb-2">Simulate Scenario</h2>
            <p className="text-text-secondary mb-6 text-sm">Tell the AI what changed, and it will rebuild your workout instantly.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                  <Clock size={16} className="text-gold" /> Available Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['20', '45', '60'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setSimTime(t)}
                      className={clsx(
                        "py-2 rounded-lg border text-sm font-bold transition-colors",
                        simTime === t ? "bg-gold/10 border-gold text-gold" : "border-border text-text-secondary hover:border-gold/30"
                      )}
                    >
                      {t} min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-brand-blue" /> Location
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Gym', 'Hotel/Home'].map(l => (
                    <button 
                      key={l}
                      onClick={() => setSimLoc(l)}
                      className={clsx(
                        "py-2 rounded-lg border text-sm font-bold transition-colors",
                        simLoc === l ? "bg-brand-blue/10 border-brand-blue text-brand-blue" : "border-border text-text-secondary hover:border-brand-blue/30"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsSimulatorOpen(false)}
              className="w-full py-3 bg-text-primary text-surface font-bold rounded-lg hover:bg-text-secondary transition-colors"
            >
              Regenerate Workout
            </button>
          </div>
        </div>
      )}

      {/* Version History Drawer */}
      {isVersionHistoryOpen && (
        <div className="absolute top-0 right-0 bottom-0 w-96 bg-card border-l border-border shadow-2xl z-30 flex flex-col transform transition-transform animate-in slide-in-from-right">
          <div className="p-6 border-b border-border flex justify-between items-center bg-card-inner">
            <h2 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
              <GitBranch size={20} className="text-gold" />
              Version History
            </h2>
            <button onClick={() => setIsVersionHistoryOpen(false)} className="text-text-secondary hover:text-text-primary">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="relative border-l-2 border-border ml-3 space-y-8">
              {VERSIONS.map((v, idx) => (
                <div key={v.id} className="relative pl-6">
                  <div className={clsx(
                    "absolute w-4 h-4 rounded-full -left-[9px] top-1 border-2 border-card",
                    v.isCurrent ? "bg-gold" : "bg-border"
                  )} />
                  
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-text-secondary">{v.time}</span>
                    <span className={clsx(
                      "text-xs px-2 py-0.5 rounded-md font-bold",
                      v.tag === 'AI Adjusted' ? "bg-brand-blue/10 text-brand-blue" :
                      v.isCurrent ? "bg-gold/10 text-gold" : "bg-card-inner text-text-secondary"
                    )}>
                      {v.tag}
                    </span>
                    {v.isCurrent && (
                      <span className="text-[10px] uppercase tracking-wider text-gold font-bold ml-auto border border-gold/30 px-1.5 rounded">Current</span>
                    )}
                  </div>
                  
                  <div className={clsx(
                    "p-3 rounded-xl border mt-2 text-sm",
                    v.isCurrent ? "border-gold/30 bg-gold/5 text-text-primary" : "border-border bg-card-inner text-text-secondary"
                  )}>
                    {v.message}
                  </div>
                  
                  {!v.isCurrent && (
                    <button className="mt-2 text-xs font-bold text-text-gold hover:underline flex items-center gap-1">
                      <RefreshCw size={12} /> Rollback to this version
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
