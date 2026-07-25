import { useState, useEffect } from 'react';
import { Search, Dumbbell, Calendar, Home, ArrowRight, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-card border border-gold-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-down"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="relative flex items-center px-4 py-4 border-b border-gold-border">
          <Search size={20} className="text-text-secondary" />
          <input 
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workouts, recipes, or jump to page..."
            className="flex-1 bg-transparent border-none outline-none text-text-primary px-4 text-lg"
          />
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-1">
            <X size={20} />
          </button>
        </div>

        {/* Suggestions */}
        <div className="p-2 max-h-96 overflow-y-auto custom-scrollbar">
          <div className="px-3 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            Quick Actions
          </div>
          
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-card-inner group transition-colors">
            <div className="flex items-center gap-3 text-text-primary">
              <Dumbbell size={18} className="text-gold" />
              <span>Generate Today's Workout</span>
            </div>
            <ArrowRight size={16} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-card-inner group transition-colors">
            <div className="flex items-center gap-3 text-text-primary">
              <Calendar size={18} className="text-brand-green" />
              <span>Reschedule Session</span>
            </div>
            <ArrowRight size={16} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          <div className="px-3 py-2 mt-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            Navigation
          </div>

          <button className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-card-inner group transition-colors" onClick={onClose}>
            <div className="flex items-center gap-3 text-text-primary">
              <Home size={18} className="text-text-secondary" />
              <span>Go to Dashboard</span>
            </div>
            <div className="text-[10px] text-text-secondary font-mono bg-surface px-2 py-1 rounded border border-gold-border">G D</div>
          </button>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-gold-border bg-surface flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span>Use</span>
            <div className="flex items-center gap-1">
              <span className="bg-card px-1.5 py-0.5 rounded border border-gold-border font-mono">↑</span>
              <span className="bg-card px-1.5 py-0.5 rounded border border-gold-border font-mono">↓</span>
            </div>
            <span>to navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <span>to select</span>
            <span className="bg-card px-2 py-0.5 rounded border border-gold-border font-mono">Enter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
